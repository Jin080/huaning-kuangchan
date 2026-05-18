import { Module } from '@nestjs/common';

import { LoggingModule } from '../../logging/logging.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { BlacklistController } from './blacklist.controller';
import { BlacklistService } from './blacklist.service';

@Module({
  imports: [PrismaModule, LoggingModule],
  controllers: [BlacklistController],
  providers: [BlacklistService],
  exports: [BlacklistService],
})
export class BlacklistModule {}
