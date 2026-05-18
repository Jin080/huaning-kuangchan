import { OperationLogAction } from '@prisma/client';

export interface OperationLogResponse {
  id: string;
  operatorId: string | null;
  operatorUsername: string | null;
  action: OperationLogAction;
  targetType: string;
  targetId: string | null;
  summary: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}
