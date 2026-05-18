export interface BidResponse {
  id: string;
  sequenceNo: number;
  lotId: string;
  enterpriseId: string;
  enterpriseName: string;
  maskedEnterpriseName: string;
  amount: string;
  incrementCount: number;
  bidAt: Date;
  isCurrentHighest: boolean;
  currentHighestPrice: string;
}

export interface PublicBidRecordResponse {
  id: string;
  sequenceNo: number;
  lotId: string;
  enterpriseName: string;
  maskedEnterpriseName: string;
  amount: string;
  incrementCount: number;
  bidAt: Date;
  isCurrentHighest: boolean;
}

export interface AdminBidRecordResponse extends PublicBidRecordResponse {
  enterpriseId: string;
  lotTitle: string | null;
}
