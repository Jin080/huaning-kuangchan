import { HttpStatus, Injectable } from '@nestjs/common';
import { Attachment, Prisma } from '@prisma/client';

import { AppError } from '../common/errors/app-error';
import { ERROR_CODES } from '../common/errors/error-codes';
import { PrismaService } from '../prisma/prisma.service';

export interface FileUploadPolicy {
  maxSizeBytes: number;
  allowedMimeTypes: string[];
}

export interface FileAccessUser {
  id: string;
  role: string;
}

export interface FileAccessResponse {
  id: string;
  category: string;
  fileName: string;
  fileUrl: string;
  mimeType: string | null;
  fileSize: number | null;
  isSensitive: boolean;
}

@Injectable()
export class FilePolicyService {
  constructor(private readonly prisma: PrismaService) {}

  readonly defaultPolicy: FileUploadPolicy = {
    maxSizeBytes: 10 * 1024 * 1024,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  };

  assertCanAccess(canAccess: boolean): void {
    if (!canAccess) {
      throw new AppError(
        ERROR_CODES.FILE_FORBIDDEN,
        '附件无查看权限',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  async getAccessibleFile(
    attachmentId: string,
    user: FileAccessUser,
  ): Promise<FileAccessResponse> {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
    });

    if (!attachment) {
      throw new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        '附件不存在',
        HttpStatus.NOT_FOUND,
      );
    }

    this.assertCanAccess(await this.canAccess(attachment, user));

    return {
      id: attachment.id,
      category: attachment.category,
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
      isSensitive: attachment.isSensitive,
    };
  }

  private async canAccess(
    attachment: Pick<
      Attachment,
      'isSensitive' | 'enterpriseId' | 'uploadedById'
    >,
    user: FileAccessUser,
  ): Promise<boolean> {
    if (!attachment.isSensitive) {
      return true;
    }

    if (user.role === 'ADMIN' || attachment.uploadedById === user.id) {
      return true;
    }

    if (user.role !== 'ENTERPRISE' || !attachment.enterpriseId) {
      return false;
    }

    const requester = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { enterpriseId: true },
    } satisfies Prisma.UserFindUniqueArgs);

    return requester?.enterpriseId === attachment.enterpriseId;
  }
}
