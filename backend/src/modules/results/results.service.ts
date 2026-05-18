import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  AuctionResult,
  AuctionResultStatus,
  ContractStatus,
  DepositVoucher,
  DepositVoucherStatus,
  Enterprise,
  Lot,
  LotStatus,
  Prisma,
  RefundStatus,
} from '@prisma/client';

import { AppError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { createListResponse } from '../../common/responses/response.helpers';
import { ListResponse } from '../../common/responses/response.types';
import { OperationLogService } from '../../logging/operation-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ResultQueryDto } from './dto/result-query.dto';
import { ResultResponse } from './result.types';

const RESULT_STATUS_LABELS: Record<AuctionResultStatus, string> = {
  [AuctionResultStatus.GENERATED]: '已生成',
  [AuctionResultStatus.PUBLISHED]: '已公示',
};

type ResultWithRelations = AuctionResult & {
  lot: Pick<Lot, 'id' | 'title' | 'status'>;
  winningEnterprise: Pick<Enterprise, 'id' | 'name'>;
};

type PrismaServiceLike = {
  auctionResult: {
    findMany(args: Prisma.AuctionResultFindManyArgs): Promise<ResultWithRelations[]>;
    count(args: Prisma.AuctionResultCountArgs): Promise<number>;
    findUnique(
      args: Prisma.AuctionResultFindUniqueArgs,
    ): Promise<ResultWithRelations | null>;
    update(args: Prisma.AuctionResultUpdateArgs): Promise<ResultWithRelations>;
  };
  lot: {
    update(args: Prisma.LotUpdateArgs): Promise<Lot | null>;
  };
  contract: {
    upsert(args: Prisma.ContractUpsertArgs): Promise<unknown>;
  };
  depositVoucher: {
    findMany(
      args: Prisma.DepositVoucherFindManyArgs,
    ): Promise<Pick<DepositVoucher, 'id' | 'enterpriseId' | 'requiredAmount'>[]>;
  };
  refund: {
    createMany(args: Prisma.RefundCreateManyArgs): Promise<Prisma.BatchPayload>;
  };
  $transaction<T>(fn: (tx: PrismaServiceLike) => Promise<T>): Promise<T>;
};

@Injectable()
export class ResultsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaServiceLike,
    private readonly operationLog?: OperationLogService,
  ) {}

  async listPublic(
    query: ResultQueryDto,
  ): Promise<ListResponse<ResultResponse>> {
    return this.list({
      ...query,
      status: AuctionResultStatus.PUBLISHED,
    });
  }

  async getPublicDetail(id: string): Promise<ResultResponse> {
    const result = await this.prisma.auctionResult.findUnique({
      where: { id },
      include: { lot: true, winningEnterprise: true },
    });

    if (!result || result.status !== AuctionResultStatus.PUBLISHED) {
      throw new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        '成交结果不存在或未公示',
        HttpStatus.NOT_FOUND,
      );
    }

    return this.toResponse(result);
  }

  async listAdmin(
    query: ResultQueryDto,
  ): Promise<ListResponse<ResultResponse>> {
    return this.list(query);
  }

  async publish(id: string, actorId?: string): Promise<ResultResponse> {
    const result = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.auctionResult.findUnique({
        where: { id },
        include: { lot: true, winningEnterprise: true },
      });

      if (!existing) {
        throw new AppError(
          ERROR_CODES.INTERNAL_ERROR,
          '成交结果不存在',
          HttpStatus.NOT_FOUND,
        );
      }

      const published = await tx.auctionResult.update({
        where: { id },
        data: {
          status: AuctionResultStatus.PUBLISHED,
          publishedAt: new Date(),
        },
        include: { lot: true, winningEnterprise: true },
      });

      await tx.lot.update({
        where: { id: existing.lotId },
        data: { status: LotStatus.PENDING_CONTRACT },
      });

      await tx.contract.upsert({
        where: { auctionResultId: existing.id },
        create: {
          auctionResultId: existing.id,
          lotId: existing.lotId,
          enterpriseId: existing.winningEnterpriseId,
          status: ContractStatus.PENDING_SIGN,
        },
        update: {},
      });

      const refundableVouchers = await tx.depositVoucher.findMany({
        where: {
          lotId: existing.lotId,
          status: DepositVoucherStatus.APPROVED,
          enterpriseId: { not: existing.winningEnterpriseId },
        },
        select: {
          id: true,
          enterpriseId: true,
          requiredAmount: true,
        },
      });

      if (refundableVouchers.length > 0) {
        await tx.refund.createMany({
          data: refundableVouchers.map((voucher) => ({
            lotId: existing.lotId,
            enterpriseId: voucher.enterpriseId,
            depositVoucherId: voucher.id,
            amount: voucher.requiredAmount,
            status: RefundStatus.NOT_REFUNDED,
          })),
          skipDuplicates: true,
        });
      }

      return published;
    });

    await this.operationLog?.record({
      actorId,
      action: '发布成交公示',
      target: `auctionResult:${id}`,
    });

    return this.toResponse(result);
  }

  private async list(
    query: ResultQueryDto,
  ): Promise<ListResponse<ResultResponse>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where = {
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.auctionResult.findMany({
        where,
        include: { lot: true, winningEnterprise: true },
        orderBy: [{ generatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.auctionResult.count({ where }),
    ]);

    return createListResponse(
      items.map((item) => this.toResponse(item)),
      total,
      page,
      pageSize,
    );
  }

  private toResponse(result: ResultWithRelations): ResultResponse {
    return {
      id: result.id,
      lotId: result.lotId,
      lotTitle: result.lot.title,
      lotStatusCode: result.lot.status,
      winningEnterpriseId: result.winningEnterpriseId,
      winningEnterpriseName: result.winningEnterprise.name,
      finalPrice: result.finalPrice.toString(),
      status: RESULT_STATUS_LABELS[result.status],
      statusCode: result.status,
      generatedAt: result.generatedAt,
      publishedAt: result.publishedAt,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }
}
