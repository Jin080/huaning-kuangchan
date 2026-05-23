import { HttpStatus, Injectable } from '@nestjs/common';
import {
  AttachmentCategory,
  DepositVoucher,
  DepositVoucherStatus,
  EnterpriseCertificationStatus,
  Lot,
  LotStatus,
  Prisma,
} from '@prisma/client';

import { AppError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { OperationLogService } from '../../logging/operation-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DepositVoucherResponse } from './deposit-voucher.types';
import { DepositVoucherDto } from './dto/deposit-voucher.dto';

type DepositVoucherWithNames = DepositVoucher & {
  enterprise?: { name: string } | null;
  lot?: { title: string } | null;
  attachment?: { id: string; fileName: string; fileUrl: string } | null;
};

const STATUS_LABELS: Record<DepositVoucherStatus, string> = {
  [DepositVoucherStatus.NOT_SUBMITTED]: '未提交',
  [DepositVoucherStatus.PENDING]: '待审核',
  [DepositVoucherStatus.APPROVED]: '审核通过',
  [DepositVoucherStatus.REJECTED]: '审核驳回',
};

@Injectable()
export class DepositsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operationLog?: OperationLogService,
  ) {}

  async submitVoucher(
    userId: string,
    lotId: string,
    dto: DepositVoucherDto,
  ): Promise<DepositVoucherResponse> {
    const enterprise = await this.getApprovedEnterpriseByUserId(userId);
    const lot = await this.prisma.lot.findUnique({ where: { id: lotId } });

    if (!lot) {
      throw new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        '拍品不存在',
        HttpStatus.NOT_FOUND,
      );
    }

    this.ensureLotAcceptsDeposit(lot);

    const attachment = await this.prisma.attachment.create({
      data: {
        category: AttachmentCategory.DEPOSIT_VOUCHER,
        fileName: dto.voucherFileName,
        fileUrl: dto.voucherFileUrl,
        isSensitive: true,
        lotId,
        enterpriseId: enterprise.id,
        uploadedById: userId,
      },
    });

    const paidAmount = dto.paidAmount
      ? new Prisma.Decimal(dto.paidAmount)
      : undefined;
    const voucher = await this.prisma.depositVoucher.upsert({
      where: {
        lotId_enterpriseId: {
          lotId,
          enterpriseId: enterprise.id,
        },
      },
      create: {
        lotId,
        enterpriseId: enterprise.id,
        attachmentId: attachment.id,
        requiredAmount: lot.depositAmount,
        paidAmount,
        status: DepositVoucherStatus.PENDING,
        rejectReason: null,
      },
      update: {
        attachmentId: attachment.id,
        requiredAmount: lot.depositAmount,
        paidAmount,
        status: DepositVoucherStatus.PENDING,
        submittedAt: new Date(),
        reviewedAt: null,
        reviewerId: null,
        rejectReason: null,
      },
    });

    await this.record(userId, '提交意向金凭证', voucher.id);

    return this.toResponse(voucher);
  }

  async listForReview(): Promise<DepositVoucherResponse[]> {
    const vouchers = await this.prisma.depositVoucher.findMany({
      include: {
        attachment: { select: { id: true, fileName: true, fileUrl: true } },
        enterprise: { select: { name: true } },
        lot: { select: { title: true } },
      },
      orderBy: [{ submittedAt: 'desc' }, { updatedAt: 'desc' }],
    });

    return vouchers.map((voucher) => this.toResponse(voucher));
  }

  async approveVoucher(
    voucherId: string,
    reviewerId: string,
  ): Promise<DepositVoucherResponse> {
    await this.ensureVoucherExists(voucherId);

    const voucher = await this.prisma.depositVoucher.update({
      where: { id: voucherId },
      data: {
        status: DepositVoucherStatus.APPROVED,
        reviewedAt: new Date(),
        reviewerId,
        rejectReason: null,
      },
    });

    await this.record(reviewerId, '意向金审核通过', voucher.id);

    return this.toResponse(voucher);
  }

  async rejectVoucher(
    voucherId: string,
    reviewerId: string,
    rejectReason: string,
  ): Promise<DepositVoucherResponse> {
    await this.ensureVoucherExists(voucherId);

    const voucher = await this.prisma.depositVoucher.update({
      where: { id: voucherId },
      data: {
        status: DepositVoucherStatus.REJECTED,
        reviewedAt: new Date(),
        reviewerId,
        rejectReason,
      },
    });

    await this.record(reviewerId, '意向金审核驳回', voucher.id);

    return this.toResponse(voucher);
  }

  async hasBiddingQualification(
    enterpriseId: string,
    lotId: string,
  ): Promise<boolean> {
    const enterprise = await this.prisma.enterprise.findFirst({
      where: {
        id: enterpriseId,
        certificationStatus: EnterpriseCertificationStatus.APPROVED,
        isBlacklisted: false,
      },
    });

    if (!enterprise) {
      return false;
    }

    const voucher = await this.prisma.depositVoucher.findFirst({
      where: {
        lotId,
        enterpriseId,
        status: DepositVoucherStatus.APPROVED,
      },
    });

    return Boolean(voucher);
  }

  private async getApprovedEnterpriseByUserId(userId: string) {
    const enterprise = await this.prisma.enterprise.findFirst({
      where: {
        users: {
          some: {
            id: userId,
          },
        },
      },
    });

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

  private ensureLotAcceptsDeposit(lot: Lot): void {
    const now = new Date();
    const acceptsDeposit =
      (lot.status === LotStatus.ANNOUNCING || lot.status === LotStatus.BIDDING) &&
      lot.biddingEndAt > now;

    if (!acceptsDeposit) {
      throw new AppError(
        ERROR_CODES.AUCTION_ENDED,
        '拍品已结束，不能提交意向金凭证',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async ensureVoucherExists(voucherId: string): Promise<void> {
    const voucher = await this.prisma.depositVoucher.findUnique({
      where: { id: voucherId },
    });

    if (!voucher) {
      throw new AppError(
        ERROR_CODES.DEPOSIT_NOT_APPROVED,
        '意向金凭证不存在',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private toResponse(voucher: DepositVoucherWithNames): DepositVoucherResponse {
    return {
      id: voucher.id,
      lotId: voucher.lotId,
      lotTitle: voucher.lot?.title ?? null,
      enterpriseId: voucher.enterpriseId,
      enterpriseName: voucher.enterprise?.name ?? null,
      attachmentId: voucher.attachment?.id ?? voucher.attachmentId,
      voucherFileName: voucher.attachment?.fileName ?? null,
      voucherFileUrl: voucher.attachment?.fileUrl ?? null,
      requiredAmount: voucher.requiredAmount.toString(),
      paidAmount: voucher.paidAmount?.toString() ?? null,
      status: STATUS_LABELS[voucher.status],
      statusCode: voucher.status,
      submittedAt: voucher.submittedAt,
      reviewedAt: voucher.reviewedAt,
      reviewerId: voucher.reviewerId,
      rejectReason: voucher.rejectReason,
    };
  }

  private async record(
    actorId: string | undefined,
    action: string,
    targetId: string,
  ): Promise<void> {
    await this.operationLog?.record({
      actorId,
      action,
      target: `depositVoucher:${targetId}`,
    });
  }
}
