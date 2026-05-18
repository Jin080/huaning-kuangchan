import {
  NotificationChannel,
  NotificationSendStatus,
  NotificationType,
} from '@prisma/client';

export interface NotificationResponse {
  id: string;
  type: string;
  typeCode: NotificationType;
  channel: string;
  channelCode: NotificationChannel;
  receiverEnterpriseId: string;
  receiverEnterpriseName: string;
  lotId: string | null;
  lotTitle: string;
  content: string;
  sendStatus: string;
  sendStatusCode: NotificationSendStatus;
  sentAt: Date | null;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
