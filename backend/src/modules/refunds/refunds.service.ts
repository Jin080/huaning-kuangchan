import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Enterprise, Lot, Prisma, Refund, RefundStatus } from '@prisma/client';

import { AppError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { createListResponse } from '../../common/responses/response.helpers';
import { ListResponse } from '../../common/responses/response.types';
import { OperationLogService } from '../../logging/operation-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RefundQueryDto } from './dto/refund-query.dto';
import { RefundResponse } from './refund.types';

const REFUND_STATUS_LABELS: Record<RefundStatus, string> = {
  [RefundStatus.NOT_REFUNDED]: '未退款',
  [RefundStatus.REVIEWING]: '审核中',
  [RefundStatus.REFUNDED]: '已退款',
};

type RefundWithRelations = Refund & {
  lot: Pick<Lot, 'id' | 'title'>;
  enterprise: Pick<Enterprise, 'id' | 'name'>;
};

type PrismaServiceLike = {
  refund: {
    findMany(args: Prisma.RefundFindManyArgs): Promise<RefundWithRelations[]>;
    count(args: Prisma.RefundCountArgs): Promise<number>;
    findUnique(args: Prisma.RefundFindUniqueArgs): Promise<RefundWithRelations | null>;
    update(args: Prisma.RefundUpdateArgs): Promise<RefundWithRelations>;
  };
};

@Injectable()
export class RefundsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaServiceLike,
    private readonly operationLog?: OperationLogService,
  ) {}

  async list(query: RefundQueryDto): Promise<ListResponse<RefundResponse>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where = {
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.refund.findMany({
        where,
        include: { lot: true, enterprise: true },
        orderBy: [{ updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.refund.count({ where }),
    ]);

    return createListResponse(
      items.map((item) => this.toResponse(item)),
      total,
      page,
      pageSize,
    );
  }

  markReviewing(id: string, actorId?: string): Promise<RefundResponse> {
    return this.transition(
      id,
      {
        status: RefundStatus.REVIEWING,
        reviewedAt: new Date(),
      },
      '标记退款审核中',
      actorId,
    );
  }

  markRefunded(id: string, actorId?: string): Promise<RefundResponse> {
    return this.transition(
      id,
      {
        status: RefundStatus.REFUNDED,
        refundedAt: new Date(),
      },
      '标记已退款',
      actorId,
    );
  }

  private async transition(
    id: string,
    data: Prisma.RefundUpdateInput,
    action: string,
    actorId?: string,
  ): Promise<RefundResponse> {
    await this.ensureExists(id);

    const refund = await this.prisma.refund.update({
      where: { id },
      data,
      include: { lot: true, enterprise: true },
    });

    await this.operationLog?.record({
      actorId,
      action,
      target: `refund:${id}`,
    });

    return this.toResponse(refund);
  }

  private async ensureExists(id: string): Promise<void> {
    const refund = await this.prisma.refund.findUnique({
      where: { id },
      include: { lot: true, enterprise: true },
    });

    if (!refund) {
      throw new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        '退款记录不存在',
        HttpStatus.NOT_FOUND,
      );
    }
  }

  private toResponse(refund: RefundWithRelations): RefundResponse {
    return {
      id: refund.id,
      lotId: refund.lotId,
      lotTitle: refund.lot.title,
      enterpriseId: refund.enterpriseId,
      enterpriseName: refund.enterprise.name,
      depositVoucherId: refund.depositVoucherId,
      amount: refund.amount.toString(),
      status: REFUND_STATUS_LABELS[refund.status],
      statusCode: refund.status,
      reviewedAt: refund.reviewedAt,
      refundedAt: refund.refundedAt,
      remark: refund.remark,
      createdAt: refund.createdAt,
      updatedAt: refund.updatedAt,
    };
  }
}
