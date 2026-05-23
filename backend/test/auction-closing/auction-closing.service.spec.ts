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
  currentHighestPrice: Prisma.Decimal | null;
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
    currentHighestPrice: null,
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
  lots?: LotRecord[];
  bids?: BidRecord[];
  now?: Date;
  existingResult?: unknown;
} = {}) {
  const lot = options.lot === undefined ? createLot() : options.lot;
  const lots = options.lots ?? (lot ? [lot] : []);
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
      findMany: jest.fn(() => Promise.resolve(lots)),
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
      undefined,
    ),
    prisma,
    logs,
    lot,
  };
}

describe('AuctionClosingService', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

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
            channel: NotificationChannel.IN_APP,
            receiverEnterpriseId: 'loser-1',
            sendStatus: NotificationSendStatus.PENDING,
          }),
          expect.objectContaining({
            type: NotificationType.WIN,
            channel: NotificationChannel.SMS,
            receiverEnterpriseId: 'winner-1',
            sendStatus: NotificationSendStatus.FAILED,
            content: expect.stringContaining('短信供应商未配置，未发送'),
          }),
          expect.objectContaining({
            type: NotificationType.LOSE,
            channel: NotificationChannel.SMS,
            receiverEnterpriseId: 'loser-1',
            sendStatus: NotificationSendStatus.FAILED,
            content: expect.stringContaining('短信供应商未配置，未发送'),
          }),
        ]),
        skipDuplicates: true,
      }),
    );
    expect(prisma.notification.createMany.mock.calls[0][0].data).toHaveLength(4);
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

  it('lists bidding lots that have ended or will end soon', async () => {
    const endingSoon = createLot({
      id: 'lot-2',
      title: '即将结拍铜矿',
      biddingEndAt: new Date('2026-05-17T09:20:00.000Z'),
    });
    const { service, prisma } = createService({
      lots: [
        createLot({ currentHighestPrice: new Prisma.Decimal('1500') }),
        endingSoon,
      ],
      now: new Date('2026-05-17T09:01:00.000Z'),
    });

    const result = await service.listPendingLots();

    expect(prisma.lot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: LotStatus.BIDDING,
          biddingEndAt: { lte: new Date('2026-05-17T09:31:00.000Z') },
        },
        orderBy: { biddingEndAt: 'asc' },
      }),
    );
    expect(result).toEqual([
      expect.objectContaining({
        lotId: 'lot-1',
        title: '铜精矿竞拍',
        endAt: new Date('2026-05-17T09:00:00.000Z'),
        currentHighestPrice: '1500',
        status: LotStatus.BIDDING,
      }),
      expect.objectContaining({
        lotId: 'lot-2',
        title: '即将结拍铜矿',
        currentHighestPrice: null,
      }),
    ]);
  });

  it('records recent manual runs in memory', async () => {
    const { service } = createService();

    const summary = await service.runClosing('manual');
    const runs = service.listRecentRuns();

    expect(summary.closedLots).toBe(1);
    expect(runs.ephemeral).toBe(true);
    expect(runs.items[0]).toEqual(
      expect.objectContaining({
        trigger: 'manual',
        summary,
        status: 'SUCCESS',
      }),
    );
  });

  it('starts and stops automatic interval runs without waiting a full minute', () => {
    jest.useFakeTimers();
    const { service } = createService();
    const runSpy = jest.spyOn(service, 'runClosing').mockResolvedValue({
      checkedLots: 0,
      closedLots: 0,
      endedWithoutBids: 0,
      skippedLots: 0,
    });

    service.onModuleInit();
    jest.advanceTimersByTime(5_000);
    service.onModuleDestroy();
    jest.advanceTimersByTime(60_000);

    expect(runSpy).toHaveBeenCalledTimes(1);
    expect(runSpy).toHaveBeenCalledWith('auto');
  });
});
