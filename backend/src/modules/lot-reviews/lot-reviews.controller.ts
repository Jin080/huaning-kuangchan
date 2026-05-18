import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { LotResponse } from '../lots/lot.types';
import { RejectLotReviewDto } from './dto/reject-lot-review.dto';
import { LotReviewsService } from './lot-reviews.service';

@Controller('admin/reviews/lots')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class LotReviewsController {
  constructor(private readonly lotReviewsService: LotReviewsService) {}

  @Get()
  list(): Promise<LotResponse[]> {
    return this.lotReviewsService.listPending();
  }

  @Post(':id/approve')
  approve(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUser,
  ): Promise<LotResponse> {
    return this.lotReviewsService.approve(id, user.id);
  }

  @Post(':id/reject')
  reject(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUser,
    @Body() body: RejectLotReviewDto,
  ): Promise<LotResponse> {
    return this.lotReviewsService.reject(id, user.id, body.rejectReason);
  }
}
