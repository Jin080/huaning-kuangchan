import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  Optional,
} from '@nestjs/common';
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
import {
  SMS_PROVIDER,
  SmsProvider,
  SmsSendResult,
} from '../notifications/sms-provider';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AuctionClosingRunRecord,
  AuctionClosingRunTrigger,
  AuctionClosingRunsResponse,
  AuctionClosingSummary,
  PendingAuctionClosingLot,
} from './auction-closing.types';

type ClosingLot = Pick<
  Lot,
  'id' | 'title' | 'status' | 'biddingEndAt' | 'currentHighestPrice'
>;

export const AUCTION_CLOSING_NOW = 'AUCTION_CLOSING_NOW';
const PENDING_LOOKAHEAD_MS = 30 * 60 * 1000;
const AUTO_RUN_INTERVAL_MS = 60 * 1000;
const MAX_RECENT_RUNS = 20;

@Injectable()
export class AuctionClosingService implements OnModuleInit, OnModuleDestroy {
  private readonly recentRuns: AuctionClosingRunRecord[] = [];
  private autoRunTimer: ReturnType<typeof setInterval> | undefined;
  private autoRunInFlight = false;

  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaServiceLike,
    private readonly operationLog?: OperationLogService,
    @Optional()
    @Inject(AUCTION_CLOSING_NOW)
    private readonly now: () => Date = () => new Date(),
    @Optional()
    @Inject(SMS_PROVIDER)
    private readonly smsProvider?: SmsProvider,
  ) {}

  onModuleInit(): void {
    this.autoRunTimer = setInterval(() => {
      if (this.autoRunInFlight) {
        return;
      }

      this.autoRunInFlight = true;
      void this.runClosing('auto').finally(() => {
        this.autoRunInFlight = false;
      });
    }, AUTO_RUN_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.autoRunTimer) {
      clearInterval(this.autoRunTimer);
      this.autoRunTimer = undefined;
    }
  }

  async runClosing(
    trigger: AuctionClosingRunTrigger,
  ): Promise<AuctionClosingSummary> {
    const startedAt = this.now();

    try {
      const summary = await this.closeEndedAuctions();
      this.recordRun({
        id: `${startedAt.getTime()}-${this.recentRuns.length + 1}`,
        trigger,
        status: 'SUCCESS',
        startedAt,
        finishedAt: this.now(),
        summary,
        errorMessage: null,
      });

      return summary;
    } catch (error) {
      const summary: AuctionClosingSummary = {
        checkedLots: 0,
        closedLots: 0,
        endedWithoutBids: 0,
        skippedLots: 0,
      };
      this.recordRun({
        id: `${startedAt.getTime()}-${this.recentRuns.length + 1}`,
        trigger,
        status: 'FAILED',
        startedAt,
        finishedAt: this.now(),
        summary,
        errorMessage: error instanceof Error ? error.message : String(error),
      });

      throw error;
    }
  }

  async listPendingLots(): Promise<PendingAuctionClosingLot[]> {
    const endAt = new Date(this.now().getTime() + PENDING_LOOKAHEAD_MS);
    const lots = await this.prisma.lot.findMany({
      where: {
        status: LotStatus.BIDDING,
        biddingEndAt: { lte: endAt },
      },
      orderBy: { biddingEndAt: 'asc' },
    });

    return lots.map((lot) => ({
      lotId: lot.id,
      title: lot.title,
      endAt: lot.biddingEndAt,
      currentHighestPrice: lot.currentHighestPrice?.toString() ?? null,
      status: lot.status,
    }));
  }

  listRecentRuns(): AuctionClosingRunsResponse {
    return {
      ephemeral: true,
      items: [...this.recentRuns],
    };
  }

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

  private recordRun(record: AuctionClosingRunRecord): void {
    this.recentRuns.unshift(record);
    this.recentRuns.splice(MAX_RECENT_RUNS);
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

    const data = await Promise.all(
      bidEnterprises.flatMap(async (bid) => {
        const type =
          bid.enterpriseId === highestBid.enterpriseId
            ? NotificationType.WIN
            : NotificationType.LOSE;
        const content =
          bid.enterpriseId === highestBid.enterpriseId
            ? `您参与的${lot.title}竞拍已结束，已中标，请办理签约与尾款手续。`
            : `您参与的${lot.title}竞拍已结束，未中标，保证金将退回。`;
        const smsResult = await this.sendSms({
          receiverEnterpriseId: bid.enterpriseId,
          lotId: lot.id,
          content,
        });

        return [
          {
            type,
            channel: NotificationChannel.IN_APP,
            receiverEnterpriseId: bid.enterpriseId,
            lotId: lot.id,
            lotTitle: lot.title,
            content,
            sendStatus: NotificationSendStatus.PENDING,
          },
          {
            type,
            channel: NotificationChannel.SMS,
            receiverEnterpriseId: bid.enterpriseId,
            lotId: lot.id,
            lotTitle: lot.title,
            content:
              smsResult.status === 'SENT'
                ? content
                : `${smsResult.message}。${content}`,
            sendStatus: this.toNotificationSendStatus(smsResult),
            sentAt: smsResult.sentAt,
          },
        ];
      }),
    );

    await tx.notification.createMany({
      data: data.flat(),
      skipDuplicates: true,
    });
  }

  private async sendSms(args: {
    receiverEnterpriseId: string;
    lotId: string;
    content: string;
  }): Promise<SmsSendResult> {
    if (!this.smsProvider) {
      return {
        status: 'SKIPPED',
        message: '短信供应商未配置，未发送',
      };
    }

    return this.smsProvider.send(args);
  }

  private toNotificationSendStatus(
    result: SmsSendResult,
  ): NotificationSendStatus {
    if (result.status === 'SENT') {
      return NotificationSendStatus.SENT;
    }

    return NotificationSendStatus.FAILED;
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
