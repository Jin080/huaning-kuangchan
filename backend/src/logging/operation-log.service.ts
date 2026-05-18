import { Inject, Injectable, Logger } from '@nestjs/common';
import { OperationLog, OperationLogAction, Prisma, User } from '@prisma/client';

import { createListResponse } from '../common/responses/response.helpers';
import { ListResponse } from '../common/responses/response.types';
import { PrismaService } from '../prisma/prisma.service';
import { AdminLogQueryDto } from './dto/admin-log-query.dto';
import { OperationLogResponse } from './operation-log.response';
import { OperationLogEntry } from './operation-log.types';

type OperationLogWithOperator = OperationLog & {
  operator: Pick<User, 'id' | 'username'> | null;
};

type PrismaServiceLike = {
  operationLog: {
    create(args: Prisma.OperationLogCreateArgs): Promise<OperationLogWithOperator>;
    findMany(args: Prisma.OperationLogFindManyArgs): Promise<OperationLogWithOperator[]>;
    count(args: Prisma.OperationLogCountArgs): Promise<number>;
  };
};

const ACTION_ALIASES: Record<string, OperationLogAction> = {
  创建: OperationLogAction.CREATE,
  创建拍品草稿: OperationLogAction.CREATE,
  更新: OperationLogAction.UPDATE,
  编辑拍品: OperationLogAction.UPDATE,
  重新提交企业认证: OperationLogAction.UPDATE,
  提交审核: OperationLogAction.SUBMIT_REVIEW,
  提交拍品发布复核: OperationLogAction.SUBMIT_REVIEW,
  提交企业认证: OperationLogAction.SUBMIT_REVIEW,
  提交意向金凭证: OperationLogAction.SUBMIT_REVIEW,
  审核通过: OperationLogAction.APPROVE,
  拍品发布复核通过: OperationLogAction.APPROVE,
  企业认证审核通过: OperationLogAction.APPROVE,
  意向金审核通过: OperationLogAction.APPROVE,
  审核驳回: OperationLogAction.REJECT,
  拍品发布复核驳回: OperationLogAction.REJECT,
  企业认证审核驳回: OperationLogAction.REJECT,
  意向金审核驳回: OperationLogAction.REJECT,
  关闭: OperationLogAction.CLOSE,
  '关闭/取消拍品': OperationLogAction.CLOSE,
  竞拍截止确认成交: OperationLogAction.CLOSE,
  出价: OperationLogAction.BID,
  提交报价: OperationLogAction.BID,
  发布: OperationLogAction.PUBLISH,
  发布成交公示: OperationLogAction.PUBLISH,
  标记已签约: OperationLogAction.MARK_SIGNED,
  标记合同已签约: OperationLogAction.MARK_SIGNED,
  标记已完成: OperationLogAction.MARK_COMPLETED,
  标记合同已完成: OperationLogAction.MARK_COMPLETED,
  标记违约: OperationLogAction.MARK_DEFAULTED,
  标记合同违约: OperationLogAction.MARK_DEFAULTED,
  标记退款审核中: OperationLogAction.MARK_REFUND_REVIEWING,
  标记已退款: OperationLogAction.MARK_REFUNDED,
  拉黑: OperationLogAction.BLACKLIST,
  拉黑企业: OperationLogAction.BLACKLIST,
  解除拉黑: OperationLogAction.RELEASE_BLACKLIST,
  解除企业黑名单: OperationLogAction.RELEASE_BLACKLIST,
  登录: OperationLogAction.LOGIN,
  退出: OperationLogAction.LOGOUT,
};

@Injectable()
export class OperationLogService {
  private readonly logger = new Logger(OperationLogService.name);

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaServiceLike,
  ) {}

  async record(
    entry: Omit<OperationLogEntry, 'createdAt'>,
  ): Promise<OperationLogResponse> {
    const target = parseTarget(entry.target);
    const created = await this.prisma.operationLog.create({
      data: {
        operatorId: toOperatorId(entry.actorId),
        action: normalizeAction(entry.action),
        targetType: target.targetType,
        targetId: target.targetId,
        summary: entry.action,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
      },
      include: { operator: true },
    });

    this.logger.log(
      JSON.stringify({
        actorId: entry.actorId,
        action: entry.action,
        target: entry.target,
        createdAt: created.createdAt.toISOString(),
      }),
    );

    return this.toResponse(created);
  }

  async list(
    query: AdminLogQueryDto,
  ): Promise<ListResponse<OperationLogResponse>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const [items, total] = await Promise.all([
      this.prisma.operationLog.findMany({
        include: { operator: true },
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.operationLog.count({}),
    ]);

    return createListResponse(
      items.map((item) => this.toResponse(item)),
      total,
      page,
      pageSize,
    );
  }

  private toResponse(log: OperationLogWithOperator): OperationLogResponse {
    return {
      id: log.id,
      operatorId: log.operatorId,
      operatorUsername: log.operator?.username ?? null,
      action: log.action,
      targetType: log.targetType,
      targetId: log.targetId,
      summary: log.summary,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
    };
  }
}

function toOperatorId(actorId: string | undefined): string | undefined {
  if (!actorId) {
    return undefined;
  }

  return isUuid(actorId) ? actorId : undefined;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function normalizeAction(action: string): OperationLogAction {
  if (isOperationLogAction(action)) {
    return action;
  }

  return ACTION_ALIASES[action] ?? OperationLogAction.UPDATE;
}

function isOperationLogAction(action: string): action is OperationLogAction {
  return Object.values(OperationLogAction).includes(action as OperationLogAction);
}

function parseTarget(target: string | undefined): {
  targetType: string;
  targetId: string | null;
} {
  if (!target) {
    return {
      targetType: 'unknown',
      targetId: null,
    };
  }

  const separatorIndex = target.indexOf(':');

  if (separatorIndex === -1) {
    return {
      targetType: target,
      targetId: null,
    };
  }

  return {
    targetType: target.slice(0, separatorIndex),
    targetId: target.slice(separatorIndex + 1) || null,
  };
}
