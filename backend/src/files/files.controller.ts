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
export class FilesController {
  constructor(
    private readonly filePolicyService: FilePolicyService,
    private readonly filesService: FilesService,
  ) {}

  @Get('admin/files')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  listAdmin(
    @Query() query: FileQueryDto,
  ): Promise<ListResponse<AdminFileResponse>> {
    return this.filesService.listAdmin(query);
  }

  @Post('files/upload')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'ENTERPRISE')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  upload(
    @Body() body: FileUploadDto,
    @UploadedFile() file: UploadedFilePayload | undefined,
    @CurrentUser() user: CurrentUser,
  ): Promise<FileUploadResponse> {
    return this.filesService.upload(body, file, user.id, user.role);
  }

  @Post('files/register-materials/upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadRegisterMaterial(
    @Body() body: FileUploadDto,
    @UploadedFile() file: UploadedFilePayload | undefined,
  ): Promise<FileUploadResponse> {
    return this.filesService.uploadRegisterMaterial(body, file);
  }

  @Get('files/content/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'ENTERPRISE')
  async getFileContent(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Res() response: FileContentResponse,
  ): Promise<void> {
    await this.filePolicyService.getAccessibleFile(id, user);
    const file = await this.filesService.getStoredFile(id);

    this.sendStoredFile(response, file);
  }

  @Get('files/public/:id')
  async getPublicFileContent(
    @Param('id') id: string,
    @Res() response: FileContentResponse,
  ): Promise<void> {
    const file = await this.filesService.getPublicStoredFile(id);

    this.sendStoredFile(response, file);
  }

  private sendStoredFile(
    response: FileContentResponse,
    file: { path: string; fileName: string; mimeType: string | null },
  ): void {
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
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'ENTERPRISE')
  getFile(
    @CurrentUser() user: CurrentUser,
    @Param('id') id: string,
  ): Promise<FileAccessResponse> {
    return this.filePolicyService.getAccessibleFile(id, user);
  }
}
