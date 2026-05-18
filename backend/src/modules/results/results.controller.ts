import { Controller, Get, Param, Query } from '@nestjs/common';

import { ListResponse } from '../../common/responses/response.types';
import { ResultQueryDto } from './dto/result-query.dto';
import { ResultResponse } from './result.types';
import { ResultsService } from './results.service';

@Controller('results')
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Get()
  list(
    @Query() query: ResultQueryDto,
  ): Promise<ListResponse<ResultResponse>> {
    return this.resultsService.listPublic(query);
  }

  @Get(':id')
  detail(@Param('id') id: string): Promise<ResultResponse> {
    return this.resultsService.getPublicDetail(id);
  }
}
