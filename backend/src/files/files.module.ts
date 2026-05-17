import { Module } from '@nestjs/common';

import { FilePolicyService } from './file-policy.service';

@Module({
  providers: [FilePolicyService],
  exports: [FilePolicyService],
})
export class FilesModule {}
