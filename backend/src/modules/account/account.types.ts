import {
  DepositVoucherStatus,
  EnterpriseCertificationStatus,
  NotificationChannel,
  NotificationSendStatus,
  NotificationType,
  UserStatus,
} from '@prisma/client';

export interface AccountProfileResponse {
  id: string;
  username: string;
  avatarUrl: string | null;
  statusCode: UserStatus;
  roleCode: string;
  roleName: string;
  enterprise: {
    id: string;
    name: string;
    certificationStatus: string;
    certificationStatusCode: EnterpriseCertificationStatus;
    isBlacklisted: boolean;
  } | null;
}

export interface AccountDepositVoucherResponse {
  id: string;
  lotId: string;
  lotTitle: string | null;
  enterpriseId: string;
  requiredAmount: string;
  paidAmount: string | null;
  status: string;
  statusCode: DepositVoucherStatus;
  submittedAt: Date;
  reviewedAt: Date | null;
  reviewerId: string | null;
  rejectReason: string | null;
}

export interface AccountBidRecordResponse {
  id: string;
  sequenceNo: number;
  lotId: string;
  lotTitle: string | null;
  enterpriseId: string;
  enterpriseName: string;
  maskedEnterpriseName: string;
  amount: string;
  incrementCount: number;
  bidAt: Date;
  isCurrentHighest: boolean;
}

export interface AccountMessageResponse {
  id: string;
  type: string;
  typeCode: NotificationType;
  channel: string;
  channelCode: NotificationChannel;
  receiverEnterpriseId: string;
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
