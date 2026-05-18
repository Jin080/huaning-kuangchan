import {
  EnterpriseCertificationStatus,
  LotStatus,
  Prisma,
} from '@prisma/client';

import { BidsService } from '../../src/modules/bids/bids.service';

type DecimalLike = Prisma.Decimal;

type EnterpriseRecord = {
  id: string;
  name: string;
  certificationStatus: EnterpriseCertificationStatus;
  isBlacklisted: boolean;
};

type LotRecord = {
  id: string;
  title: string;
  startPrice: DecimalLike;
  bidIncrement: DecimalLike;
  currentHighestPrice: DecimalLike | null;
  status: LotStatus;
  biddingStartAt: Date;
  biddingEndAt: Date;
};

type BidRecord = {
  id: string;
  sequenceNo: number;
  lotId: string;
  enterpriseId: string;
  enterpriseName: string;
  maskedEnterpriseName: string;
  amount: DecimalLike;
  incrementCount: number;
  bidAt: Date;
  isCurrentHighest: boolean;
  enterprise?: EnterpriseRecord;
  lot?: Pick<LotRecord, 'id' | 'title'>;
};

function decimal(value: string): DecimalLike {
  return new Prisma.Decimal(value);
}

function createEnterprise(
  overrides: Partial<EnterpriseRecord> = {},
): EnterpriseRecord {
  return {
    id: 'enterprise-1',
    name: '华宁铜业有限公司',
    certificationStatus: EnterpriseCertificationStatus.APPROVED,
    isBlacklisted: false,
    ...overrides,
  };
}

function createLot(overrides: Partial<LotRecord> = {}): LotRecord {
  return {
    id: 'lot-1',
    title: '铜精矿竞拍',
    startPrice: decimal('1200'),
    bidIncrement: decimal('100'),
    currentHighestPrice: null,
    status: LotStatus.BIDDING,
    biddingStartAt: new Date('2026-05-17T08:00:00.000Z'),
    biddingEndAt: new Date('2026-05-17T10:00:00.000Z'),
    ...overrides,
  };
}

function createBid(overrides: Partial<BidRecord> = {}): BidRecord {
  return {
    id: 'bid-1',
    sequenceNo: 1,
    lotId: 'lot-1',
    enterpriseId: 'enterprise-1',
    enterpriseName: '华宁铜业有限公司',
    maskedEnterpriseName: '华***司',
    amount: decimal('1300'),
    incrementCount: 1,
    bidAt: new Date('2026-05-17T09:00:00.000Z'),
    isCurrentHighest: true,
    ...overrides,
  };
}

