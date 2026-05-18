import { Inject, Injectable } from '@nestjs/common';
import { AttachmentCategory, Prisma } from '@prisma/client';

import { createListResponse } from '../common/responses/response.helpers';
import { ListResponse } from '../common/responses/response.types';
import { PrismaService } from '../prisma/prisma.service';
import { FileQueryDto } from './dto/file-query.dto';
import { AdminFileResponse } from './files.types';

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
  };
};

const categoryLabels: Record<AttachmentCategory, string> = {
  LOT_IMAGE: '拍品图片',
  INSPECTION_REPORT: '检测报告',
  ENTERPRISE_QUALIFICATION: '企业资质',
  BUSINESS_LICENSE: '营业执照',
  DEPOSIT_VOUCHER: '意向金凭证',
  CONTENT_IMAGE: '内容图片',
  OTHER: '其他',
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
}
