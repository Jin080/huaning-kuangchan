export interface OperationLogEntry {
  actorId?: string;
  action: string;
  target?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}
