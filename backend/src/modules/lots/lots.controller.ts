import { Controller, Get, Param, Query } from '@nestjs/common';

import { ListResponse } from '../../common/responses/response.types';
import { LotQueryDto } from './dto/lot-query.dto';
import { LotDetailResponse, LotResponse } from './lot.types';
import { LotsService } from './lots.service';

@Controller('lots')
export class LotsController {
  constructor(private readonly lotsService: LotsService) {}

  @Get()
  list(@Query() query: LotQueryDto): Promise<ListResponse<LotResponse>> {
    return this.lotsService.listPublic(query);
  }

  @Get(':id')
  detail(@Param('id') id: string): Promise<LotDetailResponse> {
    return this.lotsService.getPublicDetail(id);
  }
}
