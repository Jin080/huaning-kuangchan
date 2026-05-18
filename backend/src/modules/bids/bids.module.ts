import { Module } from '@nestjs/common';

import { LoggingModule } from '../../logging/logging.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { DepositsModule } from '../deposits/deposits.module';
import { AdminBidsController } from './admin-bids.controller';
import { BidsController } from './bids.controller';
import { BidsService } from './bids.service';

@Module({
  imports: [PrismaModule, LoggingModule, DepositsModule],
  controllers: [BidsController, AdminBidsController],
  providers: [BidsService],
  exports: [BidsService],
})
export class BidsModule {}
