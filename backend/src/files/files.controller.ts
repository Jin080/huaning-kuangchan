import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ListResponse } from '../common/responses/response.types';
import { FileQueryDto } from './dto/file-query.dto';
import {
  FileAccessResponse,
  FilePolicyService,
} from './file-policy.service';
import { FilesService } from './files.service';
import { AdminFileResponse } from './files.types';

@Controller()
@UseGuards(AuthGuard, RolesGuard)
@Roles('ADMIN', 'ENTERPRISE')
export class FilesController {
  constructor(
    private readonly filePolicyService: FilePolicyService,
    private readonly filesService: FilesService,
  ) {}

  @Get('admin/files')
  @Roles('ADMIN')
  listAdmin(
    @Query() query: FileQueryDto,
  ): Promise<ListResponse<AdminFileResponse>> {
    return this.filesService.listAdmin(query);
  }

  @Get('files/:id')
  getFile(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
  ): Promise<FileAccessResponse> {
    return this.filePolicyService.getAccessibleFile(id, user);
  }
}
