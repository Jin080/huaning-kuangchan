import { RefundStatus } from '@prisma/client';

export interface RefundResponse {
  id: string;
  lotId: string;
  lotTitle: string;
  enterpriseId: string;
  enterpriseName: string;
  depositVoucherId: string | null;
  amount: string;
  status: string;
  statusCode: RefundStatus;
  reviewedAt: Date | null;
  refundedAt: Date | null;
  remark: string | null;
  createdAt: Date;
  updatedAt: Date;
}
