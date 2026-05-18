import { Controller, Get, Param, Query } from '@nestjs/common';
import { Content } from '@prisma/client';

import { ListResponse } from '../../common/responses/response.types';
import { ContentsService } from './contents.service';
import { PublicContentQueryDto } from './dto/content-query.dto';

@Controller('contents')
export class ContentsController {
  constructor(private readonly contentsService: ContentsService) {}

  @Get()
  list(@Query() query: PublicContentQueryDto): Promise<ListResponse<Content>> {
    return this.contentsService.listPublic(query);
  }

  @Get(':id')
  detail(@Param('id') id: string): Promise<Content> {
    return this.contentsService.getPublicDetail(id);
  }
}
