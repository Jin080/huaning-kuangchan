import {
  AttachmentCategory,
  EnterpriseCertificationStatus,
  NotificationChannel,
  NotificationSendStatus,
  NotificationType,
} from '@prisma/client';

import { EnterprisesService } from '../../src/modules/enterprises/enterprises.service';

describe('EnterprisesService', () => {
  const now = new Date('2026-05-17T09:00:00.000Z');

  function createService() {
    const prisma = {
      role: {
        findUnique: jest.fn(),
      },
      enterprise: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
      },
      attachment: {
        createMany: jest.fn(),
        findMany: jest.fn(),
      },
      notification: {
        create: jest.fn(),
      },
    };
    const prismaWithTransaction = {
      ...prisma,
      $transaction: jest.fn(
        async (callback: (client: typeof prisma) => Promise<unknown>) =>
          callback(prisma),
      ),
    };
    const logs = {
      record: jest.fn(),
    };
    const passwordService = {
      hash: jest.fn(),
    };

    return {
      service: new EnterprisesService(prismaWithTransaction as never, logs as never, passwordService as never),
      prisma: prismaWithTransaction,
      logs,
      passwordService,
    };
  }

  const certificationInput = {
    name: '华宁矿业贸易有限公司',
    contactPerson: '张三',
    contactPhone: '13800000000',
    mainCategory: '矿产品',
    legalRepresentative: '李四',
    legalRepresentativeIdNo: '530000199001010000',
    email: 'company@example.com',
    userCategory: '企业',
    userType: '采购商',
    registeredCapital: '1000.00',
    region: '云南省玉溪市华宁县',
    address: '宁州街道 1 号',
    unifiedSocialCreditCode: '91530400MA0000000X',
    companyProfile: '主营矿产品贸易',
    businessScope: '矿产品采购与销售',
    paymentBankAccount: '6222000000000000',
    paymentAccountName: '华宁矿业贸易有限公司',
    paymentBankName: '中国银行华宁支行',
    paymentBankLineNo: '104000000000',
    paymentIsBankOfChina: true,
    receivingBankAccount: '6222111111111111',
    receivingAccountName: '华宁矿业贸易有限公司',
    receivingBankName: '中国银行华宁支行',
    receivingBankLineNo: '104000000001',
    receivingIsBankOfChina: true,
    agreementAccepted: true,
    qualificationFileUrl: 'https://files.example.com/qualification.pdf',
    businessLicenseFileUrl: 'https://files.example.com/license.pdf',
    authorizationMaterialUrl: 'https://files.example.com/authorization.pdf',
  };

  it('registers a public enterprise account with credentials and certification materials', async () => {
    const { service, prisma, passwordService } = createService();
    prisma.role.findUnique.mockResolvedValue({ id: 'role-enterprise', code: 'ENTERPRISE' });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.enterprise.findUnique.mockResolvedValue(null);
    passwordService.hash.mockResolvedValue('hashed-password');
    prisma.enterprise.create.mockResolvedValue({
      id: 'enterprise-1',
      certificationStatus: EnterpriseCertificationStatus.PENDING,
      ...certificationInput,
      registeredCapital: { toString: () => '1000' },
      certificationSubmittedAt: now,
      certificationRejectReason: null,
    });
    prisma.user.create.mockResolvedValue({ id: 'user-1' });
    prisma.attachment.findMany.mockResolvedValue([
      {
        id: 'attachment-license',
        enterpriseId: 'enterprise-1',
        category: AttachmentCategory.BUSINESS_LICENSE,
        fileName: 'license.pdf',
        fileUrl: 'https://files.example.com/license.pdf',
      },
      {
        id: 'attachment-qualification',
        enterpriseId: 'enterprise-1',
        category: AttachmentCategory.ENTERPRISE_QUALIFICATION,
        fileName: 'qualification.pdf',
        fileUrl: 'https://files.example.com/qualification.pdf',
      },
      {
        id: 'attachment-authorization',
        enterpriseId: 'enterprise-1',
        category: AttachmentCategory.ENTERPRISE_AUTHORIZATION,
        fileName: 'authorization.pdf',
        fileUrl: 'https://files.example.com/authorization.pdf',
      },
    ]);

    const result = await service.registerEnterprise({
      username: 'enterprise_user',
      password: 'enterprise123456',
      confirmPassword: 'enterprise123456',
      ...certificationInput,
    });

    expect(passwordService.hash).toHaveBeenCalledWith('enterprise123456');
    expect(prisma.enterprise.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          certificationStatus: EnterpriseCertificationStatus.PENDING,
          unifiedSocialCreditCode: certificationInput.unifiedSocialCreditCode,
        }),
      }),
    );
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          username: 'enterprise_user',
          passwordHash: 'hashed-password',
          roleId: 'role-enterprise',
          enterpriseId: 'enterprise-1',
        }),
      }),
    );
    expect(prisma.attachment.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          category: AttachmentCategory.BUSINESS_LICENSE,
          fileName: '营业执照',
          fileUrl: 'https://files.example.com/license.pdf',
          enterpriseId: 'enterprise-1',
          uploadedById: 'user-1',
        }),
        expect.objectContaining({
          category: AttachmentCategory.ENTERPRISE_AUTHORIZATION,
          fileName: '授权材料',
          fileUrl: 'https://files.example.com/authorization.pdf',
          enterpriseId: 'enterprise-1',
          uploadedById: 'user-1',
        }),
      ]),
    });
    expect(result.status).toBe('待审核');
    expect(result.materials).toHaveLength(3);
  });

  it('does not fail public registration when operation logging is unavailable', async () => {
    const { service, prisma, logs, passwordService } = createService();
    prisma.role.findUnique.mockResolvedValue({ id: 'role-enterprise', code: 'ENTERPRISE' });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.enterprise.findUnique.mockResolvedValue(null);
    passwordService.hash.mockResolvedValue('hashed-password');
    prisma.enterprise.create.mockResolvedValue({
      id: 'enterprise-1',
      certificationStatus: EnterpriseCertificationStatus.PENDING,
      ...certificationInput,
      registeredCapital: { toString: () => '1000' },
      certificationSubmittedAt: now,
      certificationRejectReason: null,
    });
    prisma.user.create.mockResolvedValue({ id: 'user-1' });
    prisma.attachment.findMany.mockResolvedValue([]);
    logs.record.mockRejectedValue(new Error('log unavailable'));

    await expect(
      service.registerEnterprise({
        username: 'enterprise_user',
        password: 'enterprise123456',
        confirmPassword: 'enterprise123456',
        ...certificationInput,
      }),
    ).resolves.toMatchObject({
      status: '待审核',
      id: 'enterprise-1',
    });
  });

  it.each([
    ['username', 'enterprise_user', '用户名'],
    ['unifiedSocialCreditCode', '91530400MA0000000X', '统一社会信用代码'],
  ])('rejects duplicate %s during public registration', async (field, value, label) => {
    const { service, prisma } = createService();
    prisma.role.findUnique.mockResolvedValue({ id: 'role-enterprise', code: 'ENTERPRISE' });
    prisma.user.findUnique.mockResolvedValue(field === 'username' ? { id: 'user-1' } : null);
    prisma.enterprise.findUnique.mockResolvedValue(field === 'unifiedSocialCreditCode' ? { id: 'enterprise-1' } : null);

    const dto = {
      username: field === 'username' ? value : 'enterprise_user',
      password: 'enterprise123456',
      confirmPassword: 'enterprise123456',
      ...certificationInput,
      unifiedSocialCreditCode: field === 'unifiedSocialCreditCode' ? value : certificationInput.unifiedSocialCreditCode,
    };

    await expect(
      service.registerEnterprise(dto),
    ).rejects.toMatchObject({
      code: 'INTERNAL_ERROR',
      message: expect.stringContaining(label),
      status: 409,
    });
  });

  it('submits a new enterprise certification and binds it to the current user', async () => {
    const { service, prisma } = createService();
    prisma.enterprise.findFirst.mockResolvedValue(null);
    prisma.attachment.findMany.mockResolvedValue([
      {
        id: 'attachment-license',
        enterpriseId: 'enterprise-1',
        category: AttachmentCategory.BUSINESS_LICENSE,
        fileName: 'license.pdf',
        fileUrl: 'https://files.example.com/license.pdf',
      },
      {
        id: 'attachment-qualification',
        enterpriseId: 'enterprise-1',
        category: AttachmentCategory.ENTERPRISE_QUALIFICATION,
        fileName: 'qualification.pdf',
        fileUrl: 'https://files.example.com/qualification.pdf',
      },
      {
        id: 'attachment-authorization',
        enterpriseId: 'enterprise-1',
        category: AttachmentCategory.ENTERPRISE_AUTHORIZATION,
        fileName: 'authorization.pdf',
        fileUrl: 'https://files.example.com/authorization.pdf',
      },
    ]);
    prisma.enterprise.create.mockResolvedValue({
      id: 'enterprise-1',
      certificationStatus: EnterpriseCertificationStatus.PENDING,
      ...certificationInput,
      registeredCapital: { toString: () => '1000' },
      certificationSubmittedAt: now,
      certificationRejectReason: null,
    });

    const result = await service.submitCertification('user-1', certificationInput);

    expect(prisma.enterprise.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          certificationStatus: EnterpriseCertificationStatus.PENDING,
          certificationRejectReason: null,
          unifiedSocialCreditCode: certificationInput.unifiedSocialCreditCode,
        }),
      }),
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { enterpriseId: 'enterprise-1' },
    });
    expect(prisma.attachment.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({
          category: AttachmentCategory.ENTERPRISE_AUTHORIZATION,
          fileName: '授权材料',
          fileUrl: 'https://files.example.com/authorization.pdf',
          isSensitive: true,
          enterpriseId: 'enterprise-1',
          uploadedById: 'user-1',
        }),
      ]),
    });
    expect(result.status).toBe('待审核');
    expect(result.materials).toEqual([
      {
        id: 'attachment-license',
        category: AttachmentCategory.BUSINESS_LICENSE,
        label: '营业执照',
        fileName: 'license.pdf',
        fileUrl: 'https://files.example.com/license.pdf',
      },
      {
        id: 'attachment-qualification',
        category: AttachmentCategory.ENTERPRISE_QUALIFICATION,
        label: '企业资质',
        fileName: 'qualification.pdf',
        fileUrl: 'https://files.example.com/qualification.pdf',
      },
      {
        id: 'attachment-authorization',
        category: AttachmentCategory.ENTERPRISE_AUTHORIZATION,
        label: '授权材料',
        fileName: 'authorization.pdf',
        fileUrl: 'https://files.example.com/authorization.pdf',
      },
    ]);
  });

  it('allows rejected certification to be resubmitted by the same enterprise', async () => {
    const { service, prisma } = createService();
    prisma.enterprise.findFirst.mockResolvedValue({
      id: 'enterprise-1',
      certificationStatus: EnterpriseCertificationStatus.REJECTED,
    });
    prisma.attachment.findMany.mockResolvedValue([]);
    prisma.enterprise.update.mockResolvedValue({
      id: 'enterprise-1',
      certificationStatus: EnterpriseCertificationStatus.PENDING,
      ...certificationInput,
      registeredCapital: null,
      certificationSubmittedAt: now,
      certificationRejectReason: null,
    });

    const result = await service.resubmitMyCertification(
      'user-1',
      certificationInput,
    );

    expect(prisma.enterprise.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'enterprise-1' },
        data: expect.objectContaining({
          certificationStatus: EnterpriseCertificationStatus.PENDING,
          certificationReviewerId: null,
          certificationRejectReason: null,
        }),
      }),
    );
    expect(result.status).toBe('待审核');
  });

  it('returns submitted certification materials for admin review list', async () => {
    const { service, prisma } = createService();
    prisma.enterprise.findMany.mockResolvedValue([
      {
        id: 'enterprise-1',
        certificationStatus: EnterpriseCertificationStatus.PENDING,
        ...certificationInput,
        registeredCapital: null,
        certificationSubmittedAt: now,
        certificationRejectReason: null,
      },
    ]);
    prisma.attachment.findMany.mockResolvedValue([
      {
        id: 'attachment-license',
        enterpriseId: 'enterprise-1',
        category: AttachmentCategory.BUSINESS_LICENSE,
        fileName: '营业执照',
        fileUrl: 'https://files.example.com/license.pdf',
      },
      {
        id: 'attachment-authorization',
        enterpriseId: 'enterprise-1',
        category: AttachmentCategory.ENTERPRISE_AUTHORIZATION,
        fileName: '授权材料',
        fileUrl: 'https://files.example.com/authorization.pdf',
      },
    ]);

    const result = await service.listForReview();

    expect(prisma.attachment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: {
            in: expect.arrayContaining([
              AttachmentCategory.ENTERPRISE_AUTHORIZATION,
            ]),
          },
        }),
      }),
    );
    expect(result[0].materials).toEqual([
      {
        id: 'attachment-license',
        category: AttachmentCategory.BUSINESS_LICENSE,
        label: '营业执照',
        fileName: '营业执照',
        fileUrl: 'https://files.example.com/license.pdf',
      },
      {
        id: 'attachment-authorization',
        category: AttachmentCategory.ENTERPRISE_AUTHORIZATION,
        label: '授权材料',
        fileName: '授权材料',
        fileUrl: 'https://files.example.com/authorization.pdf',
      },
    ]);
  });

  it('records enterprise rejection reason during admin review', async () => {
    const { service, prisma } = createService();
    prisma.attachment.findMany.mockResolvedValue([]);
    prisma.enterprise.findUnique.mockResolvedValue({
      id: 'enterprise-1',
      certificationStatus: EnterpriseCertificationStatus.PENDING,
    });
    prisma.enterprise.update.mockResolvedValue({
      id: 'enterprise-1',
      certificationStatus: EnterpriseCertificationStatus.REJECTED,
      ...certificationInput,
      registeredCapital: null,
      certificationSubmittedAt: now,
      certificationRejectReason: '营业执照不清晰',
    });

    const result = await service.rejectCertification(
      'enterprise-1',
      'admin-1',
      '营业执照不清晰',
    );

    expect(prisma.enterprise.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'enterprise-1' },
        data: expect.objectContaining({
          certificationStatus: EnterpriseCertificationStatus.REJECTED,
          certificationReviewerId: 'admin-1',
          certificationRejectReason: '营业执照不清晰',
        }),
      }),
    );
    expect(result.status).toBe('审核驳回');
    expect(result.rejectReason).toBe('营业执照不清晰');
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: NotificationType.LOSE,
        channel: NotificationChannel.IN_APP,
        receiverEnterpriseId: 'enterprise-1',
        lotTitle: '企业认证审核驳回',
        content: expect.stringContaining('企业认证审核驳回'),
        sendStatus: NotificationSendStatus.PENDING,
      }),
    });
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        content: expect.stringContaining('营业执照不清晰'),
      }),
    });
  });
});
