export type StatusTone = 'blue' | 'orange' | 'green' | 'red' | 'gray';

export type Stat = {
  label: string;
  value: string;
  helper?: string;
  tone?: StatusTone;
};

export type TableColumn<T extends object> = {
  key: keyof T | string;
  label: string;
  width?: string;
  render?: (row: T) => React.ReactNode;
};

export type Action = {
  label: string;
  tone?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  to?: string;
  onClick?: () => void;
};

export type LotStatus =
  | '草稿'
  | '待发布复核'
  | '发布驳回'
  | '公示中'
  | '竞拍中'
  | '已结束'
  | '成交公示中'
  | '待签约'
  | '已签约'
  | '已完成'
  | '违约'
  | '已取消';

export type Lot = {
  id: string;
  title: string;
  startPrice: string;
  currentPrice: string;
  quantity: string;
  category: string;
  supplier: string;
  origin: string;
  deposit: string;
  publicityPeriod: string;
  auctionTime: string;
  countdown: string;
  status: LotStatus;
  updatedAt: string;
  productInfo?: string;
  productDetail?: string;
  customerNotice?: string;
  auctionRule?: string;
  depositInstruction?: string;
};

export type Enterprise = {
  id: string;
  name: string;
  contact: string;
  phone: string;
  category: string;
  type: string;
  creditCode: string;
  status: '未提交' | '待审核' | '审核通过' | '审核驳回';
  submittedAt: string;
  rejectReason?: string;
};

export type DepositRecord = {
  id: string;
  lotId: string;
  enterprise: string;
  lotTitle: string;
  amount: string;
  voucher: string;
  status: '未提交' | '待审核' | '审核通过' | '审核驳回';
  submittedAt: string;
  reviewedAt: string;
  rejectReason?: string;
};

export type BidRecord = {
  id: string;
  lotId: string;
  lotTitle: string;
  enterprise: string;
  maskedEnterprise: string;
  amount: string;
  incrementTimes: number;
  bidTime: string;
  isHighest: boolean;
  auctionStatus: string;
};

export type ResultRecord = {
  id: string;
  lotId: string;
  lotTitle: string;
  winner: string;
  finalPrice: string;
  publicTime: string;
  status: '已生成' | '已公示';
};

export type ContractRecord = {
  id: string;
  lotId: string;
  lotTitle: string;
  enterprise: string;
  amount: string;
  status: '待签约' | '已签约' | '已完成' | '违约';
  updatedAt: string;
  operator: string;
};

export type RefundRecord = {
  id: string;
  lotId: string;
  lotTitle: string;
  enterprise: string;
  amount: string;
  status: '未退款' | '审核中' | '已退款';
  updatedAt: string;
  operator: string;
};

export type ContentRecord = {
  id: string;
  title: string;
  category: string;
  categoryCode?: string;
  summary: string;
  body?: string;
  status: '草稿' | '已发布' | '已下架';
  publishedAt: string;
  updatedBy: string;
};

export type NotificationRecord = {
  id: string;
  lotId: string | null;
  type: '成交通知' | '失败通知';
  channel: '站内消息' | '短信';
  enterprise: string;
  lotTitle: string;
  content: string;
  status: '待发送' | '发送成功' | '发送失败';
  sentAt: string;
  read?: boolean;
};

export type AccountProfile = {
  id: string;
  username: string;
  enterpriseName: string;
  certificationStatus: Enterprise['status'];
  isBlacklisted: boolean;
};
