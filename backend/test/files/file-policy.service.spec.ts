import { AttachmentCategory } from '@prisma/client';

import { FilePolicyService } from '../../src/files/file-policy.service';

function createPrismaMock() {
  const attachment = {
    id: 'contract-attachment-1',
    category: AttachmentCategory.OTHER,
    fileName: '合同扫描件.pdf',
    fileUrl: '/api/files/content/contract-attachment-1',
    mimeType: 'application/pdf',
    fileSize: 2048,
    isSensitive: true,
    enterpriseId: 'enterprise-1',
    uploadedById: 'admin-1',
  };

  return {
    attachment: {
      findUnique: jest.fn(({ where }) =>
        Promise.resolve(where.id === attachment.id ? attachment : null),
      ),
    },
    user: {
      findUnique: jest.fn(({ where }) =>
        Promise.resolve({
          enterpriseId:
            where.id === 'owner-user-1' ? 'enterprise-1' : 'enterprise-2',
        }),
      ),
    },
  };
}

describe('FilePolicyService', () => {
  it('allows only admins or the owning enterprise to access sensitive contract attachments', async () => {
    const prisma = createPrismaMock();
    const service = new FilePolicyService(prisma as never);

    await expect(
      service.getAccessibleFile('contract-attachment-1', {
        id: 'owner-user-1',
        role: 'ENTERPRISE',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'contract-attachment-1',
        isSensitive: true,
      }),
    );

    await expect(
      service.getAccessibleFile('contract-attachment-1', {
        id: 'stranger-user-1',
        role: 'ENTERPRISE',
      }),
    ).rejects.toMatchObject({
      code: 'FILE_FORBIDDEN',
      status: 403,
    });

    await expect(
      service.getAccessibleFile('contract-attachment-1', {
        id: 'admin-2',
        role: 'ADMIN',
      }),
    ).resolves.toEqual(expect.objectContaining({ id: 'contract-attachment-1' }));
  });
});
