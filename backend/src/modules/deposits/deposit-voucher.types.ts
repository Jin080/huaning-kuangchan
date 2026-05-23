export interface DepositVoucherResponse {
  id: string;
  lotId: string;
  lotTitle?: string | null;
  enterpriseId: string;
  enterpriseName?: string | null;
  attachmentId?: string | null;
  voucherFileName?: string | null;
  voucherFileUrl?: string | null;
  requiredAmount: string;
  paidAmount: string | null;
  status: string;
  statusCode: string;
  submittedAt?: Date;
  reviewedAt?: Date | null;
  reviewerId?: string | null;
  rejectReason: string | null;
}
