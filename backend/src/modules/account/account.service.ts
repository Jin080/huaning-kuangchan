import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import {
  BidRecord,
  DepositVoucher,
  DepositVoucherStatus,
  Enterprise,
  EnterpriseCertificationStatus,
  Attachment,
  Lot,
  Notification,
  NotificationChannel,
  NotificationSendStatus,
  NotificationType,
  Prisma,
  Role,
  User,
} from '@prisma/client';

import { AppError } from '../../common/errors/app-error';
import { ERROR_CODES } from '../../common/errors/error-codes';
import { createListResponse } from '../../common/responses/response.helpers';
import { ListResponse } from '../../common/responses/response.types';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountListQueryDto } from './dto/account-query.dto';
import {
  AccountBidRecordResponse,
  AccountDepositVoucherResponse,
  AccountMessageResponse,
  AccountProfileResponse,
} from './account.types';

const ENTERPRISE_STATUS_LABELS: Record<EnterpriseCertificationStatus, string> = {
  [EnterpriseCertificationStatus.NOT_SUBMITTED]: '未提交',
  [EnterpriseCertificationStatus.PENDING]: '待审核',
  [EnterpriseCertificationStatus.APPROVED]: '审核通过',
  [EnterpriseCertificationStatus.REJECTED]: '审核驳回',
};

const DEPOSIT_STATUS_LABELS: Record<DepositVoucherStatus, string> = {
  [DepositVoucherStatus.NOT_SUBMITTED]: '未提交',
  [DepositVoucherStatus.PENDING]: '待审核',
  [DepositVoucherStatus.APPROVED]: '审核通过',
  [DepositVoucherStatus.REJECTED]: '审核驳回',
};

const MESSAGE_TYPE_LABELS: Record<NotificationType, string> = {
  [NotificationType.WIN]: '成交通知',
  [NotificationType.LOSE]: '失败通知',
};

const MESSAGE_CHANNEL_LABELS: Record<NotificationChannel, string> = {
  [NotificationChannel.IN_APP]: '站内消息',
  [NotificationChannel.SMS]: '短信',
};

const MESSAGE_SEND_STATUS_LABELS: Record<NotificationSendStatus, string> = {
  [NotificationSendStatus.PENDING]: '待发送',
  [NotificationSendStatus.SENT]: '已发送',
  [NotificationSendStatus.FAILED]: '发送失败',
};

type UserWithRelations = User & {
  role: Pick<Role, 'code' | 'name'>;
  enterprise: Pick<
    Enterprise,
    'id' | 'name' | 'certificationStatus' | 'isBlacklisted'
  > | null;
};

type DepositVoucherWithLot = DepositVoucher & {
  lot: Pick<Lot, 'id' | 'title'>;
  attachment: Pick<Attachment, 'id' | 'fileName' | 'fileUrl'>;
};

type BidRecordWithLot = BidRecord & {
  lot: Pick<Lot, 'id' | 'title'>;
};

type NotificationWithLot = Notification & {
  lot: Pick<Lot, 'id' | 'title'> | null;
};

type PrismaServiceLike = {
  user: {
    findUnique(args: Prisma.UserFindUniqueArgs): Promise<UserWithRelations | null>;
  };
  depositVoucher: {
    findMany(args: Prisma.DepositVoucherFindManyArgs): Promise<DepositVoucherWithLot[]>;
    count(args: Prisma.DepositVoucherCountArgs): Promise<number>;
  };
  bidRecord: {
    findMany(args: Prisma.BidRecordFindManyArgs): Promise<BidRecordWithLot[]>;
    count(args: Prisma.BidRecordCountArgs): Promise<number>;
  };
  notification: {
    findMany(args: Prisma.NotificationFindManyArgs): Promise<NotificationWithLot[]>;
    count(args: Prisma.NotificationCountArgs): Promise<number>;
    findFirst(args: Prisma.NotificationFindFirstArgs): Promise<NotificationWithLot | null>;
    update(args: Prisma.NotificationUpdateArgs): Promise<NotificationWithLot>;
  };
};

