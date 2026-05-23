import { Inject, Injectable } from '@nestjs/common';
import { AttachmentCategory, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import { AppError } from '../common/errors/app-error';
import { ERROR_CODES } from '../common/errors/error-codes';
import { createListResponse } from '../common/responses/response.helpers';
import { ListResponse } from '../common/responses/response.types';
import { PrismaService } from '../prisma/prisma.service';
import { FileQueryDto } from './dto/file-query.dto';
import { FileUploadDto } from './dto/file-upload.dto';
import {
  AdminFileResponse,
  FileUploadResponse,
  UploadedFilePayload,
} from './files.types';

type AttachmentWithRelations = {
  id: string;
  category: AttachmentCategory;
  fileName: string;
  createdAt: Date;
  lot: { id: string; title: string } | null;
  enterprise: { id: string; name: string } | null;
  uploadedBy: { id: string; username: string } | null;
};

type PrismaServiceLike = {
  attachment: {
    findMany(args: Prisma.AttachmentFindManyArgs): Promise<AttachmentWithRelations[]>;
    count(args: Prisma.AttachmentCountArgs): Promise<number>;
    create(args: Prisma.AttachmentCreateArgs): Promise<{
      id: string;
      category: AttachmentCategory;
      fileName: string;
      fileUrl: string;
      mimeType: string | null;
      fileSize: number | null;
      isSensitive: boolean;
    }>;
    findUnique(args: Prisma.AttachmentFindUniqueArgs): Promise<{
      id: string;
      fileName: string;
      fileUrl: string;
      mimeType: string | null;
      isSensitive: boolean;
      storagePath?: string;
    } | null>;
  };
};

const categoryLabels: Record<AttachmentCategory, string> = {
  LOT_IMAGE: '拍品图片',
  INSPECTION_REPORT: '检测报告',
  ENTERPRISE_QUALIFICATION: '企业资质',
  ENTERPRISE_AUTHORIZATION: '授权材料',
  BUSINESS_LICENSE: '营业执照',
  DEPOSIT_VOUCHER: '意向金凭证',
  CONTENT_IMAGE: '内容图片',
  OTHER: '其他',
};

const uploadRoot = path.resolve(process.cwd(), 'tmp', 'uploads');
const uploadPathPrefix = '/api/files/content/';
const allowedUploadCategories: AttachmentCategory[] = [
  AttachmentCategory.LOT_IMAGE,
  AttachmentCategory.INSPECTION_REPORT,
  AttachmentCategory.ENTERPRISE_QUALIFICATION,
  AttachmentCategory.ENTERPRISE_AUTHORIZATION,
  AttachmentCategory.BUSINESS_LICENSE,
  AttachmentCategory.DEPOSIT_VOUCHER,
  AttachmentCategory.OTHER,
];
const enterpriseUploadCategories = new Set<AttachmentCategory>([
  AttachmentCategory.ENTERPRISE_QUALIFICATION,
  AttachmentCategory.ENTERPRISE_AUTHORIZATION,
  AttachmentCategory.BUSINESS_LICENSE,
  AttachmentCategory.DEPOSIT_VOUCHER,
]);
const registerMaterialCategories = new Set<AttachmentCategory>([
  AttachmentCategory.ENTERPRISE_QUALIFICATION,
  AttachmentCategory.ENTERPRISE_AUTHORIZATION,
  AttachmentCategory.BUSINESS_LICENSE,
]);
const sensitiveCategories = new Set<AttachmentCategory>([
  AttachmentCategory.INSPECTION_REPORT,
  AttachmentCategory.ENTERPRISE_QUALIFICATION,
  AttachmentCategory.ENTERPRISE_AUTHORIZATION,
  AttachmentCategory.BUSINESS_LICENSE,
  AttachmentCategory.DEPOSIT_VOUCHER,
  AttachmentCategory.OTHER,
]);
const extensionByMimeType: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf',
};

