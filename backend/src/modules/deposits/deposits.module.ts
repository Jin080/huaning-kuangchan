import { Module } from '@nestjs/common';

import { LoggingModule } from '../../logging/logging.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { DepositsController } from './deposits.controller';
import { DepositsService } from './deposits.service';

@Module({
  imports: [LoggingModule, PrismaModule],
  controllers: [DepositsController],
  providers: [DepositsService],
  exports: [DepositsService],
})
export class DepositsModule {}
