import { EnterpriseCertificationStatus } from '@prisma/client';

import { EnterprisesService } from '../../src/modules/enterprises/enterprises.service';

describe('EnterprisesService', () => {
  const now = new Date('2026-05-17T09:00:00.000Z');

  function createService() {
    const prisma = {
      enterprise: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: {
        update: jest.fn(),
      },
      attachment: {
        createMany: jest.fn(),
      },
    };
    const logs = {
      record: jest.fn(),
    };

    return {
      service: new EnterprisesService(prisma as never, logs as never),
      prisma,
      logs,
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
  };

  it('submits a new enterprise certification and binds it to the current user', async () => {
    const { service, prisma } = createService();
    prisma.enterprise.findFirst.mockResolvedValue(null);
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
    expect(result.status).toBe('待审核');
  });

  it('allows rejected certification to be resubmitted by the same enterprise', async () => {
    const { service, prisma } = createService();
    prisma.enterprise.findFirst.mockResolvedValue({
      id: 'enterprise-1',
      certificationStatus: EnterpriseCertificationStatus.REJECTED,
    });
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

  it('records enterprise rejection reason during admin review', async () => {
    const { service, prisma } = createService();
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
  });
});
