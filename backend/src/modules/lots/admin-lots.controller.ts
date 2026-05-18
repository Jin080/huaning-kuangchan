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
import { LotMutationDto } from './dto/lot-mutation.dto';
import { LotQueryDto } from './dto/lot-query.dto';
import { LotResponse } from './lot.types';
import { LotsService } from './lots.service';

@Controller('admin/lots')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminLotsController {
  constructor(private readonly lotsService: LotsService) {}

  @Get()
  list(@Query() query: LotQueryDto): Promise<ListResponse<LotResponse>> {
    return this.lotsService.listAdmin(query);
  }

  @Post()
  create(
    @Body() body: LotMutationDto,
    @CurrentUser() user: CurrentUser,
  ): Promise<LotResponse> {
    return this.lotsService.createDraft(body, user.id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: LotMutationDto,
  ): Promise<LotResponse> {
    return this.lotsService.updateDraft(id, body);
  }

  @Post(':id/submit-review')
  submitReview(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUser,
  ): Promise<LotResponse> {
    return this.lotsService.submitReview(id, user.id);
  }

  @Post(':id/close')
  close(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUser,
  ): Promise<LotResponse> {
    return this.lotsService.close(id, user.id);
  }

  @Post(':id/advance-to-bidding')
  advanceToBidding(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUser,
  ): Promise<LotResponse> {
    return this.lotsService.advanceToBidding(id, user.id);
  }
}
