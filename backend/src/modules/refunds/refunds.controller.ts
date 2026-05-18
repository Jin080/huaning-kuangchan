import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { ListResponse } from '../../common/responses/response.types';
import { RefundQueryDto } from './dto/refund-query.dto';
import { RefundResponse } from './refund.types';
import { RefundsService } from './refunds.service';

@Controller('admin/refunds')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Get()
  list(
    @Query() query: RefundQueryDto,
  ): Promise<ListResponse<RefundResponse>> {
    return this.refundsService.list(query);
  }

  @Post(':id/mark-reviewing')
  markReviewing(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUser,
  ): Promise<RefundResponse> {
    return this.refundsService.markReviewing(id, user.id);
  }

  @Post(':id/mark-refunded')
  markRefunded(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUser,
  ): Promise<RefundResponse> {
    return this.refundsService.markRefunded(id, user.id);
  }
}
