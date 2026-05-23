import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NoopSmsProvider, SMS_PROVIDER } from './sms-provider';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    {
      provide: SMS_PROVIDER,
      useClass: NoopSmsProvider,
    },
  ],
  exports: [NotificationsService, SMS_PROVIDER],
})
export class NotificationsModule {}
