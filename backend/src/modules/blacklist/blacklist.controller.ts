import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { ListResponse } from '../../common/responses/response.types';
import { BlacklistResponse } from './blacklist.types';
import { BlacklistService } from './blacklist.service';
import {
  BlacklistQueryDto,
  CreateBlacklistDto,
  ReleaseBlacklistDto,
} from './dto/blacklist.dto';

@Controller('admin/blacklist')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class BlacklistController {
  constructor(private readonly blacklistService: BlacklistService) {}

  @Get()
  list(
    @Query() query: BlacklistQueryDto,
  ): Promise<ListResponse<BlacklistResponse>> {
    return this.blacklistService.list(query);
  }

  @Post()
  blacklist(
    @Body() body: CreateBlacklistDto,
    @CurrentUser() user: CurrentUser,
  ): Promise<BlacklistResponse> {
    return this.blacklistService.blacklist(body, user.id);
  }

  @Post(':id/release')
  release(
    @Param('id') id: string,
    @Body() body: ReleaseBlacklistDto,
    @CurrentUser() user: CurrentUser,
  ): Promise<BlacklistResponse> {
    return this.blacklistService.release(id, body, user.id);
  }
}
