export interface AuctionClosingSummary {
  checkedLots: number;
  closedLots: number;
  endedWithoutBids: number;
  skippedLots: number;
}

export interface PendingAuctionClosingLot {
  lotId: string;
  title: string;
  endAt: Date;
  currentHighestPrice: string | null;
  status: string;
}

export type AuctionClosingRunTrigger = 'manual' | 'auto';
export type AuctionClosingRunStatus = 'SUCCESS' | 'FAILED';

export interface AuctionClosingRunRecord {
  id: string;
  trigger: AuctionClosingRunTrigger;
  status: AuctionClosingRunStatus;
  startedAt: Date;
  finishedAt: Date;
  summary: AuctionClosingSummary;
  errorMessage: string | null;
}

export interface AuctionClosingRunsResponse {
  ephemeral: true;
  items: AuctionClosingRunRecord[];
}
