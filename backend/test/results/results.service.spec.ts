import {
  AuctionResultStatus,
  ContractStatus,
  DepositVoucherStatus,
  LotStatus,
  Prisma,
  RefundStatus,
} from '@prisma/client';
import { Test } from '@nestjs/testing';

import { ResultsController } from '../../src/modules/results/results.controller';
import { ResultsModule } from '../../src/modules/results/results.module';
import { ResultsService } from '../../src/modules/results/results.service';
import { PrismaService } from '../../src/prisma/prisma.service';

type ResultRecord = {
  id: string;
  lotId: string;
  winningEnterpriseId: string;
  finalPrice: Prisma.Decimal;
  status: AuctionResultStatus;
  generatedAt: Date;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  lot: {
    id: string;
    title: string;
    status: LotStatus;
    quantity: Prisma.Decimal;
    quantityUnit: string;
    supplier: string;
    origin: string;
  };
  winningEnterprise: {
    id: string;
    name: string;
  };
};

type DepositVoucherRecord = {
  id: string;
  lotId: string;
  enterpriseId: string;
  requiredAmount: Prisma.Decimal;
  status: DepositVoucherStatus;
};

type RefundRecord = {
  id: string;
  lotId: string;
  enterpriseId: string;
  depositVoucherId: string | null;
  amount: Prisma.Decimal;
  status: RefundStatus;
};

function createResult(
  overrides: Partial<ResultRecord> = {},
): ResultRecord {
  const now = new Date('2026-05-17T10:00:00.000Z');

  return {
    id: 'result-1',
    lotId: 'lot-1',
    winningEnterpriseId: 'enterprise-1',
    finalPrice: new Prisma.Decimal('1500'),
    status: AuctionResultStatus.GENERATED,
    generatedAt: now,
    publishedAt: null,
    createdAt: now,
    updatedAt: now,
    lot: {
      id: 'lot-1',
      title: '铜精矿竞拍',
      status: LotStatus.RESULT_ANNOUNCING,
      quantity: new Prisma.Decimal('30.500'),
      quantityUnit: '吨',
      supplier: '华宁供应商',
      origin: '云南华宁',
    },
    winningEnterprise: {
      id: 'enterprise-1',
      name: '华宁铜业有限公司',
    },
    ...overrides,
  };
}

function createDepositVoucher(
  overrides: Partial<DepositVoucherRecord> = {},
): DepositVoucherRecord {
  return {
    id: 'voucher-1',
    lotId: 'lot-1',
    enterpriseId: 'enterprise-2',
    requiredAmount: new Prisma.Decimal('50000'),
    status: DepositVoucherStatus.APPROVED,
    ...overrides,
  };
}

type PrismaMock = {
  auctionResult: {
    findMany: jest.Mock;
    count: jest.Mock;
    findUnique: jest.Mock;
    update: jest.Mock;
  };
  lot: {
    update: jest.Mock;
  };
  contract: {
    upsert: jest.Mock;
  };
  depositVoucher: {
    findMany: jest.Mock;
  };
  refund: {
    createMany: jest.Mock;
  };
  $transaction: jest.Mock;
  __refunds: RefundRecord[];
};

function createPrismaMock(
  records: ResultRecord[],
  depositVouchers: DepositVoucherRecord[] = [],
  refunds: RefundRecord[] = [],
): PrismaMock {
  const store = [...records];
  const refundStore = [...refunds];
  const prisma = {} as PrismaMock;

  Object.assign(prisma, {
    auctionResult: {
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
        const result = store.find((item) => item.lotId === where.id);

        if (result) {
          Object.assign(result.lot, data);
        }

        return Promise.resolve(result?.lot ?? null);
      }),
    },
    contract: {
      upsert: jest.fn(({ create }) =>
        Promise.resolve({
          id: 'contract-1',
          status: ContractStatus.PENDING_SIGN,
          signedAt: null,
          completedAt: null,
          defaultedAt: null,
          remark: null,
          createdAt: new Date('2026-05-17T11:00:00.000Z'),
          updatedAt: new Date('2026-05-17T11:00:00.000Z'),
          ...create,
        }),
      ),
    },
    depositVoucher: {
      findMany: jest.fn(({ where }) =>
        Promise.resolve(
          depositVouchers.filter((item) => {
            if (where?.lotId && item.lotId !== where.lotId) {
              return false;
            }

            if (where?.status && item.status !== where.status) {
              return false;
            }

            if (
              where?.enterpriseId?.not &&
              item.enterpriseId === where.enterpriseId.not
            ) {
              return false;
            }

            return true;
          }),
        ),
      ),
    },
    refund: {
      createMany: jest.fn(({ data }) => {
        for (const item of data) {
          const exists = refundStore.some(
            (refund) =>
              refund.lotId === item.lotId &&
              refund.enterpriseId === item.enterpriseId,
          );

          if (!exists) {
            refundStore.push({
              id: `refund-${refundStore.length + 1}`,
              lotId: item.lotId,
              enterpriseId: item.enterpriseId,
              depositVoucherId: item.depositVoucherId,
              amount: item.amount,
              status: item.status,
            });
          }
        }

        return Promise.resolve({ count: refundStore.length });
      }),
    },
    $transaction: jest.fn((callback: (tx: PrismaMock) => Promise<unknown>) =>
      callback(prisma),
    ),
    __refunds: refundStore,
  });

  return prisma;
}

