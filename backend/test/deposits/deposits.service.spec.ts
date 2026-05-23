import {
  DepositVoucherStatus,
  EnterpriseCertificationStatus,
  LotStatus,
} from '@prisma/client';

import { DepositsService } from '../../src/modules/deposits/deposits.service';

describe('DepositsService', () => {
  function createService() {
    const prisma = {
      enterprise: {
        findFirst: jest.fn(),
      },
      lot: {
        findUnique: jest.fn(),
      },
      attachment: {
        create: jest.fn(),
      },
      depositVoucher: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
      },
    };
    const logs = {
      record: jest.fn(),
    };

    return {
      service: new DepositsService(prisma as never, logs as never),
      prisma,
      logs,
    };
  }

  it('submits a deposit voucher only after enterprise certification is approved', async () => {
    const { service, prisma } = createService();
    prisma.enterprise.findFirst.mockResolvedValue({
      id: 'enterprise-1',
      certificationStatus: EnterpriseCertificationStatus.APPROVED,
    });
    prisma.lot.findUnique.mockResolvedValue({
      id: 'lot-1',
      depositAmount: { toString: () => '50000' },
      status: LotStatus.ANNOUNCING,
      biddingEndAt: new Date(Date.now() + 60_000),
    });
    prisma.attachment.create.mockResolvedValue({ id: 'attachment-1' });
    prisma.depositVoucher.upsert.mockResolvedValue({
      id: 'voucher-1',
      lotId: 'lot-1',
      enterpriseId: 'enterprise-1',
      requiredAmount: { toString: () => '50000' },
      paidAmount: { toString: () => '50000' },
      status: DepositVoucherStatus.PENDING,
      rejectReason: null,
    });

    const result = await service.submitVoucher('user-1', 'lot-1', {
      voucherFileName: '付款凭证.pdf',
      voucherFileUrl: 'https://files.example.com/deposit.pdf',
      paidAmount: '50000',
    });

    expect(prisma.depositVoucher.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          lotId_enterpriseId: {
            lotId: 'lot-1',
            enterpriseId: 'enterprise-1',
          },
        },
        create: expect.objectContaining({
          status: DepositVoucherStatus.PENDING,
          attachmentId: 'attachment-1',
        }),
      }),
    );
    expect(result.status).toBe('待审核');
  });

  it('accepts voucher submission while a lot is already bidding and not ended', async () => {
    const { service, prisma } = createService();
    prisma.enterprise.findFirst.mockResolvedValue({
      id: 'enterprise-1',
      certificationStatus: EnterpriseCertificationStatus.APPROVED,
    });
    prisma.lot.findUnique.mockResolvedValue({
      id: 'lot-1',
      depositAmount: { toString: () => '50000' },
      status: LotStatus.BIDDING,
      biddingEndAt: new Date(Date.now() + 60_000),
    });
    prisma.attachment.create.mockResolvedValue({ id: 'attachment-1' });
    prisma.depositVoucher.upsert.mockResolvedValue({
      id: 'voucher-1',
      lotId: 'lot-1',
      enterpriseId: 'enterprise-1',
      requiredAmount: { toString: () => '50000' },
      paidAmount: { toString: () => '50000' },
      status: DepositVoucherStatus.PENDING,
      rejectReason: null,
    });

    const result = await service.submitVoucher('user-1', 'lot-1', {
      voucherFileName: '付款凭证.pdf',
      voucherFileUrl: 'https://files.example.com/deposit.pdf',
      paidAmount: '50000',
    });

    expect(result.status).toBe('待审核');
  });

  it('rejects voucher submission after bidding has ended', async () => {
    const { service, prisma } = createService();
    prisma.enterprise.findFirst.mockResolvedValue({
      id: 'enterprise-1',
      certificationStatus: EnterpriseCertificationStatus.APPROVED,
    });
    prisma.lot.findUnique.mockResolvedValue({
      id: 'lot-1',
      depositAmount: { toString: () => '50000' },
      status: LotStatus.BIDDING,
      biddingEndAt: new Date(Date.now() - 60_000),
    });

    await expect(
      service.submitVoucher('user-1', 'lot-1', {
        voucherFileName: '付款凭证.pdf',
        voucherFileUrl: 'https://files.example.com/deposit.pdf',
      }),
    ).rejects.toMatchObject({
      code: 'AUCTION_ENDED',
    });
    expect(prisma.attachment.create).not.toHaveBeenCalled();
  });

  it('rejects voucher submission when enterprise certification is not approved', async () => {
    const { service, prisma } = createService();
    prisma.enterprise.findFirst.mockResolvedValue({
      id: 'enterprise-1',
      certificationStatus: EnterpriseCertificationStatus.PENDING,
    });

    await expect(
      service.submitVoucher('user-1', 'lot-1', {
        voucherFileName: '付款凭证.pdf',
        voucherFileUrl: 'https://files.example.com/deposit.pdf',
      }),
    ).rejects.toMatchObject({
      code: 'ENTERPRISE_CERTIFICATION_PENDING',
    });
  });

  it('approves a voucher and exposes bidding qualification', async () => {
    const { service, prisma } = createService();
    prisma.depositVoucher.findUnique.mockResolvedValue({
      id: 'voucher-1',
      lotId: 'lot-1',
      enterpriseId: 'enterprise-1',
      status: DepositVoucherStatus.PENDING,
    });
    prisma.depositVoucher.update.mockResolvedValue({
      id: 'voucher-1',
      lotId: 'lot-1',
      enterpriseId: 'enterprise-1',
      requiredAmount: { toString: () => '50000' },
      paidAmount: null,
      status: DepositVoucherStatus.APPROVED,
      rejectReason: null,
    });
    prisma.enterprise.findFirst.mockResolvedValue({
      id: 'enterprise-1',
      certificationStatus: EnterpriseCertificationStatus.APPROVED,
    });
    prisma.depositVoucher.findFirst.mockResolvedValue({
      id: 'voucher-1',
      status: DepositVoucherStatus.APPROVED,
    });

    const review = await service.approveVoucher('voucher-1', 'admin-1');
    const qualified = await service.hasBiddingQualification(
      'enterprise-1',
      'lot-1',
    );

    expect(review.status).toBe('审核通过');
    expect(qualified).toBe(true);
  });

  it('lists deposit vouchers for review with enterprise and lot names', async () => {
    const { service, prisma } = createService();
    prisma.depositVoucher.findMany.mockResolvedValue([
      {
        id: 'voucher-1',
        lotId: 'lot-1',
        enterpriseId: 'enterprise-1',
        requiredAmount: { toString: () => '50000' },
        paidAmount: { toString: () => '50000' },
        status: DepositVoucherStatus.PENDING,
        submittedAt: new Date('2026-05-17T10:00:00.000Z'),
        reviewedAt: null,
        reviewerId: null,
        rejectReason: null,
        attachmentId: 'attachment-1',
        attachment: {
          id: 'attachment-1',
          fileName: '付款凭证.pdf',
          fileUrl: 'https://files.example.com/deposit.pdf',
        },
        enterprise: { name: '华宁矿业有限公司' },
        lot: { title: '高品位磷矿石' },
      },
    ]);

    const result = await service.listForReview();

    expect(prisma.depositVoucher.findMany).toHaveBeenCalledWith({
      include: {
        attachment: { select: { id: true, fileName: true, fileUrl: true } },
        enterprise: { select: { name: true } },
        lot: { select: { title: true } },
      },
      orderBy: [{ submittedAt: 'desc' }, { updatedAt: 'desc' }],
    });
    expect(result[0]).toMatchObject({
      enterpriseId: 'enterprise-1',
      enterpriseName: '华宁矿业有限公司',
      lotId: 'lot-1',
      lotTitle: '高品位磷矿石',
      attachmentId: 'attachment-1',
      voucherFileName: '付款凭证.pdf',
      voucherFileUrl: 'https://files.example.com/deposit.pdf',
    });
  });
});
