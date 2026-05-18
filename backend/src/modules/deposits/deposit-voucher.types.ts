export interface DepositVoucherResponse {
  id: string;
  lotId: string;
  lotTitle?: string | null;
  enterpriseId: string;
  enterpriseName?: string | null;
  requiredAmount: string;
  paidAmount: string | null;
  status: string;
  statusCode: string;
  submittedAt?: Date;
  reviewedAt?: Date | null;
  reviewerId?: string | null;
  rejectReason: string | null;
}
