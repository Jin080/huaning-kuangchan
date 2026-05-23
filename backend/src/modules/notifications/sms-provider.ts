export const SMS_PROVIDER = 'SMS_PROVIDER';

export type SmsSendStatus = 'SENT' | 'FAILED' | 'SKIPPED';

export interface SmsSendRequest {
  receiverEnterpriseId: string;
  lotId: string;
  content: string;
}

export interface SmsSendResult {
  status: SmsSendStatus;
  message: string;
  sentAt?: Date;
}

export interface SmsProvider {
  send(request: SmsSendRequest): Promise<SmsSendResult>;
}

export class NoopSmsProvider implements SmsProvider {
  async send(): Promise<SmsSendResult> {
    return {
      status: 'SKIPPED',
      message: '短信供应商未配置，未发送',
    };
  }
}
