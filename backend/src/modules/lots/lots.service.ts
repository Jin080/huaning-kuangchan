import { HttpStatus, Injectable } from '@nestjs/common';
import { AttachmentCategory, Lot, LotStatus, Prisma } from '@prisma/client';

import { AppError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { createListResponse } from '../../common/responses/response.helpers';
import { ListResponse } from '../../common/responses/response.types';
import { OperationLogService } from '../../logging/operation-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { LotMutationDto } from './dto/lot-mutation.dto';
import { LotQueryDto } from './dto/lot-query.dto';
import {
  LotAttachmentResponse,
  LotDetailResponse,
  LotResponse,
} from './lot.types';

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

const HIDDEN_PUBLIC_STATUSES: LotStatus[] = [
  LotStatus.DRAFT,
  LotStatus.PENDING_RELEASE_REVIEW,
  LotStatus.RELEASE_REJECTED,
  LotStatus.DEFAULTED,
  LotStatus.CANCELED,
];

type LotWithAttachments = Lot & {
  attachments?: Array<{
    id: string;
    category: AttachmentCategory;
    fileName: string;
    fileUrl: string;
    mimeType: string | null;
    fileSize: number | null;
    isSensitive: boolean;
  }>;
};

type LotAttachmentRecord = NonNullable<LotWithAttachments['attachments']>[number];

@Injectable()
export class LotsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly operationLog?: OperationLogService,
  ) {}

  async listAdmin(query: LotQueryDto): Promise<ListResponse<LotResponse>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where = this.buildWhere(query);
    const [items, total] = await Promise.all([
      this.prisma.lot.findMany({
        where,
        orderBy: [{ updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.lot.count({ where }),
    ]);

    return createListResponse(
      items.map((lot) => this.toResponse(lot)),
      total,
      page,
      pageSize,
    );
  }

  async listPublic(query: LotQueryDto): Promise<ListResponse<LotResponse>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where = {
      ...this.buildWhere(query),
      status: { notIn: HIDDEN_PUBLIC_STATUSES },
    };
    const [items, total] = await Promise.all([
      this.prisma.lot.findMany({
        where,
        orderBy: [{ announcementStartAt: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.lot.count({ where }),
    ]);

    return createListResponse(
      items.map((lot) => this.toResponse(lot)),
      total,
      page,
      pageSize,
    );
  }

  async getPublicDetail(id: string): Promise<LotDetailResponse> {
    const lot = await this.prisma.lot.findUnique({
      where: { id },
      include: { attachments: true },
    });

    if (!lot || HIDDEN_PUBLIC_STATUSES.includes(lot.status)) {
      throw new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        '拍品不存在或不可公开查看',
        HttpStatus.NOT_FOUND,
      );
    }

    return this.toDetailResponse(lot);
  }

  async createDraft(
    dto: LotMutationDto,
    actorId?: string,
  ): Promise<LotResponse> {
    const lot = await this.prisma.lot.create({
      data: {
        ...this.toMutationData(dto),
        status: LotStatus.DRAFT,
        createdById: actorId,
      },
    });

    await this.record(actorId, '创建拍品草稿', lot.id);

    return this.toResponse(lot);
  }

  async updateDraft(id: string, dto: LotMutationDto): Promise<LotResponse> {
    await this.ensureExists(id);

    const lot = await this.prisma.lot.update({
      where: { id },
      data: this.toMutationData(dto),
    });

    await this.record(undefined, '编辑拍品', lot.id);

    return this.toResponse(lot);
  }

  async submitReview(id: string, actorId?: string): Promise<LotResponse> {
    await this.ensureExists(id);

    const lot = await this.prisma.lot.update({
      where: { id },
      data: {
        status: LotStatus.PENDING_RELEASE_REVIEW,
        releaseSubmittedAt: new Date(),
        releaseReviewedAt: null,
        releaseRejectReason: null,
      },
    });

    await this.record(actorId, '提交拍品发布复核', lot.id);

    return this.toResponse(lot);
  }

  async close(id: string, actorId?: string): Promise<LotResponse> {
    await this.ensureExists(id);

    const lot = await this.prisma.lot.update({
      where: { id },
      data: {
        status: LotStatus.CANCELED,
      },
    });

    await this.record(actorId, '关闭/取消拍品', lot.id);

    return this.toResponse(lot);
  }

  async advanceToBidding(
    id: string,
    actorId?: string,
    now = new Date(),
  ): Promise<LotResponse> {
    const existing = await this.getExisting(id);

    if (
      existing.status !== LotStatus.ANNOUNCING ||
      existing.biddingStartAt > now ||
      existing.biddingEndAt <= now
    ) {
      throw new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        '拍品不满足进入竞拍条件',
        HttpStatus.BAD_REQUEST,
      );
    }

    const lot = await this.prisma.lot.update({
      where: { id },
      data: { status: LotStatus.BIDDING },
    });

    await this.record(actorId, '拍品进入竞拍中', lot.id);

    return this.toResponse(lot);
  }

  private async ensureExists(id: string): Promise<void> {
    await this.getExisting(id);
  }

  private async getExisting(id: string): Promise<Lot> {
    const lot = await this.prisma.lot.findUnique({ where: { id } });

    if (!lot) {
      throw new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        '拍品不存在',
        HttpStatus.NOT_FOUND,
      );
    }

    return lot;
  }

  private buildWhere(query: LotQueryDto): Prisma.LotWhereInput {
    return {
      ...(query.status ? { status: query.status } : {}),
      ...(query.keyword
        ? {
            OR: [
              { title: { contains: query.keyword, mode: 'insensitive' } },
              { supplier: { contains: query.keyword, mode: 'insensitive' } },
              { origin: { contains: query.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
  }

  private toMutationData(dto: LotMutationDto): Prisma.LotUncheckedCreateInput {
    return {
      title: dto.title,
      imageOneUrl: dto.imageOneUrl,
      imageTwoUrl: dto.imageTwoUrl,
      startPrice: new Prisma.Decimal(dto.startPrice),
      quantity: new Prisma.Decimal(dto.quantity),
      quantityUnit: dto.quantityUnit ?? '吨',
      supplier: dto.supplier,
      origin: dto.origin,
      deadlineAt: new Date(dto.deadlineAt),
      deliveryMethod: dto.deliveryMethod,
      productInfo: dto.productInfo,
      productDetail: dto.productDetail,
      inspectionReportUrl: dto.inspectionReportUrl,
      email: dto.email,
      phone: dto.phone,
      mineralCategory: dto.mineralCategory,
      grade: dto.grade,
      assessedPrice: dto.assessedPrice
        ? new Prisma.Decimal(dto.assessedPrice)
        : undefined,
      depositRatio: dto.depositRatio
        ? new Prisma.Decimal(dto.depositRatio)
        : undefined,
      depositAmount: new Prisma.Decimal(dto.depositAmount),
      bidIncrement: new Prisma.Decimal(dto.bidIncrement),
      announcementStartAt: new Date(dto.announcementStartAt),
      announcementEndAt: new Date(dto.announcementEndAt),
      biddingStartAt: new Date(dto.biddingStartAt),
      biddingEndAt: new Date(dto.biddingEndAt),
      customerNotice: dto.customerNotice,
      extensionEnabled: dto.extensionEnabled ?? false,
      extensionRule: dto.extensionRule,
    };
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

  private toDetailResponse(lot: LotWithAttachments): LotDetailResponse {
    const response = this.toResponse(lot);
    const attachments = (lot.attachments ?? []).map((item) =>
      this.toAttachmentResponse(item),
    );
    const reportAttachments = attachments.filter(
      (item) => item.category === AttachmentCategory.INSPECTION_REPORT,
    );

    return {
      ...response,
      auctionRule: {
        bidIncrement: response.bidIncrement,
        biddingStartAt: response.biddingStartAt,
        biddingEndAt: response.biddingEndAt,
        extensionEnabled: response.extensionEnabled,
        extensionRule: response.extensionRule,
      },
      depositInstruction: {
        depositRatio: response.depositRatio,
        depositAmount: response.depositAmount,
      },
      attachments,
      inspectionReports: [
        {
          id: `${lot.id}:inspectionReportUrl`,
          category: AttachmentCategory.INSPECTION_REPORT,
          fileName: '检测报告',
          fileUrl: lot.inspectionReportUrl,
          mimeType: null,
          fileSize: null,
          isSensitive: false,
        },
        ...reportAttachments,
      ],
    };
  }

  private toAttachmentResponse(
    attachment: LotAttachmentRecord,
  ): LotAttachmentResponse {
    return {
      id: attachment.id,
      category: attachment.category,
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
      isSensitive: attachment.isSensitive,
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
