import { UserStatus } from '@prisma/client';
import { Test } from '@nestjs/testing';

import { BlacklistController } from '../../src/modules/blacklist/blacklist.controller';
import { BlacklistModule } from '../../src/modules/blacklist/blacklist.module';
import { BlacklistService } from '../../src/modules/blacklist/blacklist.service';
import { PrismaService } from '../../src/prisma/prisma.service';

type BlacklistRecord = {
  id: string;
  enterpriseId: string;
  lotId: string | null;
  reason: string;
  operatorId: string | null;
  blacklistedAt: Date;
  releasedAt: Date | null;
  releaseReason: string | null;
  releaseOperatorId: string | null;
  createdAt: Date;
  updatedAt: Date;
  enterprise: {
    id: string;
    name: string;
    isBlacklisted: boolean;
  };
  lot: {
    id: string;
    title: string;
  } | null;
};

function createRecord(
  overrides: Partial<BlacklistRecord> = {},
): BlacklistRecord {
  const now = new Date('2026-05-17T10:00:00.000Z');

  return {
    id: 'blacklist-1',
    enterpriseId: 'enterprise-1',
    lotId: 'lot-1',
    reason: '合同违约',
    operatorId: 'admin-1',
    blacklistedAt: now,
    releasedAt: null,
    releaseReason: null,
    releaseOperatorId: null,
    createdAt: now,
    updatedAt: now,
    enterprise: {
      id: 'enterprise-1',
      name: '华宁铜业有限公司',
      isBlacklisted: true,
    },
    lot: {
      id: 'lot-1',
      title: '铜精矿竞拍',
    },
    ...overrides,
  };
}

function createPrismaMock(records: BlacklistRecord[] = []) {
  const store = [...records];
  const enterprises = new Map<string, { id: string; name: string; isBlacklisted: boolean }>();

  enterprises.set('enterprise-1', {
    id: 'enterprise-1',
    name: '华宁铜业有限公司',
    isBlacklisted: false,
  });

  type PrismaMock = {
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
  const prisma = {} as PrismaMock;

  Object.assign(prisma, {
    blacklist: {
      findMany: jest.fn(({ skip = 0, take = store.length }) =>
        Promise.resolve(store.slice(skip, skip + take)),
      ),
      count: jest.fn(() => Promise.resolve(store.length)),
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(store.find((item) => item.id === where.id) ?? null),
      ),
      create: jest.fn(({ data }) => {
        const enterprise = enterprises.get(data.enterpriseId);
        const created = createRecord({
          id: 'blacklist-created',
          enterpriseId: data.enterpriseId,
          lotId: data.lotId ?? null,
          reason: data.reason,
          operatorId: data.operatorId ?? null,
          enterprise: {
            id: data.enterpriseId,
            name: enterprise?.name ?? '企业',
            isBlacklisted: true,
          },
        });
        store.push(created);
        return Promise.resolve(created);
      }),
      update: jest.fn(({ where, data }) => {
        const index = store.findIndex((item) => item.id === where.id);
        const updated = {
          ...store[index],
          ...data,
          updatedAt: new Date('2026-05-17T11:00:00.000Z'),
        };
        store[index] = updated;
        return Promise.resolve(updated);
      }),
    },
    enterprise: {
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(enterprises.get(where.id) ?? null),
      ),
      update: jest.fn(({ where, data }) => {
        const enterprise = enterprises.get(where.id);

        if (enterprise) {
          Object.assign(enterprise, data);
        }

        return Promise.resolve(enterprise ?? null);
      }),
    },
    user: {
      updateMany: jest.fn(() => Promise.resolve({ count: 1 })),
    },
    $transaction: jest.fn((callback: (tx: PrismaMock) => Promise<unknown>) =>
      callback(prisma),
    ),
  });

  return prisma;
}

describe('BlacklistService', () => {
  it('wires the blacklist module controllers', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [BlacklistModule],
    })
      .overrideProvider(PrismaService)
      .useValue(createPrismaMock())
      .compile();

    expect(moduleRef.get(BlacklistController)).toBeInstanceOf(
      BlacklistController,
    );
  });

  it('blacklists an enterprise and blocks its users for reuse by auth and bidding', async () => {
    const prisma = createPrismaMock();
    const service = new BlacklistService(prisma as never);

    const result = await service.blacklist(
      {
        enterpriseId: 'enterprise-1',
        lotId: 'lot-1',
        reason: '合同违约',
      },
      'admin-1',
    );

    expect(result.enterpriseId).toBe('enterprise-1');
    expect(result.releasedAt).toBeNull();
    expect(prisma.enterprise.update).toHaveBeenCalledWith({
      where: { id: 'enterprise-1' },
      data: { isBlacklisted: true },
    });
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { enterpriseId: 'enterprise-1' },
      data: { status: UserStatus.BLOCKED },
    });
  });

  it('releases a blacklist record and clears enterprise blacklist status', async () => {
    const prisma = createPrismaMock([createRecord()]);
    const service = new BlacklistService(prisma as never);

    const result = await service.release(
      'blacklist-1',
      { releaseReason: '已解除限制' },
      'admin-1',
    );

    expect(result.releasedAt).toBeInstanceOf(Date);
    expect(result.releaseReason).toBe('已解除限制');
    expect(prisma.enterprise.update).toHaveBeenCalledWith({
      where: { id: 'enterprise-1' },
      data: { isBlacklisted: false },
    });
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { enterpriseId: 'enterprise-1' },
      data: { status: UserStatus.ACTIVE },
    });
  });
});
