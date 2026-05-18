import { RefundStatus, Prisma } from '@prisma/client';
import { Test } from '@nestjs/testing';

import { RefundsController } from '../../src/modules/refunds/refunds.controller';
import { RefundsModule } from '../../src/modules/refunds/refunds.module';
import { RefundsService } from '../../src/modules/refunds/refunds.service';
import { PrismaService } from '../../src/prisma/prisma.service';

type RefundRecord = {
  id: string;
  lotId: string;
  enterpriseId: string;
  depositVoucherId: string | null;
  amount: Prisma.Decimal;
  status: RefundStatus;
  reviewedAt: Date | null;
  refundedAt: Date | null;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
  lot: {
    id: string;
    title: string;
  };
  enterprise: {
    id: string;
    name: string;
  };
};

function createRefund(overrides: Partial<RefundRecord> = {}): RefundRecord {
  const now = new Date('2026-05-17T10:00:00.000Z');

  return {
    id: 'refund-1',
    lotId: 'lot-1',
    enterpriseId: 'enterprise-2',
    depositVoucherId: 'voucher-1',
    amount: new Prisma.Decimal('50000'),
    status: RefundStatus.NOT_REFUNDED,
    reviewedAt: null,
    refundedAt: null,
    remark: null,
    createdAt: now,
    updatedAt: now,
    lot: {
      id: 'lot-1',
      title: '铜精矿竞拍',
    },
    enterprise: {
      id: 'enterprise-2',
      name: '未中标企业有限公司',
    },
    ...overrides,
  };
}

function createPrismaMock(records: RefundRecord[]) {
  const store = [...records];

  return {
    refund: {
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
  };
}

describe('RefundsService', () => {
  it('wires the refunds module controllers', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [RefundsModule],
    })
      .overrideProvider(PrismaService)
      .useValue(createPrismaMock([]))
      .compile();

    expect(moduleRef.get(RefundsController)).toBeInstanceOf(RefundsController);
  });

  it('lists refunds without requiring voucher upload fields', async () => {
    const service = new RefundsService(
      createPrismaMock([createRefund()]) as never,
    );

    const result = await service.list({ page: 1, pageSize: 10 });

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        lotTitle: '铜精矿竞拍',
        enterpriseName: '未中标企业有限公司',
        amount: '50000',
        statusCode: RefundStatus.NOT_REFUNDED,
      }),
    );
    expect(result.items[0]).not.toHaveProperty('voucherFileUrl');
  });

  it('marks refund reviewing with reviewedAt', async () => {
    const service = new RefundsService(
      createPrismaMock([createRefund()]) as never,
    );

    const result = await service.markReviewing('refund-1', 'admin-1');

    expect(result.statusCode).toBe(RefundStatus.REVIEWING);
    expect(result.reviewedAt).toBeInstanceOf(Date);
    expect(result.refundedAt).toBeNull();
  });

  it('marks refund refunded with refundedAt', async () => {
    const service = new RefundsService(
      createPrismaMock([createRefund({ status: RefundStatus.REVIEWING })]) as never,
    );

    const result = await service.markRefunded('refund-1', 'admin-1');

    expect(result.statusCode).toBe(RefundStatus.REFUNDED);
    expect(result.refundedAt).toBeInstanceOf(Date);
  });
});