function createService(options: {
  enterprise?: EnterpriseRecord | null;
  lot?: LotRecord | null;
  qualified?: boolean;
  bids?: BidRecord[];
  now?: Date;
} = {}) {
  const enterprise =
    options.enterprise === undefined ? createEnterprise() : options.enterprise;
  const lot = options.lot === undefined ? createLot() : options.lot;
  const bids = [...(options.bids ?? [])];
  type PrismaMock = {
    user: {
      findUnique: jest.Mock;
    };
    lot: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    bidRecord: {
      findFirst: jest.Mock;
      updateMany: jest.Mock;
      create: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  const prisma = {} as PrismaMock;

  Object.assign(prisma, {
    user: {
      findUnique: jest.fn(() =>
        Promise.resolve(
          enterprise
            ? {
                id: 'user-1',
                enterprise,
              }
            : {
                id: 'user-1',
                enterprise: null,
              },
        ),
      ),
    },
    lot: {
      findUnique: jest.fn(() => Promise.resolve(lot)),
      update: jest.fn(({ data }) => {
        if (!lot) {
          return Promise.resolve(null);
        }

        Object.assign(lot, data);
        return Promise.resolve(lot);
      }),
    },
    bidRecord: {
      findFirst: jest.fn(({ where, orderBy }) => {
        const lotBids = bids.filter((bid) => bid.lotId === where.lotId);

        if (where.isCurrentHighest) {
          return Promise.resolve(
            lotBids.find((bid) => bid.isCurrentHighest) ?? null,
          );
        }

        if (orderBy?.sequenceNo === 'desc') {
          return Promise.resolve(
            [...lotBids].sort((a, b) => b.sequenceNo - a.sequenceNo)[0] ?? null,
          );
        }

        return Promise.resolve(null);
      }),
      updateMany: jest.fn(({ data }) => {
        bids
          .filter((bid) => bid.lotId === 'lot-1' && bid.isCurrentHighest)
          .forEach((bid) => Object.assign(bid, data));
        return Promise.resolve({ count: 1 });
      }),
      create: jest.fn(({ data }) => {
        const bid = createBid({
          ...data,
          id: `bid-${bids.length + 1}`,
          amount: data.amount,
        });
        bids.push(bid);
        return Promise.resolve(bid);
      }),
      findMany: jest.fn(() => Promise.resolve(bids)),
      count: jest.fn(() => Promise.resolve(bids.length)),
    },
    $transaction: jest.fn((callback: (tx: PrismaMock) => Promise<unknown>) =>
      callback(prisma),
    ),
  });
  const deposits = {
    hasBiddingQualification: jest.fn(() =>
      Promise.resolve(options.qualified ?? true),
    ),
  };
  const logs = { record: jest.fn() };

  return {
    service: new BidsService(
      prisma as never,
      deposits as never,
      logs as never,
      () => options.now ?? new Date('2026-05-17T09:00:00.000Z'),
    ),
    prisma,
    deposits,
    logs,
    bids,
    lot,
  };
}

describe('BidsService', () => {
  it('accepts a qualified enterprise bid and updates current highest price', async () => {
    const { service, prisma, deposits, logs, lot } = createService();

    const result = await service.placeBid('user-1', 'lot-1', {
      amount: '1300',
    });

    expect(deposits.hasBiddingQualification).toHaveBeenCalledWith(
      'enterprise-1',
      'lot-1',
    );
    expect(prisma.bidRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sequenceNo: 1,
          enterpriseName: '华宁铜业有限公司',
          maskedEnterpriseName: '华***司',
          incrementCount: 1,
          isCurrentHighest: true,
        }),
      }),
    );
    expect(prisma.lot.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'lot-1' },
        data: { currentHighestPrice: expect.any(Prisma.Decimal) },
      }),
    );
    expect(lot?.currentHighestPrice?.toString()).toBe('1300');
    expect(result.currentHighestPrice).toBe('1300');
    expect(logs.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'user-1',
        action: '提交报价',
      }),
    );
  });

  it('rejects bidding when enterprise certification is pending', async () => {
    const { service } = createService({
      enterprise: createEnterprise({
        certificationStatus: EnterpriseCertificationStatus.PENDING,
      }),
    });

    await expect(
      service.placeBid('user-1', 'lot-1', { amount: '1300' }),
    ).rejects.toMatchObject({ code: 'ENTERPRISE_CERTIFICATION_PENDING' });
  });

  it('rejects bidding when deposit qualification is not approved', async () => {
    const { service } = createService({ qualified: false });

    await expect(
      service.placeBid('user-1', 'lot-1', { amount: '1300' }),
    ).rejects.toMatchObject({ code: 'DEPOSIT_NOT_APPROVED' });
  });

  it('rejects blacklisted enterprises before checking deposit qualification', async () => {
    const { service, deposits } = createService({
      enterprise: createEnterprise({ isBlacklisted: true }),
    });

    await expect(
      service.placeBid('user-1', 'lot-1', { amount: '1300' }),
    ).rejects.toMatchObject({ code: 'BLACKLISTED' });
    expect(deposits.hasBiddingQualification).not.toHaveBeenCalled();
  });

  it('rejects bids when lot is not in bidding status', async () => {
    const { service } = createService({
      lot: createLot({ status: LotStatus.ANNOUNCING }),
    });

    await expect(
      service.placeBid('user-1', 'lot-1', { amount: '1300' }),
    ).rejects.toMatchObject({ code: 'AUCTION_ENDED' });
  });

  it('rejects bids outside bidding time', async () => {
    const { service } = createService({
      now: new Date('2026-05-17T10:00:01.000Z'),
    });

    await expect(
      service.placeBid('user-1', 'lot-1', { amount: '1300' }),
    ).rejects.toMatchObject({ code: 'AUCTION_ENDED' });
  });

  it('rejects bids lower than current highest price or not matching increment', async () => {
    const { service } = createService({
      lot: createLot({ currentHighestPrice: decimal('1300') }),
      bids: [createBid({ amount: decimal('1300') })],
    });

    await expect(
      service.placeBid('user-1', 'lot-1', { amount: '1350' }),
    ).rejects.toMatchObject({ code: 'INVALID_BID_INCREMENT' });
  });

  it('clears the previous current highest bid after a higher valid bid', async () => {
    const previousBid = createBid({ amount: decimal('1300') });
    const { service, prisma, bids, lot } = createService({
      lot: createLot({ currentHighestPrice: decimal('1300') }),
      bids: [previousBid],
    });

    const result = await service.placeBid('user-1', 'lot-1', {
      amount: '1500',
    });

    expect(prisma.bidRecord.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { lotId: 'lot-1', isCurrentHighest: true },
        data: { isCurrentHighest: false },
      }),
    );
    expect(bids[0].isCurrentHighest).toBe(false);
    expect(lot?.currentHighestPrice?.toString()).toBe('1500');
    expect(result.sequenceNo).toBe(2);
    expect(result.incrementCount).toBe(2);
  });

  it('returns public bid records with masked enterprise names only', async () => {
    const { service } = createService({
      bids: [createBid()],
    });

    const result = await service.listPublicRecords('lot-1', {
      page: 1,
      pageSize: 10,
    });

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        enterpriseName: '华***司',
        maskedEnterpriseName: '华***司',
      }),
    );
    expect(result.items[0]).not.toHaveProperty(
      'realEnterpriseName',
      '华宁铜业有限公司',
    );
  });

  it('returns admin bid records with real enterprise information', async () => {
    const { service } = createService({
      bids: [
        createBid({
          enterprise: createEnterprise(),
          lot: { id: 'lot-1', title: '铜精矿竞拍' },
        }),
      ],
    });

    const result = await service.listAdminRecords({
      page: 1,
      pageSize: 10,
    });

    expect(result.items[0]).toEqual(
      expect.objectContaining({
        enterpriseName: '华宁铜业有限公司',
        maskedEnterpriseName: '华***司',
        lotTitle: '铜精矿竞拍',
      }),
    );
  });
});
