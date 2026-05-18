import { ContractStatus, Prisma } from '@prisma/client';
import { Test } from '@nestjs/testing';

import { PortalController } from '../../src/modules/portal/portal.controller';
import { PortalModule } from '../../src/modules/portal/portal.module';
import { PortalService } from '../../src/modules/portal/portal.service';
import { PrismaService } from '../../src/prisma/prisma.service';

type ContractAggregateRecord = {
  id: string;
  status: ContractStatus;
  completedAt: Date | null;
  auctionResult: {
    finalPrice: Prisma.Decimal;
  };
};

function createContract(
  overrides: Partial<ContractAggregateRecord> = {},
): ContractAggregateRecord {
  return {
    id: 'contract-1',
    status: ContractStatus.COMPLETED,
    completedAt: new Date('2026-05-17T10:00:00.000Z'),
    auctionResult: {
      finalPrice: new Prisma.Decimal('1500.25'),
    },
    ...overrides,
  };
}

function createPrismaMock(records: ContractAggregateRecord[]) {
  return {
    contract: {
      findMany: jest.fn(({ where }) =>
        Promise.resolve(
          records.filter((item) => {
            if (where?.status && item.status !== where.status) {
              return false;
            }

            if (where?.completedAt?.gte && item.completedAt) {
              if (item.completedAt < where.completedAt.gte) {
                return false;
              }
            }

            if (where?.completedAt?.lt && item.completedAt) {
              if (item.completedAt >= where.completedAt.lt) {
                return false;
              }
            }

            return true;
          }),
        ),
      ),
    },
  };
}

describe('PortalService', () => {
  it('wires the portal module controller', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [PortalModule],
    })
      .overrideProvider(PrismaService)
      .useValue(createPrismaMock([]))
      .compile();

    expect(moduleRef.get(PortalController)).toBeInstanceOf(PortalController);
  });

  it('summarizes only completed contracts and returns decimal amounts as strings', async () => {
    const service = new PortalService(
      createPrismaMock([
        createContract({
          id: 'current-year-completed',
          completedAt: new Date('2026-05-17T10:00:00.000Z'),
          auctionResult: { finalPrice: new Prisma.Decimal('1500.25') },
        }),
        createContract({
          id: 'previous-year-completed',
          completedAt: new Date('2025-12-31T15:59:59.000Z'),
          auctionResult: { finalPrice: new Prisma.Decimal('2000.75') },
        }),
        createContract({
          id: 'pending-sign',
          status: ContractStatus.PENDING_SIGN,
          completedAt: null,
          auctionResult: { finalPrice: new Prisma.Decimal('3000') },
        }),
        createContract({
          id: 'signed',
          status: ContractStatus.SIGNED,
          completedAt: null,
          auctionResult: { finalPrice: new Prisma.Decimal('4000') },
        }),
        createContract({
          id: 'defaulted',
          status: ContractStatus.DEFAULTED,
          completedAt: new Date('2026-05-17T10:00:00.000Z'),
          auctionResult: { finalPrice: new Prisma.Decimal('5000') },
        }),
      ]) as never,
    );

    const result = await service.getDashboard(
      new Date('2026-05-17T12:00:00.000Z'),
    );

    expect(result).toEqual({
      currentYearCompletedCount: 1,
      currentYearCompletedAmount: '1500.25',
      totalCompletedCount: 2,
      totalCompletedAmount: '3501',
    });
  });
});
