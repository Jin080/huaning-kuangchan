import { Module } from '@nestjs/common';

import { LoggingModule } from '../../logging/logging.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminLotsController } from './admin-lots.controller';
import { LotsController } from './lots.controller';
import { LotsService } from './lots.service';

@Module({
  imports: [PrismaModule, LoggingModule],
  controllers: [LotsController, AdminLotsController],
  providers: [LotsService],
  exports: [LotsService],
})
export class LotsModule {}
