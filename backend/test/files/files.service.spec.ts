import { AttachmentCategory } from '@prisma/client';

import { FilesService } from '../../src/files/files.service';

const createdAt = new Date('2026-05-17T10:00:00.000Z');

function createPrismaMock() {
  const attachments = [
    {
      id: 'attachment-1',
      category: AttachmentCategory.INSPECTION_REPORT,
      fileName: '检测报告.pdf',
      createdAt,
      lot: { id: 'lot-1', title: '铜精矿竞拍' },
      enterprise: null,
      uploadedBy: { id: 'admin-1', username: 'Admin_01' },
    },
    {
      id: 'attachment-2',
      category: AttachmentCategory.BUSINESS_LICENSE,
      fileName: '营业执照.pdf',
      createdAt,
      lot: null,
      enterprise: { id: 'enterprise-1', name: '华宁铜业有限公司' },
      uploadedBy: null,
    },
  ];

  return {
    attachment: {
      findMany: jest.fn(({ skip = 0, take = attachments.length }) =>
        Promise.resolve(attachments.slice(skip, skip + take)),
      ),
      count: jest.fn(() => Promise.resolve(attachments.length)),
      create: jest.fn((args) =>
        Promise.resolve({
          id: args.data.id,
          category: args.data.category,
          fileName: args.data.fileName,
          fileUrl: args.data.fileUrl,
          mimeType: args.data.mimeType,
          fileSize: args.data.fileSize,
          isSensitive: args.data.isSensitive,
        }),
      ),
      findUnique: jest.fn(),
    },
  };
}

describe('FilesService', () => {
  it('lists attachment records for the admin file manager with minimal pagination', async () => {
    const prisma = createPrismaMock();
    const service = new FilesService(prisma as never);

    const result = await service.listAdmin({ page: 1, pageSize: 1 });

    expect(result).toEqual({
      items: [
        {
          id: 'attachment-1',
          name: '检测报告.pdf',
          type: '检测报告',
          source: '拍品管理',
          uploader: 'Admin_01',
          uploadedAt: createdAt,
          ref: '铜精矿竞拍',
        },
      ],
      total: 2,
      page: 1,
      pageSize: 1,
    });
    expect(prisma.attachment.findMany).toHaveBeenCalledWith({
      include: {
        lot: { select: { id: true, title: true } },
        enterprise: { select: { id: true, name: true } },
        uploadedBy: { select: { id: true, username: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
      skip: 0,
      take: 1,
    });
  });

  it('stores uploaded lot image metadata for form refill', async () => {
    const prisma = createPrismaMock();
    const service = new FilesService(prisma as never);

    const result = await service.upload(
      { category: AttachmentCategory.LOT_IMAGE },
      {
        originalname: 'lot-image.png',
        mimetype: 'image/png',
        size: 8,
        buffer: Buffer.from([
          0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        ]),
      },
      'admin-1',
    );

    expect(result).toEqual(
      expect.objectContaining({
        fileName: 'lot-image.png',
        mimeType: 'image/png',
        fileSize: 8,
        category: AttachmentCategory.LOT_IMAGE,
        isSensitive: false,
      }),
    );
    expect(result.fileUrl).toBe(`/api/files/content/${result.id}`);
    expect(prisma.attachment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: result.id,
        category: AttachmentCategory.LOT_IMAGE,
        fileName: 'lot-image.png',
        fileUrl: result.fileUrl,
        uploadedById: 'admin-1',
      }),
    });
  });

  it('marks uploaded inspection reports as sensitive', async () => {
    const prisma = createPrismaMock();
    const service = new FilesService(prisma as never);

    const result = await service.upload(
      { category: AttachmentCategory.INSPECTION_REPORT },
      {
        originalname: 'inspection.pdf',
        mimetype: 'application/pdf',
        size: 9,
        buffer: Buffer.from('%PDF-1.4\n'),
      },
      'admin-1',
    );

    expect(result.isSensitive).toBe(true);
    expect(prisma.attachment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        category: AttachmentCategory.INSPECTION_REPORT,
        isSensitive: true,
      }),
    });
  });

  it('allows enterprise deposit voucher uploads and marks them as sensitive', async () => {
    const prisma = createPrismaMock();
    const service = new FilesService(prisma as never);

    const result = await service.upload(
      { category: AttachmentCategory.DEPOSIT_VOUCHER },
      {
        originalname: 'deposit-voucher.pdf',
        mimetype: 'application/pdf',
        size: 10,
        buffer: Buffer.from('%PDF-1.4\n'),
      },
      'enterprise-user-1',
      'ENTERPRISE',
    );

    expect(result).toEqual(
      expect.objectContaining({
        fileName: 'deposit-voucher.pdf',
        mimeType: 'application/pdf',
        category: AttachmentCategory.DEPOSIT_VOUCHER,
        isSensitive: true,
      }),
    );
    expect(prisma.attachment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        category: AttachmentCategory.DEPOSIT_VOUCHER,
        isSensitive: true,
        uploadedById: 'enterprise-user-1',
      }),
    });
  });

  it('rejects enterprise uploads outside deposit vouchers', async () => {
    const prisma = createPrismaMock();
    const service = new FilesService(prisma as never);

    await expect(
      service.upload(
        { category: AttachmentCategory.LOT_IMAGE },
        {
          originalname: 'lot-image.png',
          mimetype: 'image/png',
          size: 8,
          buffer: Buffer.from([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
          ]),
        },
        'enterprise-user-1',
        'ENTERPRISE',
      ),
    ).rejects.toThrow('企业账号仅支持上传意向金付款凭证');
  });
});
