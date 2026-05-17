import { Injectable, Logger } from '@nestjs/common';

import { OperationLogEntry } from './operation-log.types';

@Injectable()
export class OperationLogService {
  private readonly logger = new Logger(OperationLogService.name);

  record(entry: Omit<OperationLogEntry, 'createdAt'>): OperationLogEntry {
    const logEntry: OperationLogEntry = {
      ...entry,
      createdAt: new Date(),
    };

    this.logger.log(
      JSON.stringify({
        actorId: logEntry.actorId,
        action: logEntry.action,
        target: logEntry.target,
        createdAt: logEntry.createdAt.toISOString(),
      }),
    );

    return logEntry;
  }
}
