import { Module } from '@nestjs/common';

import { AuthModule } from '../../auth/auth.module';
import { LoggingModule } from '../../logging/logging.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { EnterprisesController } from './enterprises.controller';
import { EnterprisesService } from './enterprises.service';

@Module({
  imports: [AuthModule, LoggingModule, PrismaModule],
  controllers: [EnterprisesController],
  providers: [EnterprisesService],
  exports: [EnterprisesService],
})
export class EnterprisesModule {}
