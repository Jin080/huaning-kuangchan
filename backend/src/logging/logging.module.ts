import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AdminLogsController } from './admin-logs.controller';
import { OperationLogService } from './operation-log.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminLogsController],
  providers: [OperationLogService],
  exports: [OperationLogService],
})
export class LoggingModule {}
