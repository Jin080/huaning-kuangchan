import { ContractStatus, LotStatus, Prisma } from '@prisma/client';
import { Test } from '@nestjs/testing';

import { ContractsController } from '../../src/modules/contracts/contracts.controller';
import { ContractsModule } from '../../src/modules/contracts/contracts.module';
import { ContractsService } from '../../src/modules/contracts/contracts.service';
import { PrismaService } from '../../src/prisma/prisma.service';

type ContractRecord = {
  id: string;
  auctionResultId: string;
  lotId: string;
  enterpriseId: string;
  status: ContractStatus;
  signedAt: Date | null;
  completedAt: Date | null;
  defaultedAt: Date | null;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
  lot: {
    id: string;
    title: string;
    status: LotStatus;
  };
  enterprise: {
    id: string;
    name: string;
  };
  auctionResult: {
    id: string;
    finalPrice: Prisma.Decimal;
  };
};

function createContract(
  overrides: Partial<ContractRecord> = {},
): ContractRecord {
  const now = new Date('2026-05-17T10:00:00.000Z');

  return {
    id: 'contract-1',
    auctionResultId: 'result-1',
    lotId: 'lot-1',
    enterpriseId: 'enterprise-1',
    status: ContractStatus.PENDING_SIGN,
    signedAt: null,
    completedAt: null,
    defaultedAt: null,
    remark: null,
    createdAt: now,
    updatedAt: now,
    lot: {
      id: 'lot-1',
      title: '铜精矿竞拍',
      status: LotStatus.PENDING_CONTRACT,
    },
    enterprise: {
      id: 'enterprise-1',
      name: '华宁铜业有限公司',
    },
    auctionResult: {
      id: 'result-1',
      finalPrice: new Prisma.Decimal('1500'),
    },
    ...overrides,
  };
}

function createPrismaMock(records: ContractRecord[]) {
  const store = [...records];

  return {
    contract: {
      findMany: jest.fn(({ where, skip = 0, take = store.length }) => {
        const result = store.filter((item) => {
          if (where?.status && item.status !== where.status) {
            return false;
          }

          return true;
        });

        return Promise.resolve(result.slice(skip, skip + take));
      }),
      count: jest.fn(({ where }) =>
        Promise.resolve(
          store.filter((item) => {
            if (where?.status && item.status !== where.status) {
              return false;
            }

            return true;
          }).length,
        ),
      ),
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(store.find((item) => item.id === where.id) ?? null),
      ),
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
    lot: {
      update: jest.fn(({ where, data }) => {
        const contract = store.find((item) => item.lotId === where.id);

        if (contract) {
          Object.assign(contract.lot, data);
        }

        return Promise.resolve(contract?.lot ?? null);
      }),
    },
    $transaction: jest.fn((callback) =>
      callback({
        contract: {
          findUnique: jest.fn(({ where }) =>
            Promise.resolve(store.find((item) => item.id === where.id) ?? null),
          ),
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
        lot: {
          update: jest.fn(({ where, data }) => {
            const contract = store.find((item) => item.lotId === where.id);

            if (contract) {
              Object.assign(contract.lot, data);
            }

            return Promise.resolve(contract?.lot ?? null);
          }),
        },
      }),
    ),
  };
}

describe('ContractsService', () => {
  it('wires the contracts module controllers', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ContractsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(createPrismaMock([]))
      .compile();

    expect(moduleRef.get(ContractsController)).toBeInstanceOf(
      ContractsController,
    );
  });

  it('lists contracts with lot enterprise and final price', async () => {
    const service = new ContractsService(
      createPrismaMock([createContract()]) as never,
    );

    const result = await service.list({ page: 1, pageSize: 10 });

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        lotTitle: '铜精矿竞拍',
        enterpriseName: '华宁铜业有限公司',
        finalPrice: '1500',
        statusCode: ContractStatus.PENDING_SIGN,
      }),
    );
  });

  it('marks a contract completed and records completedAt for dashboard statistics', async () => {
    const prisma = createPrismaMock([
      createContract({ status: ContractStatus.SIGNED }),
    ]);
    const service = new ContractsService(prisma as never);

    const result = await service.markCompleted('contract-1', 'admin-1');

    expect(result.statusCode).toBe(ContractStatus.COMPLETED);
    expect(result.completedAt).toBeInstanceOf(Date);
    expect(result.lotStatusCode).toBe(LotStatus.COMPLETED);
  });

  it('marks a contract defaulted and moves the lot to hidden defaulted status', async () => {
    const prisma = createPrismaMock([createContract()]);
    const service = new ContractsService(prisma as never);

    const result = await service.markDefaulted('contract-1', 'admin-1');

    expect(result.statusCode).toBe(ContractStatus.DEFAULTED);
    expect(result.defaultedAt).toBeInstanceOf(Date);
    expect(result.lotStatusCode).toBe(LotStatus.DEFAULTED);
  });
});
