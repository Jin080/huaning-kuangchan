import { Module } from '@nestjs/common';

import { LoggingModule } from '../../logging/logging.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminResultsController } from './admin-results.controller';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';

@Module({
  imports: [PrismaModule, LoggingModule],
  controllers: [ResultsController, AdminResultsController],
  providers: [ResultsService],
  exports: [ResultsService],
})
export class ResultsModule {}
