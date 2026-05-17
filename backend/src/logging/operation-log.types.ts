export interface OperationLogEntry {
  actorId?: string;
  action: string;
  target?: string;
  createdAt: Date;
}
