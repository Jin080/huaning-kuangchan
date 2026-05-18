import { ContractStatus, LotStatus } from '@prisma/client';

export interface ContractResponse {
  id: string;
  auctionResultId: string;
  lotId: string;
  lotTitle: string;
  lotStatusCode: LotStatus;
  enterpriseId: string;
  enterpriseName: string;
  finalPrice: string;
  status: string;
  statusCode: ContractStatus;
  signedAt: Date | null;
  completedAt: Date | null;
  defaultedAt: Date | null;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
}
