import { ContractStatus, LotStatus } from '@prisma/client';

export interface ContractAttachmentResponse {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  fileSize: number | null;
  isSensitive: boolean;
  createdAt: Date;
}

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
  attachments: ContractAttachmentResponse[];
  createdAt: Date;
  updatedAt: Date;
}
