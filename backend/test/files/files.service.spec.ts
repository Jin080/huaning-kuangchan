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
});
