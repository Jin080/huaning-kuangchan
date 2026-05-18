import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { FilePolicyService } from './file-policy.service';

@Module({
  imports: [PrismaModule],
  controllers: [FilesController],
  providers: [FilePolicyService, FilesService],
  exports: [FilePolicyService],
})
export class FilesModule {}
