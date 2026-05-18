import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { ListResponse } from '../../common/responses/response.types';
import { ContractResponse } from './contract.types';
import { ContractsService } from './contracts.service';
import { ContractQueryDto } from './dto/contract-query.dto';

@Controller('admin/contracts')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  list(
    @Query() query: ContractQueryDto,
  ): Promise<ListResponse<ContractResponse>> {
    return this.contractsService.list(query);
  }

  @Post(':id/mark-signed')
  markSigned(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUser,
  ): Promise<ContractResponse> {
    return this.contractsService.markSigned(id, user.id);
  }

  @Post(':id/mark-completed')
  markCompleted(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUser,
  ): Promise<ContractResponse> {
    return this.contractsService.markCompleted(id, user.id);
  }

  @Post(':id/mark-defaulted')
  markDefaulted(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUser,
  ): Promise<ContractResponse> {
    return this.contractsService.markDefaulted(id, user.id);
  }
}
