import { Module } from '@nestjs/common';

import { LoggingModule } from '../../logging/logging.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { LotReviewsController } from './lot-reviews.controller';
import { LotReviewsService } from './lot-reviews.service';

@Module({
  imports: [PrismaModule, LoggingModule],
  controllers: [LotReviewsController],
  providers: [LotReviewsService],
})
export class LotReviewsModule {}
