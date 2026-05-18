import { Module } from '@nestjs/common';

import { LoggingModule } from '../../logging/logging.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { RefundsController } from './refunds.controller';
import { RefundsService } from './refunds.service';

@Module({
  imports: [PrismaModule, LoggingModule],
  controllers: [RefundsController],
  providers: [RefundsService],
  exports: [RefundsService],
})
export class RefundsModule {}
