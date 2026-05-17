import { Module } from '@nestjs/common';

import { AuthModule } from './auth/auth.module';
import { FilesModule } from './files/files.module';
import { HealthModule } from './health/health.module';
import { LoggingModule } from './logging/logging.module';

@Module({
  imports: [AuthModule, FilesModule, HealthModule, LoggingModule],
})
export class AppModule {}
