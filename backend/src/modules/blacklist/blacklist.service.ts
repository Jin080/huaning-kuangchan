import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Blacklist, Enterprise, Lot, Prisma, UserStatus } from '@prisma/client';

import { AppError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { createListResponse } from '../../common/responses/response.helpers';
import { ListResponse } from '../../common/responses/response.types';
import { OperationLogService } from '../../logging/operation-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { BlacklistResponse } from './blacklist.types';
import {
  BlacklistQueryDto,
  CreateBlacklistDto,
  ReleaseBlacklistDto,
} from './dto/blacklist.dto';

type BlacklistWithRelations = Blacklist & {
  enterprise: Pick<Enterprise, 'id' | 'name' | 'isBlacklisted'>;
  lot: Pick<Lot, 'id' | 'title'> | null;
};

type PrismaServiceLike = {
  blacklist: {
    findMany(args: Prisma.BlacklistFindManyArgs): Promise<BlacklistWithRelations[]>;
    count(args: Prisma.BlacklistCountArgs): Promise<number>;
    findUnique(
      args: Prisma.BlacklistFindUniqueArgs,
    ): Promise<BlacklistWithRelations | null>;
    create(args: Prisma.BlacklistCreateArgs): Promise<BlacklistWithRelations>;
    update(args: Prisma.BlacklistUpdateArgs): Promise<BlacklistWithRelations>;
  };
  enterprise: {
    findUnique(args: Prisma.EnterpriseFindUniqueArgs): Promise<Enterprise | null>;
    update(args: Prisma.EnterpriseUpdateArgs): Promise<Enterprise | null>;
  };
  user: {
    updateMany(args: Prisma.UserUpdateManyArgs): Promise<Prisma.BatchPayload>;
  };
  $transaction<T>(fn: (tx: PrismaServiceLike) => Promise<T>): Promise<T>;
};

@Injectable()
export class BlacklistService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaServiceLike,
    private readonly operationLog?: OperationLogService,
  ) {}

  async list(
    query: BlacklistQueryDto,
  ): Promise<ListResponse<BlacklistResponse>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const [items, total] = await Promise.all([
      this.prisma.blacklist.findMany({
        include: { enterprise: true, lot: true },
        orderBy: [{ blacklistedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.blacklist.count({}),
    ]);

    return createListResponse(
      items.map((item) => this.toResponse(item)),
      total,
      page,
      pageSize,
    );
  }

  async blacklist(
    dto: CreateBlacklistDto,
    actorId?: string,
  ): Promise<BlacklistResponse> {
    const record = await this.prisma.$transaction(async (tx) => {
      const enterprise = await tx.enterprise.findUnique({
        where: { id: dto.enterpriseId },
      });

      if (!enterprise) {
        throw new AppError(
          ERROR_CODES.INTERNAL_ERROR,
          '企业不存在',
          HttpStatus.NOT_FOUND,
        );
      }

      const created = await tx.blacklist.create({
        data: {
          enterpriseId: dto.enterpriseId,
          lotId: dto.lotId,
          reason: dto.reason,
          operatorId: actorId,
        },
        include: { enterprise: true, lot: true },
      });

      await tx.enterprise.update({
        where: { id: dto.enterpriseId },
        data: { isBlacklisted: true },
      });

      await tx.user.updateMany({
        where: { enterpriseId: dto.enterpriseId },
        data: { status: UserStatus.BLOCKED },
      });

      created.enterprise.isBlacklisted = true;
      return created;
    });

    await this.operationLog?.record({
      actorId,
      action: '拉黑企业',
      target: `enterprise:${dto.enterpriseId}`,
    });

    return this.toResponse(record);
  }

  async release(
    id: string,
    dto: ReleaseBlacklistDto,
    actorId?: string,
  ): Promise<BlacklistResponse> {
    const record = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.blacklist.findUnique({
        where: { id },
        include: { enterprise: true, lot: true },
      });

      if (!existing) {
        throw new AppError(
          ERROR_CODES.INTERNAL_ERROR,
          '黑名单记录不存在',
          HttpStatus.NOT_FOUND,
        );
      }

      const updated = await tx.blacklist.update({
        where: { id },
        data: {
          releasedAt: new Date(),
          releaseReason: dto.releaseReason,
          releaseOperatorId: actorId,
        },
        include: { enterprise: true, lot: true },
      });

      await tx.enterprise.update({
        where: { id: existing.enterpriseId },
        data: { isBlacklisted: false },
      });

      await tx.user.updateMany({
        where: { enterpriseId: existing.enterpriseId },
        data: { status: UserStatus.ACTIVE },
      });

      updated.enterprise.isBlacklisted = false;
      return updated;
    });

    await this.operationLog?.record({
      actorId,
      action: '解除企业黑名单',
      target: `blacklist:${id}`,
    });

    return this.toResponse(record);
  }

  private toResponse(record: BlacklistWithRelations): BlacklistResponse {
    return {
      id: record.id,
      enterpriseId: record.enterpriseId,
      enterpriseName: record.enterprise.name,
      lotId: record.lotId,
      lotTitle: record.lot?.title ?? null,
      reason: record.reason,
      operatorId: record.operatorId,
      blacklistedAt: record.blacklistedAt,
      releasedAt: record.releasedAt,
      releaseReason: record.releaseReason,
      releaseOperatorId: record.releaseOperatorId,
      isActive: record.releasedAt === null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }
}