@Injectable()
export class FilesService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaServiceLike,
  ) {}

  async listAdmin(
    query: FileQueryDto,
  ): Promise<ListResponse<AdminFileResponse>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const [items, total] = await Promise.all([
      this.prisma.attachment.findMany({
        include: {
          lot: { select: { id: true, title: true } },
          enterprise: { select: { id: true, name: true } },
          uploadedBy: { select: { id: true, username: true } },
        },
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.attachment.count({}),
    ]);

    return createListResponse(
      items.map((item) => this.toAdminResponse(item)),
      total,
      page,
      pageSize,
    );
  }

  async upload(
    dto: FileUploadDto,
    file: UploadedFilePayload | undefined,
    uploadedById: string,
    uploadedByRole = 'ADMIN',
  ): Promise<FileUploadResponse> {
    this.assertCanUpload(dto.category, uploadedByRole);
    return this.storeUploadedFile(dto, file, {
      uploadedById,
      lotId: dto.lotId,
      enterpriseId: dto.enterpriseId,
    });
  }

  async uploadRegisterMaterial(
    dto: FileUploadDto,
    file: UploadedFilePayload | undefined,
  ): Promise<FileUploadResponse> {
    if (!registerMaterialCategories.has(dto.category)) {
      throw new AppError(
        ERROR_CODES.FORBIDDEN,
        '注册前仅支持上传企业认证材料',
        403,
      );
    }

    return this.storeUploadedFile(dto, file, {
      uploadedById: null,
      lotId: null,
      enterpriseId: null,
    });
  }

  async getStoredFile(
    id: string,
  ): Promise<{ path: string; fileName: string; mimeType: string | null }> {
    return this.getStoredAttachmentFile(id);
  }

  async getPublicStoredFile(
    id: string,
  ): Promise<{ path: string; fileName: string; mimeType: string | null }> {
    return this.getStoredAttachmentFile(id, true);
  }

  private async getStoredAttachmentFile(
    id: string,
    publicOnly = false,
  ): Promise<{ path: string; fileName: string; mimeType: string | null }> {
    const attachment = await this.prisma.attachment.findUnique({
      where: { id },
      select: {
        id: true,
        fileName: true,
        fileUrl: true,
        mimeType: true,
        isSensitive: true,
      },
    });

    if (!attachment?.fileUrl.startsWith(uploadPathPrefix)) {
      throw new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        '附件文件不存在',
        404,
      );
    }

    if (publicOnly && attachment.isSensitive) {
      throw new AppError(
        ERROR_CODES.FILE_FORBIDDEN,
        '附件无查看权限',
        403,
      );
    }

    return {
      path: path.join(uploadRoot, `${attachment.id}${extensionByMimeType[attachment.mimeType ?? ''] ?? ''}`),
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
    };
  }

  private toAdminResponse(
    attachment: AttachmentWithRelations,
  ): AdminFileResponse {
    return {
      id: attachment.id,
      name: attachment.fileName,
      type: categoryLabels[attachment.category],
      source: this.getSource(attachment),
      uploader: attachment.uploadedBy?.username ?? '',
      uploadedAt: attachment.createdAt,
      ref: attachment.lot?.title ?? attachment.enterprise?.name ?? '',
    };
  }

  private getSource(attachment: AttachmentWithRelations): string {
    if (attachment.category === AttachmentCategory.DEPOSIT_VOUCHER) {
      return '意向金审核';
    }

    if (attachment.lot) {
      return '拍品管理';
    }

    if (attachment.enterprise) {
      return '企业认证';
    }

    return '文件管理';
  }

  private assertCanUpload(category: AttachmentCategory, uploadedByRole: string): void {
    if (!allowedUploadCategories.includes(category)) {
      throw new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        '暂不支持该附件类型上传',
      );
    }

    if (uploadedByRole === 'ENTERPRISE' && !enterpriseUploadCategories.has(category)) {
      throw new AppError(
        ERROR_CODES.FORBIDDEN,
        '企业账号仅支持上传企业认证材料或意向金付款凭证',
        403,
      );
    }
  }

  private assertValidFile(
    file: UploadedFilePayload | undefined,
  ): asserts file is UploadedFilePayload {
    if (!file) {
      throw new AppError(ERROR_CODES.INTERNAL_ERROR, '请选择上传文件');
    }

    if (!extensionByMimeType[file.mimetype]) {
      throw new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        '仅支持 JPG、PNG 图片或 PDF 文件',
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      throw new AppError(ERROR_CODES.INTERNAL_ERROR, '文件大小不能超过 10MB');
    }
  }

  private async storeUploadedFile(
    dto: FileUploadDto,
    file: UploadedFilePayload | undefined,
    owner: {
      uploadedById: string | null;
      lotId?: string | null;
      enterpriseId?: string | null;
    },
  ): Promise<FileUploadResponse> {
    this.assertValidFile(file);

    const id = randomUUID();
    const storedFileName = `${id}${extensionByMimeType[file.mimetype]}`;
    const storagePath = path.join(uploadRoot, storedFileName);

    await fs.mkdir(uploadRoot, { recursive: true });
    await fs.writeFile(storagePath, file.buffer);

    const attachment = await this.prisma.attachment.create({
      data: {
        id,
        category: dto.category,
        fileName: file.originalname,
        fileUrl: `${uploadPathPrefix}${id}`,
        mimeType: file.mimetype,
        fileSize: file.size,
        isSensitive: sensitiveCategories.has(dto.category),
        lotId: owner.lotId,
        enterpriseId: owner.enterpriseId,
        uploadedById: owner.uploadedById,
      },
    });

    return this.toUploadResponse(attachment);
  }

  private toUploadResponse(attachment: {
    id: string;
    category: AttachmentCategory;
    fileName: string;
    fileUrl: string;
    mimeType: string | null;
    fileSize: number | null;
    isSensitive: boolean;
  }): FileUploadResponse {
    return {
      id: attachment.id,
      fileName: attachment.fileName,
      fileUrl: attachment.fileUrl,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
      category: attachment.category,
      isSensitive: attachment.isSensitive,
    };
  }
}
