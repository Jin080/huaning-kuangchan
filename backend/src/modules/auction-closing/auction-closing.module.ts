import { Module } from '@nestjs/common';

import { LoggingModule } from '../../logging/logging.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminAuctionClosingController } from './admin-auction-closing.controller';
import { AuctionClosingService } from './auction-closing.service';

@Module({
  imports: [PrismaModule, LoggingModule],
  controllers: [AdminAuctionClosingController],
  providers: [AuctionClosingService],
  exports: [AuctionClosingService],
})
export class AuctionClosingModule {}