describe('ResultsService', () => {
  it('wires the results module controllers', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ResultsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(createPrismaMock([]))
      .compile();

    expect(moduleRef.get(ResultsController)).toBeInstanceOf(ResultsController);
  });

  it('lists only published results for public readers', async () => {
    const prisma = createPrismaMock([
      createResult({
        id: 'published',
        status: AuctionResultStatus.PUBLISHED,
        publishedAt: new Date('2026-05-17T11:00:00.000Z'),
      }),
      createResult({ id: 'generated', status: AuctionResultStatus.GENERATED }),
    ]);
    const service = new ResultsService(prisma as never);

    const result = await service.listPublic({ page: 1, pageSize: 10 });

    expect(result.items.map((item: { id: string }) => item.id)).toEqual([
      'published',
    ]);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        lotTitle: '铜精矿竞拍',
        winningEnterpriseName: '华宁铜业有限公司',
        finalPrice: '1500',
      }),
    );
  });

  it('publishes a generated result and ensures a pending contract exists', async () => {
    const prisma = createPrismaMock([createResult({ id: 'result-1' })]);
    const service = new ResultsService(prisma as never);

    const result = await service.publish('result-1', 'admin-1');

    expect(result.statusCode).toBe(AuctionResultStatus.PUBLISHED);
    expect(prisma.auctionResult.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'result-1' },
        data: expect.objectContaining({
          status: AuctionResultStatus.PUBLISHED,
          publishedAt: expect.any(Date),
        }),
      }),
    );
    expect(prisma.lot.update).toHaveBeenCalledWith({
      where: { id: 'lot-1' },
      data: { status: LotStatus.PENDING_CONTRACT },
    });
    expect(prisma.contract.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { auctionResultId: 'result-1' },
        create: expect.objectContaining({
          auctionResultId: 'result-1',
          lotId: 'lot-1',
          enterpriseId: 'enterprise-1',
          status: ContractStatus.PENDING_SIGN,
        }),
      }),
    );
  });

  it('creates initial refunds for approved losing deposit vouchers when publishing', async () => {
    const prisma = createPrismaMock(
      [createResult({ id: 'result-1' })],
      [
        createDepositVoucher({
          id: 'winner-voucher',
          enterpriseId: 'enterprise-1',
          requiredAmount: new Prisma.Decimal('50000'),
        }),
        createDepositVoucher({
          id: 'loser-approved-voucher',
          enterpriseId: 'enterprise-2',
          requiredAmount: new Prisma.Decimal('60000'),
        }),
        createDepositVoucher({
          id: 'loser-pending-voucher',
          enterpriseId: 'enterprise-3',
          status: DepositVoucherStatus.PENDING,
          requiredAmount: new Prisma.Decimal('70000'),
        }),
      ],
    );
    const service = new ResultsService(prisma as never);

    await service.publish('result-1', 'admin-1');

    expect(prisma.depositVoucher.findMany).toHaveBeenCalledWith({
      where: {
        lotId: 'lot-1',
        status: DepositVoucherStatus.APPROVED,
        enterpriseId: { not: 'enterprise-1' },
      },
      select: {
        id: true,
        enterpriseId: true,
        requiredAmount: true,
      },
    });
    expect(prisma.__refunds).toEqual([
      {
        id: 'refund-1',
        lotId: 'lot-1',
        enterpriseId: 'enterprise-2',
        depositVoucherId: 'loser-approved-voucher',
        amount: new Prisma.Decimal('60000'),
        status: RefundStatus.NOT_REFUNDED,
      },
    ]);
  });

  it('does not duplicate initial refunds when publishing repeatedly', async () => {
    const prisma = createPrismaMock(
      [createResult({ id: 'result-1' })],
      [
        createDepositVoucher({
          id: 'loser-approved-voucher',
          enterpriseId: 'enterprise-2',
        }),
      ],
    );
    const service = new ResultsService(prisma as never);

    await service.publish('result-1', 'admin-1');
    await service.publish('result-1', 'admin-1');

    expect(prisma.refund.createMany).toHaveBeenCalledTimes(2);
    expect(prisma.refund.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skipDuplicates: true,
      }),
    );
    expect(prisma.__refunds).toHaveLength(1);
  });
});