@Injectable()
export class AccountService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaServiceLike,
  ) {}

  async getProfile(userId: string): Promise<AccountProfileResponse> {
    const user = await this.getUser(userId);

    return {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      statusCode: user.status,
      roleCode: user.role.code,
      roleName: user.role.name,
      enterprise: user.enterprise
        ? {
            id: user.enterprise.id,
            name: user.enterprise.name,
            certificationStatus:
              ENTERPRISE_STATUS_LABELS[user.enterprise.certificationStatus],
            certificationStatusCode: user.enterprise.certificationStatus,
            isBlacklisted: user.enterprise.isBlacklisted,
          }
        : null,
    };
  }

  async listDepositVouchers(
    userId: string,
    query: AccountListQueryDto,
  ): Promise<ListResponse<AccountDepositVoucherResponse>> {
    const enterpriseId = await this.getEnterpriseId(userId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    if (!enterpriseId) {
      return createListResponse([], 0, page, pageSize);
    }

    const where = { enterpriseId };
    const [items, total] = await Promise.all([
      this.prisma.depositVoucher.findMany({
        where,
        include: { lot: true, attachment: true },
        orderBy: [{ submittedAt: 'desc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.depositVoucher.count({ where }),
    ]);

    return createListResponse(
      items.map((item) => this.toDepositVoucherResponse(item)),
      total,
      page,
      pageSize,
    );
  }

  async listBids(
    userId: string,
    query: AccountListQueryDto,
  ): Promise<ListResponse<AccountBidRecordResponse>> {
    const enterpriseId = await this.getEnterpriseId(userId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    if (!enterpriseId) {
      return createListResponse([], 0, page, pageSize);
    }

    const where = { enterpriseId };
    const [items, total] = await Promise.all([
      this.prisma.bidRecord.findMany({
        where,
        include: { lot: true },
        orderBy: [{ bidAt: 'desc' }, { sequenceNo: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.bidRecord.count({ where }),
    ]);

    return createListResponse(
      items.map((item) => this.toBidResponse(item)),
      total,
      page,
      pageSize,
    );
  }

  async listMessages(
    userId: string,
    query: AccountListQueryDto,
  ): Promise<ListResponse<AccountMessageResponse>> {
    const enterpriseId = await this.getEnterpriseId(userId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;

    if (!enterpriseId) {
      return createListResponse([], 0, page, pageSize);
    }

    const where = { receiverEnterpriseId: enterpriseId };
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: { lot: true },
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return createListResponse(
      items.map((item) => this.toMessageResponse(item)),
      total,
      page,
      pageSize,
    );
  }

  async markMessageRead(
    userId: string,
    messageId: string,
  ): Promise<AccountMessageResponse> {
    const enterpriseId = await this.getEnterpriseId(userId);

    if (!enterpriseId) {
      throw new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        '通知不存在',
        HttpStatus.NOT_FOUND,
      );
    }

    const message = await this.prisma.notification.findFirst({
      where: {
        id: messageId,
        receiverEnterpriseId: enterpriseId,
      },
    });

    if (!message) {
      throw new AppError(
        ERROR_CODES.INTERNAL_ERROR,
        '通知不存在',
        HttpStatus.NOT_FOUND,
      );
    }

    if (message.readAt) {
      return this.toMessageResponse(message);
    }

    const updated = await this.prisma.notification.update({
      where: { id: message.id },
      data: { readAt: new Date() },
    });

    return this.toMessageResponse(updated);
  }

  private async getEnterpriseId(userId: string): Promise<string | null> {
    const user = await this.getUser(userId);

    return user.enterprise?.id ?? null;
  }

  private async getUser(userId: string): Promise<UserWithRelations> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true, enterprise: true },
    });

    if (!user) {
      throw new AppError(
        ERROR_CODES.UNAUTHORIZED,
        '未登录',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return user;
  }

  private toDepositVoucherResponse(
    voucher: DepositVoucherWithLot,
  ): AccountDepositVoucherResponse {
    return {
      id: voucher.id,
      lotId: voucher.lotId,
      lotTitle: voucher.lot?.title ?? null,
      enterpriseId: voucher.enterpriseId,
      attachmentId: voucher.attachmentId,
      voucherFileName: voucher.attachment.fileName,
      voucherFileUrl: voucher.attachment.fileUrl,
      requiredAmount: voucher.requiredAmount.toString(),
      paidAmount: voucher.paidAmount?.toString() ?? null,
      status: DEPOSIT_STATUS_LABELS[voucher.status],
      statusCode: voucher.status,
      submittedAt: voucher.submittedAt,
      reviewedAt: voucher.reviewedAt,
      reviewerId: voucher.reviewerId,
      rejectReason: voucher.rejectReason,
    };
  }

  private toBidResponse(bid: BidRecordWithLot): AccountBidRecordResponse {
    return {
      id: bid.id,
      sequenceNo: bid.sequenceNo,
      lotId: bid.lotId,
      lotTitle: bid.lot?.title ?? null,
      enterpriseId: bid.enterpriseId,
      enterpriseName: bid.enterpriseName,
      maskedEnterpriseName: bid.maskedEnterpriseName,
      amount: bid.amount.toString(),
      incrementCount: bid.incrementCount,
      bidAt: bid.bidAt,
      isCurrentHighest: bid.isCurrentHighest,
    };
  }

  private toMessageResponse(
    notification: NotificationWithLot,
  ): AccountMessageResponse {
    return {
      id: notification.id,
      type: MESSAGE_TYPE_LABELS[notification.type],
      typeCode: notification.type,
      channel: MESSAGE_CHANNEL_LABELS[notification.channel],
      channelCode: notification.channel,
      receiverEnterpriseId: notification.receiverEnterpriseId,
      lotId: notification.lotId,
      lotTitle: notification.lot?.title ?? notification.lotTitle,
      content: notification.content,
      sendStatus: MESSAGE_SEND_STATUS_LABELS[notification.sendStatus],
      sendStatusCode: notification.sendStatus,
      sentAt: notification.sentAt,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }
}
