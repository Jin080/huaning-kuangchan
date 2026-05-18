import { AuctionResultStatus, LotStatus } from '@prisma/client';

export interface ResultResponse {
  id: string;
  lotId: string;
  lotTitle: string;
  lotStatusCode: LotStatus;
  winningEnterpriseId: string;
  winningEnterpriseName: string;
  finalPrice: string;
  status: string;
  statusCode: AuctionResultStatus;
  generatedAt: Date;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
