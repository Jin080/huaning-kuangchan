import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ListResponse } from '../common/responses/response.types';
import { AdminLogQueryDto } from './dto/admin-log-query.dto';
import { OperationLogResponse } from './operation-log.response';
import { OperationLogService } from './operation-log.service';

@Controller('admin/logs')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminLogsController {
  constructor(private readonly operationLogService: OperationLogService) {}

  @Get()
  list(
    @Query() query: AdminLogQueryDto,
  ): Promise<ListResponse<OperationLogResponse>> {
    return this.operationLogService.list(query);
  }
}
