import {
  AuctionResultStatus,
  LotStatus,
  NotificationChannel,
  NotificationSendStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';

import { AuctionClosingService } from '../../src/modules/auction-closing/auction-closing.service';

type LotRecord = {
  id: string;
  title: string;
  status: LotStatus;
  biddingEndAt: Date;
};

type BidRecord = {
  id: string;
  lotId: string;
  enterpriseId: string;
  amount: Prisma.Decimal;
  isCurrentHighest: boolean;
};

function createLot(overrides: Partial<LotRecord> = {}): LotRecord {
  return {
    id: 'lot-1',
    title: '铜精矿竞拍',
    status: LotStatus.BIDDING,
    biddingEndAt: new Date('2026-05-17T09:00:00.000Z'),
    ...overrides,
  };
}

function createBid(overrides: Partial<BidRecord> = {}): BidRecord {
  return {
    id: 'bid-1',
    lotId: 'lot-1',
    enterpriseId: 'winner-1',
    amount: new Prisma.Decimal('1500'),
    isCurrentHighest: true,
    ...overrides,
  };
}

function createService(options: {
  lot?: LotRecord | null;
  bids?: BidRecord[];
  now?: Date;
  existingResult?: unknown;
} = {}) {
  const lot = options.lot === undefined ? createLot() : options.lot;
  const bids = [...(options.bids ?? [createBid()])];
  type PrismaMock = {
    lot: {
      findMany: jest.Mock;
      update: jest.Mock;
    };
    bidRecord: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
    auctionResult: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    notification: {
      createMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  const prisma = {} as PrismaMock;

  Object.assign(prisma, {
    lot: {
      findMany: jest.fn(() => Promise.resolve(lot ? [lot] : [])),
      update: jest.fn(({ data }) => {
        if (lot) {
          Object.assign(lot, data);
        }

        return Promise.resolve(lot);
      }),
    },
    bidRecord: {
      findFirst: jest.fn(() =>
        Promise.resolve(bids.find((bid) => bid.isCurrentHighest) ?? null),
      ),
      findMany: jest.fn(() => Promise.resolve(bids)),
    },
    auctionResult: {
      findUnique: jest.fn(() => Promise.resolve(options.existingResult ?? null)),
      create: jest.fn(({ data }) =>
        Promise.resolve({
          id: 'result-1',
          status: AuctionResultStatus.GENERATED,
          ...data,
        }),
      ),
    },
    notification: {
      createMany: jest.fn(() => Promise.resolve({ count: 2 })),
    },
    $transaction: jest.fn((callback: (tx: PrismaMock) => Promise<unknown>) =>
      callback(prisma),
    ),
  });
  const logs = { record: jest.fn() };

  return {
    service: new AuctionClosingService(
      prisma as never,
      logs as never,
      () => options.now ?? new Date('2026-05-17T09:01:00.000Z'),
    ),
    prisma,
    logs,
    lot,
  };
}

describe('AuctionClosingService', () => {
  it('creates an auction result for ended bidding lot and moves lot to result announcing', async () => {
    const { service, prisma, lot, logs } = createService({
      bids: [
        createBid({ enterpriseId: 'winner-1', amount: new Prisma.Decimal('1500') }),
        createBid({
          id: 'bid-2',
          enterpriseId: 'loser-1',
          amount: new Prisma.Decimal('1400'),
          isCurrentHighest: false,
        }),
      ],
    });

    const result = await service.closeEndedAuctions();

    expect(result.closedLots).toBe(1);
    expect(prisma.auctionResult.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          lotId: 'lot-1',
          winningEnterpriseId: 'winner-1',
          finalPrice: expect.any(Prisma.Decimal),
          status: AuctionResultStatus.GENERATED,
        }),
      }),
    );
    expect(prisma.lot.update).toHaveBeenCalledWith({
      where: { id: 'lot-1' },
      data: { status: LotStatus.RESULT_ANNOUNCING },
    });
    expect(lot?.status).toBe(LotStatus.RESULT_ANNOUNCING);
    expect(prisma.notification.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            type: NotificationType.WIN,
            channel: NotificationChannel.IN_APP,
            receiverEnterpriseId: 'winner-1',
            sendStatus: NotificationSendStatus.PENDING,
          }),
          expect.objectContaining({
            type: NotificationType.LOSE,
            receiverEnterpriseId: 'loser-1',
            sendStatus: NotificationSendStatus.PENDING,
          }),
        ]),
        skipDuplicates: true,
      }),
    );
    expect(logs.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: '竞拍截止确认成交',
        target: 'lot:lot-1',
      }),
    );
  });

  it('skips lots without bids and marks them ended', async () => {
    const { service, prisma, lot } = createService({ bids: [] });

    const result = await service.closeEndedAuctions();

    expect(result.closedLots).toBe(0);
    expect(result.endedWithoutBids).toBe(1);
    expect(prisma.auctionResult.create).not.toHaveBeenCalled();
    expect(prisma.lot.update).toHaveBeenCalledWith({
      where: { id: 'lot-1' },
      data: { status: LotStatus.ENDED },
    });
    expect(lot?.status).toBe(LotStatus.ENDED);
  });

  it('does not create duplicate result when one already exists', async () => {
    const { service, prisma } = createService({
      existingResult: { id: 'result-1' },
    });

    const result = await service.closeEndedAuctions();

    expect(result.skippedLots).toBe(1);
    expect(prisma.auctionResult.create).not.toHaveBeenCalled();
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });
});
