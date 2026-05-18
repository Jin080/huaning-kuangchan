import { OperationLogAction } from '@prisma/client';
import { ValidationPipe } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';

import { ROLES_KEY } from '../../src/auth/roles.decorator';
import { AppExceptionFilter } from '../../src/common/errors/app-exception.filter';
import { AdminLogsController } from '../../src/logging/admin-logs.controller';
import { LoggingModule } from '../../src/logging/logging.module';
import { OperationLogService } from '../../src/logging/operation-log.service';
import { BlacklistService } from '../../src/modules/blacklist/blacklist.service';
import { PrismaService } from '../../src/prisma/prisma.service';

type OperationLogRecord = {
  id: string;
  operatorId: string | null;
  action: OperationLogAction;
  targetType: string;
  targetId: string | null;
  summary: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  operator: {
    id: string;
    username: string;
  } | null;
};

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';

function createOperationLog(
  overrides: Partial<OperationLogRecord> = {},
): OperationLogRecord {
  return {
    id: 'log-1',
    operatorId: ADMIN_ID,
    action: OperationLogAction.APPROVE,
    targetType: 'lot',
    targetId: 'lot-1',
    summary: '审核通过拍品',
    ipAddress: '127.0.0.1',
    userAgent: 'jest',
    createdAt: new Date('2026-05-17T10:00:00.000Z'),
    operator: {
      id: ADMIN_ID,
      username: 'admin',
    },
    ...overrides,
  };
}

function createPrismaMock(records: OperationLogRecord[]) {
  const store = [...records];

  return {
    operationLog: {
      create: jest.fn(({ data }) => {
        const created = createOperationLog({
          id: `log-${store.length + 1}`,
          operatorId: data.operatorId ?? null,
          action: data.action,
          targetType: data.targetType,
          targetId: data.targetId ?? null,
          summary: data.summary,
          ipAddress: data.ipAddress ?? null,
          userAgent: data.userAgent ?? null,
          operator: null,
        });
        store.push(created);
        return Promise.resolve(created);
      }),
      findMany: jest.fn(({ skip = 0, take = store.length }) =>
        Promise.resolve(store.slice(skip, skip + take)),
      ),
      count: jest.fn(() => Promise.resolve(store.length)),
    },
  };
}

