import { HttpStatus, Injectable } from '@nestjs/common';
import { Lot, LotStatus } from '@prisma/client';

import { AppError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { OperationLogService } from '../../logging/operation-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LotResponse } from '../lots/lot.types';

const STATUS_LABELS: Record<LotStatus, string> = {
  [LotStatus.DRAFT]: '草稿',
  [LotStatus.PENDING_RELEASE_REVIEW]: '待发布复核',
  [LotStatus.RELEASE_REJECTED]: '发布驳回',
  [LotStatus.ANNOUNCING]: '公示中',
  [LotStatus.BIDDING]: '竞拍中',
  [LotStatus.ENDED]: '已结束',
  [LotStatus.RESULT_ANNOUNCING]: '成交公示中',
  [LotStatus.PENDING_CONTRACT]: '待签约',
  [LotStatus.SIGNED]: '已签约',
  [LotStatus.COMPLETED]: '已完成',
  [LotStatus.DEFAULTED]: '违约',
  [LotStatus.CANCELED]: '已取消',
};

@Injectable()
export class LotReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operationLog?: OperationLogService,
  ) {}

  async listPending(): Promise<LotResponse[]> {
    const lots = await this.prisma.lot.findMany({
      where: {
        status: LotStatus.PENDING_RELEASE_REVIEW,
      },
      orderBy: [{ releaseSubmittedAt: 'desc' }, { updatedAt: 'desc' }],
    });

    return lots.map((lot) => this.toResponse(lot));
  }

  async approve(id: string, actorId?: string): Promise<LotResponse> {
    await this.ensurePending(id);

    const lot = await this.prisma.lot.update({
      where: { id },
      data: {
        status: LotStatus.ANNOUNCING,
        releaseReviewedAt: new Date(),
        releaseRejectReason: null,
      },
    });

    await this.record(actorId, '拍品发布复核通过', lot.id);

    return this.toResponse(lot);
  }

  async reject(
    id: string,
    actorId: string | undefined,
    rejectReason: string,
  ): Promise<LotResponse> {
    await this.ensurePending(id);

    const lot = await this.prisma.lot.update({
      where: { id },
      data: {
        status: LotStatus.RELEASE_REJECTED,
        releaseReviewedAt: new Date(),
        releaseRejectReason: rejectReason,
      },
    });

    await this.record(actorId, '拍品发布复核驳回', lot.id);

    return this.toResponse(lot);
  }

  private async ensurePending(id: string): Promise<void> {
    const lot = await this.prisma.lot.findUnique({ where: { id } });

    if (!lot) {
      throw new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        '拍品不存在',
        HttpStatus.NOT_FOUND,
      );
    }

    if (lot.status !== LotStatus.PENDING_RELEASE_REVIEW) {
      throw new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        '拍品不在待发布复核状态',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private toResponse(lot: Lot): LotResponse {
    return {
      id: lot.id,
      title: lot.title,
      imageOneUrl: lot.imageOneUrl,
      imageTwoUrl: lot.imageTwoUrl,
      startPrice: lot.startPrice.toString(),
      quantity: lot.quantity.toString(),
      quantityUnit: lot.quantityUnit,
      supplier: lot.supplier,
      origin: lot.origin,
      deadlineAt: lot.deadlineAt,
      deliveryMethod: lot.deliveryMethod,
      productInfo: lot.productInfo,
      productDetail: lot.productDetail,
      inspectionReportUrl: lot.inspectionReportUrl,
      email: lot.email,
      phone: lot.phone,
      mineralCategory: lot.mineralCategory,
      grade: lot.grade,
      assessedPrice: lot.assessedPrice?.toString() ?? null,
      depositRatio: lot.depositRatio?.toString() ?? null,
      depositAmount: lot.depositAmount.toString(),
      bidIncrement: lot.bidIncrement.toString(),
      announcementStartAt: lot.announcementStartAt,
      announcementEndAt: lot.announcementEndAt,
      biddingStartAt: lot.biddingStartAt,
      biddingEndAt: lot.biddingEndAt,
      customerNotice: lot.customerNotice,
      extensionEnabled: lot.extensionEnabled,
      extensionRule: lot.extensionRule,
      currentHighestPrice: lot.currentHighestPrice?.toString() ?? null,
      status: STATUS_LABELS[lot.status],
      statusCode: lot.status,
      releaseRejectReason: lot.releaseRejectReason,
      releaseSubmittedAt: lot.releaseSubmittedAt,
      releaseReviewedAt: lot.releaseReviewedAt,
      createdById: lot.createdById,
      createdAt: lot.createdAt,
      updatedAt: lot.updatedAt,
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
      target: `lot:${targetId}`,
    });
  }
}
