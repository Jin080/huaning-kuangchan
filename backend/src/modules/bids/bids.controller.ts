import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { ListResponse } from '../../common/responses/response.types';
import { BidResponse, PublicBidRecordResponse } from './bid.types';
import { BidsService } from './bids.service';
import { BidRecordQueryDto } from './dto/bid-record-query.dto';
import { PlaceBidDto } from './dto/place-bid.dto';

@Controller('lots/:id')
export class BidsController {
  constructor(private readonly bidsService: BidsService) {}

  @Post('bids')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ENTERPRISE')
  placeBid(
    @Param('id') lotId: string,
    @Body() body: PlaceBidDto,
    @CurrentUser() user: CurrentUser,
  ): Promise<BidResponse> {
    return this.bidsService.placeBid(user.id, lotId, body);
  }

  @Get('bid-records')
  listPublicRecords(
    @Param('id') lotId: string,
    @Query() query: BidRecordQueryDto,
  ): Promise<ListResponse<PublicBidRecordResponse>> {
    return this.bidsService.listPublicRecords(lotId, query);
  }
}
