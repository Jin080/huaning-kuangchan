import { Controller, Post, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../../auth/auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { AuctionClosingService } from './auction-closing.service';
import { AuctionClosingSummary } from './auction-closing.types';

@Controller('admin/auction-closing')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminAuctionClosingController {
  constructor(private readonly auctionClosingService: AuctionClosingService) {}

  @Post('run')
  run(): Promise<AuctionClosingSummary> {
    return this.auctionClosingService.closeEndedAuctions();
  }
}
