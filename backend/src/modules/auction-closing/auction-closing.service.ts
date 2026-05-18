import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AuctionResult,
  AuctionResultStatus,
  BidRecord,
  Lot,
  LotStatus,
  NotificationChannel,
  NotificationSendStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';

import { OperationLogService } from '../../logging/operation-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuctionClosingSummary } from './auction-closing.types';

type ClosingLot = Pick<Lot, 'id' | 'title' | 'status' | 'biddingEndAt'>;

export const AUCTION_CLOSING_NOW = 'AUCTION_CLOSING_NOW';

@Injectable()
export class AuctionClosingService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaServiceLike,
    private readonly operationLog?: OperationLogService,
    @Optional()
    @Inject(AUCTION_CLOSING_NOW)
    private readonly now: () => Date = () => new Date(),
  ) {}

  async closeEndedAuctions(): Promise<AuctionClosingSummary> {
    const now = this.now();
    const lots = await this.prisma.lot.findMany({
      where: {
        status: LotStatus.BIDDING,
        biddingEndAt: { lt: now },
      },
      orderBy: { biddingEndAt: 'asc' },
    });
    const summary: AuctionClosingSummary = {
      checkedLots: lots.length,
      closedLots: 0,
      endedWithoutBids: 0,
      skippedLots: 0,
    };

    for (const lot of lots) {
      const outcome = await this.closeLot(lot);
      summary[outcome] += 1;
    }

    return summary;
  }

  private async closeLot(
    lot: ClosingLot,
  ): Promise<'closedLots' | 'endedWithoutBids' | 'skippedLots'> {
    return this.prisma.$transaction(async (tx) => {
      const existingResult = await tx.auctionResult.findUnique({
        where: { lotId: lot.id },
      });

      if (existingResult) {
        return 'skippedLots';
      }

      const highestBid = await tx.bidRecord.findFirst({
        where: { lotId: lot.id, isCurrentHighest: true },
        orderBy: { bidAt: 'desc' },
      });

      if (!highestBid) {
        await tx.lot.update({
          where: { id: lot.id },
          data: { status: LotStatus.ENDED },
        });
        return 'endedWithoutBids';
      }

      await tx.auctionResult.create({
        data: {
          lotId: lot.id,
          winningEnterpriseId: highestBid.enterpriseId,
          finalPrice: highestBid.amount,
          status: AuctionResultStatus.GENERATED,
          generatedAt: this.now(),
        },
      });

      await tx.lot.update({
        where: { id: lot.id },
        data: { status: LotStatus.RESULT_ANNOUNCING },
      });

      await this.createNotifications(tx, lot, highestBid);

      await this.operationLog?.record({
        actorId: undefined,
        action: '竞拍截止确认成交',
        target: `lot:${lot.id}`,
      });

      return 'closedLots';
    });
  }

  private async createNotifications(
    tx: PrismaServiceLike,
    lot: ClosingLot,
    highestBid: BidRecord,
  ): Promise<void> {
    const bidEnterprises = await tx.bidRecord.findMany({
      where: { lotId: lot.id },
      distinct: ['enterpriseId'],
      orderBy: { bidAt: 'asc' },
    });

    await tx.notification.createMany({
      data: bidEnterprises.map((bid) => ({
        type:
          bid.enterpriseId === highestBid.enterpriseId
            ? NotificationType.WIN
            : NotificationType.LOSE,
        channel: NotificationChannel.IN_APP,
        receiverEnterpriseId: bid.enterpriseId,
        lotId: lot.id,
        lotTitle: lot.title,
        content:
          bid.enterpriseId === highestBid.enterpriseId
            ? `您参与的${lot.title}竞拍已结束，已中标，请办理签约与尾款手续。`
            : `您参与的${lot.title}竞拍已结束，未中标，保证金将退回。`,
        sendStatus: NotificationSendStatus.PENDING,
      })),
      skipDuplicates: true,
    });
  }
}

type PrismaServiceLike = {
  lot: {
    findMany(args: Prisma.LotFindManyArgs): Promise<ClosingLot[]>;
    update(args: Prisma.LotUpdateArgs): Promise<Lot | null>;
  };
  bidRecord: {
    findFirst(args: Prisma.BidRecordFindFirstArgs): Promise<BidRecord | null>;
    findMany(args: Prisma.BidRecordFindManyArgs): Promise<BidRecord[]>;
  };
  auctionResult: {
    findUnique(
      args: Prisma.AuctionResultFindUniqueArgs,
    ): Promise<AuctionResult | null>;
    create(args: Prisma.AuctionResultCreateArgs): Promise<AuctionResult>;
  };
  notification: {
    createMany(args: Prisma.NotificationCreateManyArgs): Promise<Prisma.BatchPayload>;
  };
  $transaction<T>(fn: (tx: PrismaServiceLike) => Promise<T>): Promise<T>;
};
