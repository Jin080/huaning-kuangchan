import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

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
import { FileUploadDto } from './dto/file-upload.dto';
import { FilesService } from './files.service';
import {
  AdminFileResponse,
  FileUploadResponse,
  UploadedFilePayload,
} from './files.types';

interface FileContentResponse {
  setHeader(name: string, value: string): void;
  sendFile(path: string): void;
}

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

  @Post('files/upload')
  @Roles('ADMIN')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  upload(
    @Body() body: FileUploadDto,
    @UploadedFile() file: UploadedFilePayload | undefined,
    @CurrentUser() user: CurrentUser,
  ): Promise<FileUploadResponse> {
    return this.filesService.upload(body, file, user.id);
  }

  @Get('files/content/:id')
  async getFileContent(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Res() response: FileContentResponse,
  ): Promise<void> {
    await this.filePolicyService.getAccessibleFile(id, user);
    const file = await this.filesService.getStoredFile(id);

    if (file.mimeType) {
      response.setHeader('Content-Type', file.mimeType);
    }
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(file.fileName)}"`,
    );
    response.sendFile(file.path);
  }

  @Get('files/:id')
  getFile(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
  ): Promise<FileAccessResponse> {
    return this.filePolicyService.getAccessibleFile(id, user);
  }
}
