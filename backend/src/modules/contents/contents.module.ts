import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { AdminContentsController } from './admin-contents.controller';
import { ContentsController } from './contents.controller';
import { ContentsService } from './contents.service';

@Module({
  imports: [PrismaModule],
  controllers: [ContentsController, AdminContentsController],
  providers: [ContentsService],
})
export class ContentsModule {}