describe('Admin logs', () => {
  it('wires the admin logs controller in logging module', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [LoggingModule],
    })
      .overrideProvider(PrismaService)
      .useValue(createPrismaMock([]))
      .compile();

    expect(moduleRef.get(AdminLogsController)).toBeInstanceOf(
      AdminLogsController,
    );
  });

  it('lists persisted operation logs for admin read-only endpoint', async () => {
    const prisma = createPrismaMock([
      createOperationLog(),
      createOperationLog({
        id: 'log-2',
        action: OperationLogAction.REJECT,
        summary: '审核驳回拍品',
      }),
    ]);
    const service = new OperationLogService(prisma as never);

    const result = await service.list({ page: 1, pageSize: 1 });

    expect(result).toEqual({
      items: [
        {
          id: 'log-1',
          operatorId: ADMIN_ID,
          operatorUsername: 'admin',
          action: OperationLogAction.APPROVE,
          targetType: 'lot',
          targetId: 'lot-1',
          summary: '审核通过拍品',
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
          createdAt: new Date('2026-05-17T10:00:00.000Z'),
        },
      ],
      total: 2,
      page: 1,
      pageSize: 1,
    });
    expect(prisma.operationLog.findMany).toHaveBeenCalledWith({
      include: { operator: true },
      orderBy: [{ createdAt: 'desc' }],
      skip: 0,
      take: 1,
    });
  });

  it('records an operation log into the database and returns it from list', async () => {
    const prisma = createPrismaMock([]);
    const service = new OperationLogService(prisma as never);

    await service.record({
      actorId: ADMIN_ID,
      action: '审核通过',
      target: 'lot:lot-1',
    });
    const result = await service.list({ page: 1, pageSize: 10 });

    expect(prisma.operationLog.create).toHaveBeenCalledWith({
      data: {
        operatorId: ADMIN_ID,
        action: OperationLogAction.APPROVE,
        targetType: 'lot',
        targetId: 'lot-1',
        summary: '审核通过',
        ipAddress: undefined,
        userAgent: undefined,
      },
      include: { operator: true },
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        operatorId: ADMIN_ID,
        action: OperationLogAction.APPROVE,
        targetType: 'lot',
        targetId: 'lot-1',
        summary: '审核通过',
      }),
    );
  });

  it('persists logs without operator relation when actor id is not a uuid', async () => {
    const prisma = createPrismaMock([]);
    const service = new OperationLogService(prisma as never);

    await service.record({
      actorId: 'admin_demo',
      action: '发布成交公示',
      target: 'auctionResult:result-1',
    });

    expect(prisma.operationLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          operatorId: undefined,
          action: OperationLogAction.PUBLISH,
          targetType: 'auctionResult',
          targetId: 'result-1',
        }),
      }),
    );
  });

  it('persists logs from an existing blacklist business operation path', async () => {
    const prisma = createBusinessPrismaMock();
    const operationLogService = new OperationLogService(prisma as never);
    const blacklistService = new BlacklistService(
      prisma as never,
      operationLogService,
    );

    await blacklistService.blacklist(
      {
        enterpriseId: 'enterprise-1',
        lotId: 'lot-1',
        reason: '合同违约',
      },
      ADMIN_ID,
    );
    const result = await operationLogService.list({ page: 1, pageSize: 10 });

    expect(result.items).toEqual([
      expect.objectContaining({
        operatorId: ADMIN_ID,
        action: OperationLogAction.BLACKLIST,
        targetType: 'enterprise',
        targetId: 'enterprise-1',
        summary: '拉黑企业',
      }),
    ]);
  });

  it('restricts admin logs controller to ADMIN role', () => {
    const reflector = new Reflector();

    expect(reflector.get<string[]>(ROLES_KEY, AdminLogsController)).toEqual([
      'ADMIN',
    ]);
  });

  it('rejects non-admin requests over HTTP', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [LoggingModule],
    })
      .overrideProvider(PrismaService)
      .useValue(createPrismaMock([]))
      .compile();
    const app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new AppExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.listen(0);
    const address = app.getHttpServer().address() as { port: number };
    const response = await fetch(
      `http://127.0.0.1:${address.port}/api/admin/logs`,
      {
        headers: {
          'x-user-id': 'enterprise-1',
          'x-user-role': 'ENTERPRISE',
        },
      },
    );
    const body = (await response.json()) as { code: string };

    expect(response.status).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');

    await app.close();
  });
});

function createBusinessPrismaMock() {
  const operationLogs = createPrismaMock([]);
  const enterprise = {
    id: 'enterprise-1',
    name: '华宁铜业有限公司',
    isBlacklisted: false,
  };
  const lot = {
    id: 'lot-1',
    title: '铜精矿竞拍',
  };
  type BusinessPrismaMock = ReturnType<typeof createPrismaMock> & {
    blacklist: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    enterprise: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    user: {
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  const prisma = operationLogs as BusinessPrismaMock;

  Object.assign(prisma, {
    blacklist: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(({ data }) =>
        Promise.resolve({
          id: 'blacklist-1',
          enterpriseId: data.enterpriseId,
          lotId: data.lotId,
          reason: data.reason,
          operatorId: data.operatorId,
          blacklistedAt: new Date('2026-05-17T10:00:00.000Z'),
          releasedAt: null,
          releaseReason: null,
          releaseOperatorId: null,
          createdAt: new Date('2026-05-17T10:00:00.000Z'),
          updatedAt: new Date('2026-05-17T10:00:00.000Z'),
          enterprise: { ...enterprise, isBlacklisted: true },
          lot,
        }),
      ),
      update: jest.fn(),
    },
    enterprise: {
      findUnique: jest.fn(() => Promise.resolve(enterprise)),
      update: jest.fn(({ data }) => {
        Object.assign(enterprise, data);
        return Promise.resolve(enterprise);
      }),
    },
    user: {
      updateMany: jest.fn(() => Promise.resolve({ count: 1 })),
    },
    $transaction: jest.fn((callback) => callback(prisma)),
  });

  return prisma;
}
