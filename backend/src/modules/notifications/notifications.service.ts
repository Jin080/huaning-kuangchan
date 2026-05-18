import { Inject, Injectable } from '@nestjs/common';
import {
  Enterprise,
  Lot,
  Notification,
  NotificationChannel,
  NotificationSendStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';

import { createListResponse } from '../../common/responses/response.helpers';
import { ListResponse } from '../../common/responses/response.types';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationQueryDto } from './dto/notification-query.dto';
import { NotificationResponse } from './notification.types';

const TYPE_LABELS: Record<NotificationType, string> = {
  [NotificationType.WIN]: '成交通知',
  [NotificationType.LOSE]: '失败通知',
};

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  [NotificationChannel.IN_APP]: '站内消息',
  [NotificationChannel.SMS]: '短信',
};

const SEND_STATUS_LABELS: Record<NotificationSendStatus, string> = {
  [NotificationSendStatus.PENDING]: '待发送',
  [NotificationSendStatus.SENT]: '已发送',
  [NotificationSendStatus.FAILED]: '发送失败',
};

type NotificationWithRelations = Notification & {
  receiverEnterprise: Pick<Enterprise, 'id' | 'name'>;
  lot: Pick<Lot, 'id' | 'title'> | null;
};

type PrismaServiceLike = {
  notification: {
    findMany(args: Prisma.NotificationFindManyArgs): Promise<NotificationWithRelations[]>;
    count(args: Prisma.NotificationCountArgs): Promise<number>;
  };
};

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(PrismaService)
    private readonly prisma: PrismaServiceLike,
  ) {}

  async list(
    query: NotificationQueryDto,
  ): Promise<ListResponse<NotificationResponse>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 10;
    const where = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.sendStatus ? { sendStatus: query.sendStatus } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: { receiverEnterprise: true, lot: true },
        orderBy: [{ createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return createListResponse(
      items.map((item) => this.toResponse(item)),
      total,
      page,
      pageSize,
    );
  }

  private toResponse(notification: NotificationWithRelations): NotificationResponse {
    return {
      id: notification.id,
      type: TYPE_LABELS[notification.type],
      typeCode: notification.type,
      channel: CHANNEL_LABELS[notification.channel],
      channelCode: notification.channel,
      receiverEnterpriseId: notification.receiverEnterpriseId,
      receiverEnterpriseName: notification.receiverEnterprise.name,
      lotId: notification.lotId,
      lotTitle: notification.lot?.title ?? notification.lotTitle,
      content: notification.content,
      sendStatus: SEND_STATUS_LABELS[notification.sendStatus],
      sendStatusCode: notification.sendStatus,
      sentAt: notification.sentAt,
      readAt: notification.readAt,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }
}
