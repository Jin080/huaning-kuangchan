import { Controller, Get, Post, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../../auth/auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { AuctionClosingService } from './auction-closing.service';
import {
  AuctionClosingRunsResponse,
  AuctionClosingSummary,
  PendingAuctionClosingLot,
} from './auction-closing.types';

@Controller('admin/auction-closing')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminAuctionClosingController {
  constructor(private readonly auctionClosingService: AuctionClosingService) {}

  @Get('pending')
  pending(): Promise<PendingAuctionClosingLot[]> {
    return this.auctionClosingService.listPendingLots();
  }

  @Get('runs')
  runs(): AuctionClosingRunsResponse {
    return this.auctionClosingService.listRecentRuns();
  }

  @Post('run')
  run(): Promise<AuctionClosingSummary> {
    return this.auctionClosingService.runClosing('manual');
  }
}
