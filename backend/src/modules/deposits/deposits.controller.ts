import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { DepositVoucherResponse } from './deposit-voucher.types';
import {
  DepositVoucherDto,
  RejectDepositVoucherDto,
} from './dto/deposit-voucher.dto';
import { DepositsService } from './deposits.service';

@Controller()
@UseGuards(AuthGuard, RolesGuard)
export class DepositsController {
  constructor(private readonly depositsService: DepositsService) {}

  @Post('lots/:id/deposit-vouchers')
  @Roles('ENTERPRISE')
  submitVoucher(
    @CurrentUser() user: CurrentUser,
    @Param('id') lotId: string,
    @Body() dto: DepositVoucherDto,
  ): Promise<DepositVoucherResponse> {
    return this.depositsService.submitVoucher(user.id, lotId, dto);
  }

  @Get('admin/reviews/deposits')
  @Roles('ADMIN')
  listForReview(): Promise<DepositVoucherResponse[]> {
    return this.depositsService.listForReview();
  }

  @Post('admin/reviews/deposits/:id/approve')
  @Roles('ADMIN')
  approve(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
  ): Promise<DepositVoucherResponse> {
    return this.depositsService.approveVoucher(id, user.id);
  }

  @Post('admin/reviews/deposits/:id/reject')
  @Roles('ADMIN')
  reject(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() dto: RejectDepositVoucherDto,
  ): Promise<DepositVoucherResponse> {
    return this.depositsService.rejectVoucher(id, user.id, dto.rejectReason);
  }
}
