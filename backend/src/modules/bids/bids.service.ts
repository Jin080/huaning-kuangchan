import { HttpStatus, Inject, Injectable, Optional } from '@nestjs/common';
import {
  BidRecord,
  Enterprise,
  EnterpriseCertificationStatus,
  Lot,
  LotStatus,
  Prisma,
} from '@prisma/client';

import { CurrentUser } from '../../auth/current-user.decorator';
import { AppError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { createListResponse } from '../../common/responses/response.helpers';
import { ListResponse } from '../../common/responses/response.types';
import { OperationLogService } from '../../logging/operation-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DepositsService } from '../deposits/deposits.service';
import { BidRecordQueryDto } from './dto/bid-record-query.dto';
import { PlaceBidDto } from './dto/place-bid.dto';
import {
  AdminBidRecordResponse,
  BidResponse,
  PublicBidRecordResponse,
} from './bid.types';

type UserWithEnterprise = CurrentUser & {
  enterprise: Pick<
    Enterprise,
    'id' | 'name' | 'certificationStatus' | 'isBlacklisted'
  > | null;
};

type BidRecordWithRelations = BidRecord & {
  enterprise?: Pick<Enterprise, 'id' | 'name'> | null;
  lot?: Pick<Lot, 'id' | 'title'> | null;
};

export const BIDS_NOW = 'BIDS_NOW';

@Injectable()
export class BidsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaServiceLike,
    private readonly depositsService: DepositsService,
    private readonly operationLog?: OperationLogService,
    @Optional()
    @Inject(BIDS_NOW)
    private readonly now: () => Date = () => new Date(),
  ) {}

  async placeBid(
    userId: string,
    lotId: string,
    dto: PlaceBidDto,
  ): Promise<BidResponse> {
    const user = await this.getUserWithEnterprise(userId);
    const enterprise = this.ensureEnterpriseCanBid(user);
    const bidAt = this.now();

    const qualified = await this.depositsService.hasBiddingQualification(
      enterprise.id,
      lotId,
    );

    if (!qualified) {
      throw new AppError(
        ERROR_CODES.DEPOSIT_NOT_APPROVED,
        '暂无竞价资格',
        HttpStatus.FORBIDDEN,
      );
    }

    const bid = await this.prisma.$transaction(async (tx) => {
      await this.activateDueBiddingLot(tx, lotId, bidAt);

      const lot = await tx.lot.findUnique({ where: { id: lotId } });

      this.ensureLotCanReceiveBid(lot, bidAt);

      const lastBid = await tx.bidRecord.findFirst({
        where: { lotId },
        orderBy: { sequenceNo: 'desc' },
      });
      const amount = new Prisma.Decimal(dto.amount);
      const basePrice = lot.currentHighestPrice ?? lot.startPrice;
      const incrementCount = this.validateBidAmount(
        amount,
        basePrice,
        lot.bidIncrement,
      );
      const sequenceNo = (lastBid?.sequenceNo ?? 0) + 1;

      await tx.bidRecord.updateMany({
        where: { lotId, isCurrentHighest: true },
        data: { isCurrentHighest: false },
      });

      const created = await tx.bidRecord.create({
        data: {
          sequenceNo,
          lotId,
          enterpriseId: enterprise.id,
          enterpriseName: enterprise.name,
          maskedEnterpriseName: maskEnterpriseName(enterprise.name),
          amount,
          incrementCount,
          bidAt,
          isCurrentHighest: true,
        },
      });

      await tx.lot.update({
        where: { id: lotId },
        data: { currentHighestPrice: amount },
      });

      return created;
    });

    await this.operationLog?.record({
      actorId: userId,
      action: '提交报价',
      target: `bid:${bid.id}`,
    });

    return this.toBidResponse(bid);
  }

  async listPublicRecords(
    lotId: string,
    query: BidRecordQueryDto,
  ): Promise<ListResponse<PublicBidRecordResponse>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where = { lotId };
    const [items, total] = await Promise.all([
      this.prisma.bidRecord.findMany({
        where,
        orderBy: [{ sequenceNo: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.bidRecord.count({ where }),
    ]);

    return createListResponse(
      items.map((item) => this.toPublicRecordResponse(item)),
      total,
      page,
      pageSize,
    );
  }

  async listAdminRecords(
    query: BidRecordQueryDto,
  ): Promise<ListResponse<AdminBidRecordResponse>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where = {
      ...(query.lotId ? { lotId: query.lotId } : {}),
      ...(query.enterpriseId ? { enterpriseId: query.enterpriseId } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.bidRecord.findMany({
        where,
        include: { enterprise: true, lot: true },
        orderBy: [{ bidAt: 'desc' }, { sequenceNo: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.bidRecord.count({ where }),
    ]);

    return createListResponse(
      items.map((item) => this.toAdminRecordResponse(item)),
      total,
      page,
      pageSize,
    );
  }

  private async getUserWithEnterprise(userId: string): Promise<UserWithEnterprise> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { enterprise: true },
    });

    if (!user) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        '未登录',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return user;
  }

  private ensureEnterpriseCanBid(user: UserWithEnterprise) {
    const enterprise = user.enterprise;

    if (!enterprise) {
      throw new AppError(
        ERROR_CODES.ENTERPRISE_NOT_CERTIFIED,
        '企业未认证',
        HttpStatus.FORBIDDEN,
      );
    }

    if (
      enterprise.certificationStatus === EnterpriseCertificationStatus.PENDING
    ) {
      throw new AppError(
        ERROR_CODES.ENTERPRISE_CERTIFICATION_PENDING,
        '企业认证审核中',
        HttpStatus.FORBIDDEN,
      );
    }

    if (
      enterprise.certificationStatus !== EnterpriseCertificationStatus.APPROVED
    ) {
      throw new AppError(
        ERROR_CODES.ENTERPRISE_NOT_CERTIFIED,
        '企业未认证',
        HttpStatus.FORBIDDEN,
      );
    }

    if (enterprise.isBlacklisted) {
      throw new AppError(
        ERROR_CODES.BLACKLISTED,
        '被拉黑，请联系平台客服',
        HttpStatus.FORBIDDEN,
      );
    }

    return enterprise;
  }

  private async activateDueBiddingLot(
    tx: PrismaServiceLike,
    lotId: string,
    bidAt: Date,
  ): Promise<void> {
    await tx.lot.updateMany({
      where: {
        id: lotId,
        status: LotStatus.ANNOUNCING,
        biddingStartAt: { lte: bidAt },
        biddingEndAt: { gt: bidAt },
      },
      data: { status: LotStatus.BIDDING },
    });
  }

  private ensureLotCanReceiveBid(
    lot: Lot | null,
    bidAt: Date,
  ): asserts lot is Lot {
    if (!lot) {
      throw new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        '拍品不存在',
        HttpStatus.NOT_FOUND,
      );
    }

    if (
      lot.status !== LotStatus.BIDDING ||
      bidAt < lot.biddingStartAt ||
      bidAt > lot.biddingEndAt
    ) {
      throw new AppError(
        ERROR_CODES.AUCTION_ENDED,
        '竞拍已结束',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private validateBidAmount(
    amount: Prisma.Decimal,
    basePrice: Prisma.Decimal,
    bidIncrement: Prisma.Decimal,
  ): number {
    const diff = amount.minus(basePrice);

    if (diff.lessThanOrEqualTo(0)) {
      throw new AppError(
        ERROR_CODES.INVALID_BID_INCREMENT,
        '报价不符合加价规则',
        HttpStatus.BAD_REQUEST,
      );
    }

    const incrementCount = diff.div(bidIncrement);

    if (!incrementCount.isInteger()) {
      throw new AppError(
        ERROR_CODES.INVALID_BID_INCREMENT,
        '报价不符合加价规则',
        HttpStatus.BAD_REQUEST,
      );
    }

    return incrementCount.toNumber();
  }

  private toBidResponse(bid: BidRecord): BidResponse {
    const amount = bid.amount.toString();

    return {
      id: bid.id,
      sequenceNo: bid.sequenceNo,
      lotId: bid.lotId,
      enterpriseId: bid.enterpriseId,
      enterpriseName: bid.enterpriseName,
      maskedEnterpriseName: bid.maskedEnterpriseName,
      amount,
      incrementCount: bid.incrementCount,
      bidAt: bid.bidAt,
      isCurrentHighest: bid.isCurrentHighest,
      currentHighestPrice: amount,
    };
  }

  private toPublicRecordResponse(
    bid: BidRecord,
  ): PublicBidRecordResponse {
    return {
      id: bid.id,
      sequenceNo: bid.sequenceNo,
      lotId: bid.lotId,
      enterpriseName: bid.maskedEnterpriseName,
      maskedEnterpriseName: bid.maskedEnterpriseName,
      amount: bid.amount.toString(),
      incrementCount: bid.incrementCount,
      bidAt: bid.bidAt,
      isCurrentHighest: bid.isCurrentHighest,
    };
  }

  private toAdminRecordResponse(
    bid: BidRecordWithRelations,
  ): AdminBidRecordResponse {
    return {
      id: bid.id,
      sequenceNo: bid.sequenceNo,
      lotId: bid.lotId,
      lotTitle: bid.lot?.title ?? null,
      enterpriseId: bid.enterpriseId,
      enterpriseName: bid.enterprise?.name ?? bid.enterpriseName,
      maskedEnterpriseName: bid.maskedEnterpriseName,
      amount: bid.amount.toString(),
      incrementCount: bid.incrementCount,
      bidAt: bid.bidAt,
      isCurrentHighest: bid.isCurrentHighest,
    };
  }
}

export function maskEnterpriseName(name: string): string {
  if (name.length <= 2) {
    return `${name[0] ?? ''}*`;
  }

  return `${name[0]}***${name[name.length - 1]}`;
}

type PrismaServiceLike = {
  user: {
    findUnique(args: Prisma.UserFindUniqueArgs): Promise<UserWithEnterprise | null>;
  };
  lot: {
    findUnique(args: Prisma.LotFindUniqueArgs): Promise<Lot | null>;
    update(args: Prisma.LotUpdateArgs): Promise<Lot>;
    updateMany(args: Prisma.LotUpdateManyArgs): Promise<Prisma.BatchPayload>;
  };
  bidRecord: {
    findFirst(args: Prisma.BidRecordFindFirstArgs): Promise<BidRecord | null>;
    updateMany(args: Prisma.BidRecordUpdateManyArgs): Promise<Prisma.BatchPayload>;
    create(args: Prisma.BidRecordCreateArgs): Promise<BidRecord>;
    findMany(
      args: Prisma.BidRecordFindManyArgs,
    ): Promise<BidRecordWithRelations[]>;
    count(args: Prisma.BidRecordCountArgs): Promise<number>;
  };
  $transaction<T>(fn: (tx: PrismaServiceLike) => Promise<T>): Promise<T>;
};
