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
import { Content } from '@prisma/client';

import { AuthGuard } from '../../auth/auth.guard';
import { CurrentUser } from '../../auth/current-user.decorator';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { ListResponse } from '../../common/responses/response.types';
import { ContentsService } from './contents.service';
import { CreateContentDto, UpdateContentDto } from './dto/content-mutation.dto';
import { AdminContentQueryDto } from './dto/content-query.dto';

@Controller('admin/contents')
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminContentsController {
  constructor(private readonly contentsService: ContentsService) {}

  @Get()
  list(@Query() query: AdminContentQueryDto): Promise<ListResponse<Content>> {
    return this.contentsService.listAdmin(query);
  }

  @Post()
  create(
    @Body() body: CreateContentDto,
    @CurrentUser() user: CurrentUser,
  ): Promise<Content> {
    return this.contentsService.create(body, user.id);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpdateContentDto,
  ): Promise<Content> {
    return this.contentsService.update(id, body);
  }

  @Post(':id/publish')
  publish(@Param('id') id: string): Promise<Content> {
    return this.contentsService.publish(id);
  }

  @Post(':id/unpublish')
  unpublish(@Param('id') id: string): Promise<Content> {
    return this.contentsService.unpublish(id);
  }
}
