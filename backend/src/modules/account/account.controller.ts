import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { ListResponse } from '../../common/responses/response.types';
import { EnterpriseCertificationDto } from '../enterprises/dto/enterprise-certification.dto';
import { EnterpriseCertificationResponse } from '../enterprises/enterprise-certification.types';
import { EnterprisesService } from '../enterprises/enterprises.service';
import { AccountService } from './account.service';
import {
  AccountBidRecordResponse,
  AccountDepositVoucherResponse,
  AccountMessageResponse,
  AccountProfileResponse,
} from './account.types';
import { AccountListQueryDto } from './dto/account-query.dto';

@Controller('account')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ENTERPRISE')
export class AccountController {
  constructor(
    private readonly enterprisesService: EnterprisesService,
    private readonly accountService: AccountService,
  ) {}

  @Get('profile')
  profile(@CurrentUser() user: CurrentUser): Promise<AccountProfileResponse> {
    return this.accountService.getProfile(user.id);
  }

  @Get('certification')
  certification(
    @CurrentUser() user: CurrentUser,
  ): Promise<EnterpriseCertificationResponse | { status: string; statusCode: string }> {
    return this.enterprisesService.getMyCertification(user.id);
  }

  @Put('certification')
  updateCertification(
    @CurrentUser() user: CurrentUser,
    @Body() dto: EnterpriseCertificationDto,
  ): Promise<EnterpriseCertificationResponse> {
    return this.enterprisesService.resubmitMyCertification(user.id, dto);
  }

  @Get('deposit-vouchers')
  depositVouchers(
    @CurrentUser() user: CurrentUser,
    @Query() query: AccountListQueryDto,
  ): Promise<ListResponse<AccountDepositVoucherResponse>> {
    return this.accountService.listDepositVouchers(user.id, query);
  }

  @Get('bids')
  bids(
    @CurrentUser() user: CurrentUser,
    @Query() query: AccountListQueryDto,
  ): Promise<ListResponse<AccountBidRecordResponse>> {
    return this.accountService.listBids(user.id, query);
  }

  @Get('messages')
  messages(
    @CurrentUser() user: CurrentUser,
    @Query() query: AccountListQueryDto,
  ): Promise<ListResponse<AccountMessageResponse>> {
    return this.accountService.listMessages(user.id, query);
  }

  @Post('messages/:id/read')
  readMessage(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
  ): Promise<AccountMessageResponse> {
    return this.accountService.markMessageRead(user.id, id);
  }
}
