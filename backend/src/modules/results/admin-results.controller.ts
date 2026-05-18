import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { ListResponse } from '../../common/responses/response.types';
import { ResultQueryDto } from './dto/result-query.dto';
import { ResultResponse } from './result.types';
import { ResultsService } from './results.service';

@Controller('admin/results')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Get()
  list(
    @Query() query: ResultQueryDto,
  ): Promise<ListResponse<ResultResponse>> {
    return this.resultsService.listAdmin(query);
  }

  @Post(':id/publish')
  publish(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUser,
  ): Promise<ResultResponse> {
    return this.resultsService.publish(id, user.id);
  }
}
