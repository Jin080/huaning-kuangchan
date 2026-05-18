import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  AuctionResult,
  Contract,
  ContractStatus,
  Enterprise,
  Lot,
  LotStatus,
  Prisma,
} from '@prisma/client';

import { AppError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { createListResponse } from '../../common/responses/response.helpers';
import { ListResponse } from '../../common/responses/response.types';
import { OperationLogService } from '../../logging/operation-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ContractResponse } from './contract.types';
import { ContractQueryDto } from './dto/contract-query.dto';

const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  [ContractStatus.PENDING_SIGN]: '待签约',
  [ContractStatus.SIGNED]: '已签约',
  [ContractStatus.COMPLETED]: '已完成',
  [ContractStatus.DEFAULTED]: '违约',
};

type ContractWithRelations = Contract & {
  lot: Pick<Lot, 'id' | 'title' | 'status'>;
  enterprise: Pick<Enterprise, 'id' | 'name'>;
  auctionResult: Pick<AuctionResult, 'id' | 'finalPrice'>;
};

type PrismaServiceLike = {
  contract: {
    findMany(args: Prisma.ContractFindManyArgs): Promise<ContractWithRelations[]>;
    count(args: Prisma.ContractCountArgs): Promise<number>;
    findUnique(
      args: Prisma.ContractFindUniqueArgs,
    ): Promise<ContractWithRelations | null>;
    update(args: Prisma.ContractUpdateArgs): Promise<ContractWithRelations>;
  };
  lot: {
    update(args: Prisma.LotUpdateArgs): Promise<Lot | null>;
  };
  $transaction<T>(fn: (tx: PrismaServiceLike) => Promise<T>): Promise<T>;
};

@Injectable()
export class ContractsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaServiceLike,
    private readonly operationLog?: OperationLogService,
  ) {}

  async list(
    query: ContractQueryDto,
  ): Promise<ListResponse<ContractResponse>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where = {
      ...(query.status ? { status: query.status } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        include: { lot: true, enterprise: true, auctionResult: true },
        orderBy: [{ updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.contract.count({ where }),
    ]);

    return createListResponse(
      items.map((item) => this.toResponse(item)),
      total,
      page,
      pageSize,
    );
  }

  markSigned(id: string, actorId?: string): Promise<ContractResponse> {
    return this.transition(
      id,
      {
        status: ContractStatus.SIGNED,
        signedAt: new Date(),
      },
      LotStatus.SIGNED,
      '标记合同已签约',
      actorId,
    );
  }

  markCompleted(id: string, actorId?: string): Promise<ContractResponse> {
    return this.transition(
      id,
      {
        status: ContractStatus.COMPLETED,
        completedAt: new Date(),
      },
      LotStatus.COMPLETED,
      '标记合同已完成',
      actorId,
    );
  }

  markDefaulted(id: string, actorId?: string): Promise<ContractResponse> {
    return this.transition(
      id,
      {
        status: ContractStatus.DEFAULTED,
        defaultedAt: new Date(),
      },
      LotStatus.DEFAULTED,
      '标记合同违约',
      actorId,
    );
  }

  private async transition(
    id: string,
    data: Prisma.ContractUpdateInput,
    lotStatus: LotStatus,
    action: string,
    actorId?: string,
  ): Promise<ContractResponse> {
    const contract = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.contract.findUnique({
        where: { id },
        include: { lot: true, enterprise: true, auctionResult: true },
      });

      if (!existing) {
        throw new AppError(
          ERROR_CODES.INTERNAL_ERROR,
          '合同不存在',
          HttpStatus.NOT_FOUND,
        );
      }

      const updated = await tx.contract.update({
        where: { id },
        data,
        include: { lot: true, enterprise: true, auctionResult: true },
      });

      await tx.lot.update({
        where: { id: existing.lotId },
        data: { status: lotStatus },
      });

      updated.lot.status = lotStatus;
      return updated;
    });

    await this.operationLog?.record({
      actorId,
      action,
      target: `contract:${id}`,
    });

    return this.toResponse(contract);
  }

  private toResponse(contract: ContractWithRelations): ContractResponse {
    return {
      id: contract.id,
      auctionResultId: contract.auctionResultId,
      lotId: contract.lotId,
      lotTitle: contract.lot.title,
      lotStatusCode: contract.lot.status,
      enterpriseId: contract.enterpriseId,
      enterpriseName: contract.enterprise.name,
      finalPrice: contract.auctionResult.finalPrice.toString(),
      status: CONTRACT_STATUS_LABELS[contract.status],
      statusCode: contract.status,
      signedAt: contract.signedAt,
      completedAt: contract.completedAt,
      defaultedAt: contract.defaultedAt,
      remark: contract.remark,
      createdAt: contract.createdAt,
      updatedAt: contract.updatedAt,
    };
  }
}
