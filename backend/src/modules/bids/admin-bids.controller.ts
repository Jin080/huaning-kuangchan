import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../../auth/auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { ListResponse } from '../../common/responses/response.types';
import { AdminBidRecordResponse } from './bid.types';
import { BidsService } from './bids.service';
import { BidRecordQueryDto } from './dto/bid-record-query.dto';

@Controller('admin/bids')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminBidsController {
  constructor(private readonly bidsService: BidsService) {}

  @Get()
  list(
    @Query() query: BidRecordQueryDto,
  ): Promise<ListResponse<AdminBidRecordResponse>> {
    return this.bidsService.listAdminRecords(query);
  }
}
