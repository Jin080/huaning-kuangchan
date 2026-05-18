import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../../auth/auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { ListResponse } from '../../common/responses/response.types';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationResponse } from './notification.types';
import { NotificationsService } from './notifications.service';

@Controller('admin/notifications')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(
    @Query() query: NotificationQueryDto,
  ): Promise<ListResponse<NotificationResponse>> {
    return this.notificationsService.list(query);
  }
}
