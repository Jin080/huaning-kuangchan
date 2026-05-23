import {
  DepositVoucherStatus,
  EnterpriseCertificationStatus,
  NotificationChannel,
  NotificationSendStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';

import { AccountService } from '../../src/modules/account/account.service';

function decimal(value: string): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function createPrismaMock() {
  const enterprise = {
    id: 'enterprise-1',
    name: '华宁铜业有限公司',
    certificationStatus: EnterpriseCertificationStatus.APPROVED,
    isBlacklisted: false,
  };
  const user = {
    id: 'user-1',
    username: 'huaning',
    avatarUrl: null,
    status: 'ACTIVE',
    role: { code: 'ENTERPRISE', name: '企业用户' },
    enterprise,
  };
  const depositVouchers = [
    {
      id: 'voucher-1',
      lotId: 'lot-1',
      enterpriseId: 'enterprise-1',
      requiredAmount: decimal('50000'),
      paidAmount: decimal('50000'),
      status: DepositVoucherStatus.APPROVED,
      submittedAt: new Date('2026-05-17T08:00:00.000Z'),
      reviewedAt: null,
      reviewerId: null,
      rejectReason: null,
      attachmentId: 'attachment-1',
      attachment: {
        id: 'attachment-1',
        fileName: '付款凭证.pdf',
        fileUrl: '/api/files/content/attachment-1',
      },
      lot: { id: 'lot-1', title: '铜精矿竞拍' },
    },
    {
      id: 'voucher-2',
      lotId: 'lot-2',
      enterpriseId: 'enterprise-2',
      requiredAmount: decimal('30000'),
      paidAmount: null,
      status: DepositVoucherStatus.PENDING,
      submittedAt: new Date('2026-05-17T09:00:00.000Z'),
      reviewedAt: null,
      reviewerId: null,
      rejectReason: null,
      lot: { id: 'lot-2', title: '铅锌矿竞拍' },
    },
  ];
  const bids = [
    {
      id: 'bid-1',
      sequenceNo: 1,
      lotId: 'lot-1',
      enterpriseId: 'enterprise-1',
      enterpriseName: '华宁铜业有限公司',
      maskedEnterpriseName: '华***司',
      amount: decimal('1300'),
      incrementCount: 1,
      bidAt: new Date('2026-05-17T09:00:00.000Z'),
      isCurrentHighest: true,
      lot: { id: 'lot-1', title: '铜精矿竞拍' },
    },
    {
      id: 'bid-2',
      sequenceNo: 1,
      lotId: 'lot-2',
      enterpriseId: 'enterprise-2',
      enterpriseName: '易门矿业有限公司',
      maskedEnterpriseName: '易***司',
      amount: decimal('1600'),
      incrementCount: 1,
      bidAt: new Date('2026-05-17T09:30:00.000Z'),
      isCurrentHighest: true,
      lot: { id: 'lot-2', title: '铅锌矿竞拍' },
    },
  ];
  const notifications = [
    {
      id: 'message-1',
      type: NotificationType.WIN,
      channel: NotificationChannel.IN_APP,
      receiverEnterpriseId: 'enterprise-1',
      lotId: 'lot-1',
      lotTitle: '铜精矿竞拍',
      content: '您参与的铜精矿竞拍已结束，已中标，请办理签约与尾款手续。',
      sendStatus: NotificationSendStatus.PENDING,
      sentAt: null,
      readAt: null,
      createdAt: new Date('2026-05-17T10:00:00.000Z'),
      updatedAt: new Date('2026-05-17T10:00:00.000Z'),
      lot: { id: 'lot-1', title: '铜精矿竞拍' },
    },
    {
      id: 'message-2',
      type: NotificationType.LOSE,
      channel: NotificationChannel.IN_APP,
      receiverEnterpriseId: 'enterprise-2',
      lotId: 'lot-2',
      lotTitle: '铅锌矿竞拍',
      content: '您参与的铅锌矿竞拍已结束，未中标，保证金将退回。',
      sendStatus: NotificationSendStatus.PENDING,
      sentAt: null,
      readAt: null,
      createdAt: new Date('2026-05-17T10:30:00.000Z'),
      updatedAt: new Date('2026-05-17T10:30:00.000Z'),
      lot: { id: 'lot-2', title: '铅锌矿竞拍' },
    },
    {
      id: 'sms-1',
      type: NotificationType.WIN,
      channel: NotificationChannel.SMS,
      receiverEnterpriseId: 'enterprise-1',
      lotId: 'lot-1',
      lotTitle: '铜精矿竞拍',
      content:
        '短信供应商未配置，未发送。您参与的铜精矿竞拍已结束，已中标，请办理签约与尾款手续。',
      sendStatus: NotificationSendStatus.FAILED,
      sentAt: null,
      readAt: null,
      createdAt: new Date('2026-05-17T10:01:00.000Z'),
      updatedAt: new Date('2026-05-17T10:01:00.000Z'),
      lot: { id: 'lot-1', title: '铜精矿竞拍' },
    },
  ];

  return {
    user,
    depositVouchers,
    bids,
    notifications,
    prisma: {
      user: {
        findUnique: jest.fn(({ where }) =>
          Promise.resolve(where.id === user.id ? user : null),
        ),
      },
      depositVoucher: {
        findMany: jest.fn(({ where, skip = 0, take = 10 }) =>
          Promise.resolve(
            depositVouchers
              .filter((item) => item.enterpriseId === where.enterpriseId)
              .slice(skip, skip + take),
          ),
        ),
        count: jest.fn(({ where }) =>
          Promise.resolve(
            depositVouchers.filter(
              (item) => item.enterpriseId === where.enterpriseId,
            ).length,
          ),
        ),
      },
      bidRecord: {
        findMany: jest.fn(({ where, skip = 0, take = 10 }) =>
          Promise.resolve(
            bids
              .filter((item) => item.enterpriseId === where.enterpriseId)
              .slice(skip, skip + take),
          ),
        ),
        count: jest.fn(({ where }) =>
          Promise.resolve(
            bids.filter((item) => item.enterpriseId === where.enterpriseId)
              .length,
          ),
        ),
      },
      notification: {
        findMany: jest.fn(({ where, skip = 0, take = 10 }) =>
          Promise.resolve(
            notifications
              .filter(
                (item) =>
                  item.receiverEnterpriseId === where.receiverEnterpriseId &&
                  (!where.channel || item.channel === where.channel),
              )
              .slice(skip, skip + take),
          ),
        ),
        count: jest.fn(({ where }) =>
          Promise.resolve(
            notifications.filter(
              (item) =>
                item.receiverEnterpriseId === where.receiverEnterpriseId &&
                (!where.channel || item.channel === where.channel),
            ).length,
          ),
        ),
        findFirst: jest.fn(({ where }) =>
          Promise.resolve(
            notifications.find(
              (item) =>
                item.id === where.id &&
                item.receiverEnterpriseId === where.receiverEnterpriseId,
            ) ?? null,
          ),
        ),
        update: jest.fn(({ where, data }) => {
          const item = notifications.find(
            (notification) => notification.id === where.id,
          );

          if (!item) {
            return Promise.resolve(null);
          }

          Object.assign(item, data, { updatedAt: new Date() });
          return Promise.resolve(item);
        }),
      },
    },
  };
}

describe('AccountService', () => {
  it('returns current account profile with bound enterprise', async () => {
    const { prisma } = createPrismaMock();
    const service = new AccountService(prisma as never);

    const result = await service.getProfile('user-1');

    expect(result).toEqual(
      expect.objectContaining({
        id: 'user-1',
        username: 'huaning',
        roleCode: 'ENTERPRISE',
        enterprise: expect.objectContaining({
          id: 'enterprise-1',
          name: '华宁铜业有限公司',
          certificationStatusCode: EnterpriseCertificationStatus.APPROVED,
        }),
      }),
    );
  });

  it('lists only current enterprise deposit vouchers', async () => {
    const { prisma } = createPrismaMock();
    const service = new AccountService(prisma as never);

    const result = await service.listDepositVouchers('user-1', {
      page: 1,
      pageSize: 10,
    });

    expect(prisma.depositVoucher.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { enterpriseId: 'enterprise-1' },
        include: { lot: true, attachment: true },
      }),
    );
    expect(result.items.map((item: { id: string }) => item.id)).toEqual([
      'voucher-1',
    ]);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        lotTitle: '铜精矿竞拍',
        status: '审核通过',
        attachmentId: 'attachment-1',
        voucherFileName: '付款凭证.pdf',
        voucherFileUrl: '/api/files/content/attachment-1',
      }),
    );
  });

  it('lists only current enterprise bids with real enterprise name', async () => {
    const { prisma } = createPrismaMock();
    const service = new AccountService(prisma as never);

    const result = await service.listBids('user-1', {
      page: 1,
      pageSize: 10,
    });

    expect(prisma.bidRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { enterpriseId: 'enterprise-1' },
      }),
    );
    expect(result.items).toEqual([
      expect.objectContaining({
        id: 'bid-1',
        enterpriseName: '华宁铜业有限公司',
        maskedEnterpriseName: '华***司',
      }),
    ]);
  });

  it('lists only current enterprise messages', async () => {
    const { prisma } = createPrismaMock();
    const service = new AccountService(prisma as never);

    const result = await service.listMessages('user-1', {
      page: 1,
      pageSize: 10,
    });

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          receiverEnterpriseId: 'enterprise-1',
          channel: NotificationChannel.IN_APP,
        },
      }),
    );
    expect(result.items.map((item: { id: string }) => item.id)).toEqual([
      'message-1',
    ]);
  });

  it('marks only current enterprise message as read', async () => {
    const { prisma } = createPrismaMock();
    const service = new AccountService(prisma as never);

    const result = await service.markMessageRead('user-1', 'message-1');

    expect(prisma.notification.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'message-1',
        receiverEnterpriseId: 'enterprise-1',
      },
    });
    expect(result.readAt).toBeInstanceOf(Date);
  });

  it('rejects marking another enterprise message as read', async () => {
    const { prisma } = createPrismaMock();
    const service = new AccountService(prisma as never);

    await expect(
      service.markMessageRead('user-1', 'message-2'),
    ).rejects.toMatchObject({
      status: 404,
    });

    expect(prisma.notification.update).not.toHaveBeenCalled();
  });
});
