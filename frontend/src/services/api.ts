import {
  bids,
  blacklist,
  contents,
  contracts,
  deposits,
  enterprises,
  files,
  logs,
  lots,
  notifications,
  refunds,
  results,
  stats,
} from '../data/mock';
import type {
  AccountProfile,
  BidRecord,
  ContractRecord,
  ContentRecord,
  DepositRecord,
  Enterprise,
  Lot,
  NotificationRecord,
  RefundRecord,
  ResultRecord,
  Stat,
} from '../types';

type ListResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

type MaybeListResponse<T> = ListResponse<T> | T[];

type ApiLot = {
  id: string;
  title: string;
  startPrice: string;
  quantity: string;
  quantityUnit: string;
  supplier: string;
  origin: string;
  mineralCategory: string | null;
  grade: string | null;
  depositAmount: string;
  bidIncrement: string;
  announcementStartAt: string;
  announcementEndAt: string;
  biddingStartAt: string;
  biddingEndAt: string;
  currentHighestPrice: string | null;
  status: Lot['status'];
  updatedAt: string;
  productInfo?: string;
  productDetail?: string;
  customerNotice?: string;
  auctionRule?: {
    bidIncrement: string;
    biddingStartAt: string;
    biddingEndAt: string;
    extensionEnabled: boolean;
    extensionRule: string | null;
  };
  depositInstruction?: {
    depositRatio: string | null;
    depositAmount: string;
  };
};

type ApiPortalDashboard = {
  currentYearCompletedCount: number;
  currentYearCompletedAmount: string;
  totalCompletedCount: number;
  totalCompletedAmount: string;
};

type ApiResult = {
  id: string;
  lotTitle: string;
  winningEnterpriseName: string;
  finalPrice: string;
  status: ResultRecord['status'];
  publishedAt: string | null;
  generatedAt: string;
};

type ApiContent = {
  id: string;
  title: string;
  category: string;
  summary: string;
  body?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED' | ContentRecord['status'];
  publishedAt: string | null;
};

type ApiPublicBid = {
  id: string;
  sequenceNo: number;
  lotId: string;
  enterpriseName: string;
  maskedEnterpriseName: string;
  amount: string;
  incrementCount: number;
  bidAt: string;
  isCurrentHighest: boolean;
};

type ApiAccountProfile = {
  id: string;
  username: string;
  enterprise: {
    name: string;
    certificationStatus: AccountProfile['certificationStatus'];
    isBlacklisted: boolean;
  } | null;
};

type ApiAccountDeposit = {
  id: string;
  lotTitle: string | null;
  requiredAmount: string;
  paidAmount: string | null;
  status: DepositRecord['status'];
  submittedAt: string;
  reviewedAt: string | null;
  rejectReason: string | null;
};

type ApiAccountBid = {
  id: string;
  lotTitle: string | null;
  enterpriseName: string;
  maskedEnterpriseName: string;
  amount: string;
  incrementCount: number;
  bidAt: string;
  isCurrentHighest: boolean;
};

type ApiAccountMessage = {
  id: string;
  type: NotificationRecord['type'];
  channel: NotificationRecord['channel'];
  lotTitle: string;
  content: string;
  sendStatus: string;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
};

type ApiAdminNotification = ApiAccountMessage & {
  receiverEnterpriseName: string;
};

type ApiEnterprise = {
  id: string;
  name: string;
  contactPerson: string;
  contactPhone: string;
  mainCategory: string;
  userCategory: string;
  userType: string;
  unifiedSocialCreditCode: string;
  status: Enterprise['status'];
  submittedAt: string | null;
  rejectReason: string | null;
};

type ApiAdminDeposit = {
  id: string;
  lotId: string;
  lotTitle?: string | null;
  enterpriseId: string;
  enterpriseName?: string | null;
  requiredAmount: string;
  paidAmount: string | null;
  status: DepositRecord['status'];
  submittedAt?: string;
  reviewedAt?: string | null;
  rejectReason: string | null;
};

type ApiAdminBid = {
  id: string;
  sequenceNo: number;
  lotTitle: string | null;
  enterpriseName: string;
  maskedEnterpriseName: string;
  amount: string;
  incrementCount: number;
  bidAt: string;
  isCurrentHighest: boolean;
};

type ApiContract = {
  id: string;
  lotTitle: string;
  enterpriseName: string;
  finalPrice: string;
  status: ContractRecord['status'];
  updatedAt: string;
};

type ApiRefund = {
  id: string;
  lotTitle: string;
  enterpriseName: string;
  amount: string;
  status: RefundRecord['status'];
  updatedAt: string;
};

type ApiBlacklist = {
  id: string;
  enterpriseId: string;
  enterpriseName: string;
  lotId: string | null;
  lotTitle: string | null;
  reason: string;
  operatorId: string | null;
  blacklistedAt: string;
  releasedAt: string | null;
  releaseReason: string | null;
  isActive: boolean;
};

type BlacklistRecord = (typeof blacklist)[number];
type FileRecord = (typeof files)[number];
type LogRecord = (typeof logs)[number];

type ApiAdminFile = {
  id: string;
  name: string;
  type: string;
  source: string;
  uploader: string;
  uploadedAt: string;
  ref: string;
};

type ApiAdminLog = {
  id: string;
  operatorId: string | null;
  operatorUsername: string | null;
  action: string;
  targetType: string;
  targetId: string | null;
  summary: string;
  createdAt: string;
};

export type LotMutationPayload = {
  title: string;
  imageOneUrl: string;
  imageTwoUrl: string;
  startPrice: string;
  quantity: string;
  quantityUnit?: string;
  supplier: string;
  origin: string;
  deadlineAt: string;
  deliveryMethod: string;
  productInfo: string;
  productDetail: string;
  inspectionReportUrl: string;
  email: string;
  phone?: string;
  mineralCategory?: string;
  grade?: string;
  assessedPrice?: string;
  depositRatio?: string;
  depositAmount: string;
  bidIncrement: string;
  announcementStartAt: string;
  announcementEndAt: string;
  biddingStartAt: string;
  biddingEndAt: string;
  customerNotice: string;
  extensionEnabled?: boolean;
  extensionRule?: string;
};

export type EnterpriseRegisterPayload = {
  name: string;
  contactPerson: string;
  contactPhone: string;
  mainCategory: string;
  legalRepresentative: string;
  legalRepresentativeIdNo: string;
  email: string;
  userCategory: string;
  userType: string;
  registeredCapital?: string;
  region: string;
  address: string;
  unifiedSocialCreditCode: string;
  companyProfile: string;
  businessScope: string;
  paymentBankAccount: string;
  paymentAccountName: string;
  paymentBankName: string;
  paymentBankLineNo: string;
  paymentIsBankOfChina: boolean;
  receivingBankAccount: string;
  receivingAccountName: string;
  receivingBankName: string;
  receivingBankLineNo: string;
  receivingIsBankOfChina: boolean;
  agreementAccepted: boolean;
  qualificationFileUrl?: string;
  businessLicenseFileUrl?: string;
};

export type DepositVoucherPayload = {
  voucherFileName: string;
  voucherFileUrl: string;
  paidAmount?: string;
};

export type BlacklistMutationPayload = {
  enterpriseId: string;
  lotId: string;
  reason: string;
};

export type ContentMutationPayload = {
  title: string;
  category: string;
  summary: string;
  body: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';
const ACCEPTANCE_MODE = import.meta.env.VITE_ACCEPTANCE_MODE === 'true';
const CONTENT_CATEGORY_LABELS: Record<string, string> = {
  POLICY: '政策法规',
  TRADE_ANNOUNCEMENT: '交易公告',
  MINING_NEWS: '矿能动态',
  BLACKLIST_RULES: '用户黑名单管理说明',
  PUBLISH_REVIEW_RULES: '信息发布审核机制',
  AUCTION_RULES: '竞拍规则说明',
  DEPOSIT_RULES: '保证金缴纳与退还说明',
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;

    try {
      const errorBody = await response.json() as { message?: string };
      message = errorBody.message ?? message;
    } catch {
      // Keep the status-based message when backend returns a non-JSON error.
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

function listItems<T>(data: MaybeListResponse<T>): T[] {
  return Array.isArray(data) ? data : data.items;
}

async function withFallback<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch {
    if (ACCEPTANCE_MODE) {
      throw new Error('验收模式下真实 API 请求失败，已阻止 mock fallback。');
    }

    return fallback;
  }
}

function formatDate(value?: string | null): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDateOnly(value?: string | null): string {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function money(value: string, suffix = '元'): string {
  if (value.includes(suffix)) {
    return value;
  }

  return `${value} ${suffix}`;
}

function getEnterpriseHeaders() {
  return {
    'x-user-id': localStorage.getItem('devEnterpriseUserId') ?? import.meta.env.VITE_DEV_ENTERPRISE_USER_ID ?? '714ac6d2-aa76-4cff-9224-ecae6298c599',
    'x-user-role': 'ENTERPRISE',
  };
}

function getAdminHeaders() {
  return {
    'x-user-id': localStorage.getItem('devAdminUserId') ?? import.meta.env.VITE_DEV_ADMIN_USER_ID ?? '0d3ed994-8ebf-47ec-bf11-2eb86f008ae6',
    'x-user-role': 'ADMIN',
  };
}

function adminPost<T>(path: string, body?: Record<string, unknown>) {
  return request<T>(path, {
    method: 'POST',
    headers: {
      ...getAdminHeaders(),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function adminPut<T>(path: string, body: Record<string, unknown>) {
  return request<T>(path, {
    method: 'PUT',
    headers: {
      ...getAdminHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

function enterprisePost<T>(path: string, body: Record<string, unknown>) {
  return request<T>(path, {
    method: 'POST',
    headers: {
      ...getEnterpriseHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

function mapDashboard(data: ApiPortalDashboard): Stat[] {
  return [
    { label: '本年成交量', value: `${data.currentYearCompletedCount} 宗`, helper: '合同已完成口径', tone: 'blue' },
    { label: '本年成交额', value: money(data.currentYearCompletedAmount), helper: '本自然年已完成合同', tone: 'orange' },
    { label: '累计成交量', value: `${data.totalCompletedCount} 宗`, helper: '平台累计完成', tone: 'green' },
    { label: '累计成交额', value: money(data.totalCompletedAmount), helper: '已完成合同汇总', tone: 'blue' },
  ];
}

function mapLot(lot: ApiLot): Lot {
  const category = [lot.mineralCategory, lot.grade].filter(Boolean).join(' / ') || lot.mineralCategory || '矿产资源';
  const bidIncrement = lot.auctionRule?.bidIncrement ?? lot.bidIncrement;
  const depositAmount = lot.depositInstruction?.depositAmount ?? lot.depositAmount;

  return {
    id: lot.id,
    title: lot.title,
    startPrice: money(lot.startPrice),
    currentPrice: money(lot.currentHighestPrice ?? lot.startPrice),
    quantity: `${lot.quantity} ${lot.quantityUnit}`,
    category,
    supplier: lot.supplier,
    origin: lot.origin,
    deposit: money(depositAmount),
    publicityPeriod: `${formatDateOnly(lot.announcementStartAt)} 至 ${formatDateOnly(lot.announcementEndAt)}`,
    auctionTime: `${formatDate(lot.biddingStartAt)} 至 ${formatDate(lot.biddingEndAt)}`,
    countdown: lot.status === '公示中' ? '公示中' : '竞价中',
    status: lot.status,
    updatedAt: formatDate(lot.updatedAt),
    productInfo: lot.productInfo,
    productDetail: lot.productDetail,
    customerNotice: lot.customerNotice,
    auctionRule: `加价幅度 ${money(bidIncrement)}；竞拍时间 ${formatDate(lot.biddingStartAt)} 至 ${formatDate(lot.biddingEndAt)}`,
    depositInstruction: `保证金金额 ${money(depositAmount)}`,
  };
}

function mapResult(result: ApiResult): ResultRecord {
  return {
    id: result.id,
    lotTitle: result.lotTitle,
    winner: result.winningEnterpriseName,
    finalPrice: money(result.finalPrice),
    publicTime: formatDate(result.publishedAt ?? result.generatedAt),
    status: result.status,
  };
}

function mapContent(content: ApiContent): ContentRecord {
  const status = content.status === 'PUBLISHED' || content.status === '已发布'
    ? '已发布'
    : content.status === 'UNPUBLISHED' || content.status === '已下架'
      ? '已下架'
      : '草稿';

  return {
    id: content.id,
    title: content.title,
    category: CONTENT_CATEGORY_LABELS[content.category] ?? content.category,
    categoryCode: content.category,
    summary: content.summary,
    body: content.body,
    status,
    publishedAt: formatDate(content.publishedAt),
    updatedBy: '平台',
  };
}

function mapPublicBid(bid: ApiPublicBid, lotTitle = ''): BidRecord {
  return {
    id: bid.id,
    lotTitle,
    enterprise: bid.maskedEnterpriseName,
    maskedEnterprise: bid.maskedEnterpriseName,
    amount: money(bid.amount),
    incrementTimes: bid.incrementCount,
    bidTime: formatDate(bid.bidAt),
    isHighest: bid.isCurrentHighest,
    auctionStatus: '竞拍中',
  };
}

function mapProfile(profile: ApiAccountProfile): AccountProfile {
  return {
    id: profile.id,
    username: profile.username,
    enterpriseName: profile.enterprise?.name ?? profile.username,
    certificationStatus: profile.enterprise?.certificationStatus ?? '未提交',
    isBlacklisted: profile.enterprise?.isBlacklisted ?? false,
  };
}

function mapDeposit(deposit: ApiAccountDeposit): DepositRecord {
  return {
    id: deposit.id,
    enterprise: '',
    lotTitle: deposit.lotTitle ?? '-',
    amount: money(deposit.paidAmount ?? deposit.requiredAmount),
    voucher: '-',
    status: deposit.status,
    submittedAt: formatDate(deposit.submittedAt),
    reviewedAt: formatDate(deposit.reviewedAt),
    rejectReason: deposit.rejectReason ?? undefined,
  };
}

function mapEnterprise(enterprise: ApiEnterprise): Enterprise {
  return {
    id: enterprise.id,
    name: enterprise.name,
    contact: enterprise.contactPerson,
    phone: enterprise.contactPhone,
    category: enterprise.mainCategory || enterprise.userCategory,
    type: enterprise.userType,
    creditCode: enterprise.unifiedSocialCreditCode,
    status: enterprise.status,
    submittedAt: formatDate(enterprise.submittedAt),
    rejectReason: enterprise.rejectReason ?? undefined,
  };
}

function mapAdminDeposit(deposit: ApiAdminDeposit): DepositRecord {
  return {
    id: deposit.id,
    enterprise: deposit.enterpriseName || deposit.enterpriseId,
    lotTitle: deposit.lotTitle || deposit.lotId,
    amount: money(deposit.paidAmount ?? deposit.requiredAmount),
    voucher: '-',
    status: deposit.status,
    submittedAt: formatDate(deposit.submittedAt),
    reviewedAt: formatDate(deposit.reviewedAt),
    rejectReason: deposit.rejectReason ?? undefined,
  };
}

function mapAccountBid(bid: ApiAccountBid): BidRecord {
  return {
    id: bid.id,
    lotTitle: bid.lotTitle ?? '-',
    enterprise: bid.enterpriseName,
    maskedEnterprise: bid.maskedEnterpriseName,
    amount: money(bid.amount),
    incrementTimes: bid.incrementCount,
    bidTime: formatDate(bid.bidAt),
    isHighest: bid.isCurrentHighest,
    auctionStatus: '竞拍中',
  };
}

function mapAdminBid(bid: ApiAdminBid): BidRecord {
  return {
    id: String(bid.sequenceNo || bid.id),
    lotTitle: bid.lotTitle ?? '-',
    enterprise: bid.enterpriseName,
    maskedEnterprise: bid.maskedEnterpriseName,
    amount: money(bid.amount),
    incrementTimes: bid.incrementCount,
    bidTime: formatDate(bid.bidAt),
    isHighest: bid.isCurrentHighest,
    auctionStatus: '竞拍中',
  };
}

function mapContract(contract: ApiContract): ContractRecord {
  return {
    id: contract.id,
    lotTitle: contract.lotTitle,
    enterprise: contract.enterpriseName,
    amount: money(contract.finalPrice),
    status: contract.status,
    updatedAt: formatDate(contract.updatedAt),
    operator: '平台管理员',
  };
}

function mapRefund(refund: ApiRefund): RefundRecord {
  return {
    id: refund.id,
    lotTitle: refund.lotTitle,
    enterprise: refund.enterpriseName,
    amount: money(refund.amount),
    status: refund.status,
    updatedAt: formatDate(refund.updatedAt),
    operator: '平台管理员',
  };
}

function mapMessage(message: ApiAccountMessage): NotificationRecord {
  return {
    id: message.id,
    type: message.type,
    channel: message.channel,
    enterprise: '',
    lotTitle: message.lotTitle,
    content: message.content,
    status: message.sendStatus === '发送失败' ? '发送失败' : message.sendStatus === '待发送' ? '待发送' : '发送成功',
    sentAt: formatDate(message.sentAt ?? message.createdAt),
    read: Boolean(message.readAt),
  };
}

function mapAdminNotification(message: ApiAdminNotification): NotificationRecord {
  return {
    id: message.id,
    type: message.type,
    channel: message.channel,
    enterprise: message.receiverEnterpriseName,
    lotTitle: message.lotTitle,
    content: message.content,
    status: message.sendStatus === '发送失败' ? '发送失败' : message.sendStatus === '待发送' ? '待发送' : '发送成功',
    sentAt: formatDate(message.sentAt ?? message.createdAt),
    read: Boolean(message.readAt),
  };
}

function mapBlacklist(record: ApiBlacklist): BlacklistRecord {
  return {
    id: record.id,
    enterprise: record.enterpriseName,
    contact: '-',
    phone: '-',
    status: record.isActive ? '已拉黑' : '已解除',
    reason: record.releasedAt ? record.reason : record.reason,
    operator: record.operatorId ?? '平台管理员',
    operatedAt: formatDate(record.blacklistedAt),
  };
}

function mapAdminFile(file: ApiAdminFile): FileRecord {
  return {
    id: file.id,
    name: file.name,
    type: file.type,
    source: file.source,
    uploader: file.uploader,
    uploadedAt: formatDate(file.uploadedAt),
    ref: file.ref,
  };
}

function mapAdminLog(log: ApiAdminLog): LogRecord {
  return {
    id: log.id,
    operator: log.operatorUsername ?? log.operatorId ?? '系统',
    action: log.action,
    objectType: log.targetType,
    objectName: log.summary || log.targetId || '-',
    result: '成功',
    operatedAt: formatDate(log.createdAt),
  };
}

export const api = {
  getStats: () => stats,
  getLots: () => lots,
  getLot: (id?: string) => lots.find((lot) => lot.id === id) ?? lots[0],
  getEnterprises: () => enterprises,
  getDeposits: () => deposits,
  getBids: () => bids,
  getResults: () => results,
  getContracts: () => contracts,
  getRefunds: () => refunds,
  getContents: () => contents,
  getNotifications: () => notifications,
  getBlacklist: () => blacklist,
  getFiles: () => files,
  getLogs: () => logs,
  fetchStats: () =>
    withFallback(
      async () => mapDashboard(await request<ApiPortalDashboard>('/portal/dashboard')),
      stats,
    ),
  fetchLots: () =>
    withFallback(
      async () => {
        const data = await request<ListResponse<ApiLot>>('/lots?pageSize=100');
        return data.items.map(mapLot);
      },
      lots,
    ),
  fetchLot: (id?: string) =>
    withFallback(
      async () => mapLot(await request<ApiLot>(`/lots/${id ?? lots[0].id}`)),
      lots.find((lot) => lot.id === id) ?? lots[0],
    ),
  fetchBidRecords: (lotId?: string, lotTitle = '') =>
    withFallback(
      async () => {
        const data = await request<ListResponse<ApiPublicBid>>(`/lots/${lotId ?? lots[0].id}/bid-records?pageSize=100`);
        return data.items.map((bid) => mapPublicBid(bid, lotTitle));
      },
      bids,
    ),
  fetchResults: () =>
    withFallback(
      async () => {
        const data = await request<ListResponse<ApiResult>>('/results?pageSize=100');
        return data.items.map(mapResult);
      },
      results,
    ),
  fetchContents: (category?: string) =>
    withFallback(
      async () => {
        const query = category ? `?category=${category}&pageSize=100` : '?pageSize=100';
        const data = await request<ListResponse<ApiContent>>(`/contents${query}`);
        return data.items.map(mapContent);
      },
      contents,
    ),
  fetchAccountProfile: () =>
    withFallback(
      async () => mapProfile(await request<ApiAccountProfile>('/account/profile', { headers: getEnterpriseHeaders() })),
      {
        id: 'mock-account',
        username: 'mock',
        enterpriseName: enterprises[0]?.name ?? '示例企业',
        certificationStatus: enterprises[0]?.status ?? '未提交',
        isBlacklisted: false,
      },
    ),
  fetchAccountDeposits: () =>
    withFallback(
      async () => {
        const data = await request<ListResponse<ApiAccountDeposit>>('/account/deposit-vouchers?pageSize=100', { headers: getEnterpriseHeaders() });
        return data.items.map(mapDeposit);
      },
      deposits,
    ),
  fetchAccountBids: () =>
    withFallback(
      async () => {
        const data = await request<ListResponse<ApiAccountBid>>('/account/bids?pageSize=100', { headers: getEnterpriseHeaders() });
        return data.items.map(mapAccountBid);
      },
      bids,
    ),
  fetchAccountMessages: () =>
    withFallback(
      async () => {
        const data = await request<ListResponse<ApiAccountMessage>>('/account/messages?pageSize=100', { headers: getEnterpriseHeaders() });
        return data.items.map(mapMessage);
      },
      notifications,
    ),
  markMessageRead: (id: string) =>
    withFallback(
      async () => mapMessage(await request<ApiAccountMessage>(`/account/messages/${id}/read`, { method: 'POST', headers: getEnterpriseHeaders() })),
      notifications.find((message) => message.id === id) ?? notifications[0],
    ),
  fetchAdminLots: () =>
    withFallback(
      async () => {
        const data = await request<MaybeListResponse<ApiLot>>('/admin/lots?pageSize=100', { headers: getAdminHeaders() });
        return listItems(data).map(mapLot);
      },
      lots,
    ),
  fetchAdminLotReviews: () =>
    withFallback(
      async () => {
        const data = await request<MaybeListResponse<ApiLot>>('/admin/reviews/lots?pageSize=100', { headers: getAdminHeaders() });
        return listItems(data).map(mapLot);
      },
      lots.filter((x) => ['待发布复核', '公示中', '发布驳回'].includes(x.status)),
    ),
  fetchAdminEnterpriseReviews: () =>
    withFallback(
      async () => {
        const data = await request<MaybeListResponse<ApiEnterprise>>('/admin/reviews/enterprises?pageSize=100', { headers: getAdminHeaders() });
        return listItems(data).map(mapEnterprise);
      },
      enterprises,
    ),
  fetchAdminDepositReviews: () =>
    withFallback(
      async () => {
        const data = await request<MaybeListResponse<ApiAdminDeposit>>('/admin/reviews/deposits?pageSize=100', { headers: getAdminHeaders() });
        return listItems(data).map(mapAdminDeposit);
      },
      deposits,
    ),
  fetchAdminBids: () =>
    withFallback(
      async () => {
        const data = await request<ListResponse<ApiAdminBid>>('/admin/bids?pageSize=100', { headers: getAdminHeaders() });
        return data.items.map(mapAdminBid);
      },
      bids,
    ),
  fetchAdminResults: () =>
    withFallback(
      async () => {
        const data = await request<ListResponse<ApiResult>>('/admin/results?pageSize=100', { headers: getAdminHeaders() });
        return data.items.map(mapResult);
      },
      results,
    ),
  fetchAdminContracts: () =>
    withFallback(
      async () => {
        const data = await request<ListResponse<ApiContract>>('/admin/contracts?pageSize=100', { headers: getAdminHeaders() });
        return data.items.map(mapContract);
      },
      contracts,
    ),
  fetchAdminRefunds: () =>
    withFallback(
      async () => {
        const data = await request<ListResponse<ApiRefund>>('/admin/refunds?pageSize=100', { headers: getAdminHeaders() });
        return data.items.map(mapRefund);
      },
      refunds,
    ),
  fetchAdminBlacklist: () =>
    withFallback(
      async () => {
        const data = await request<ListResponse<ApiBlacklist>>('/admin/blacklist?pageSize=100', { headers: getAdminHeaders() });
        return data.items.map(mapBlacklist);
      },
      blacklist,
    ),
  fetchAdminContents: () =>
    withFallback(
      async () => {
        const data = await request<ListResponse<ApiContent>>('/admin/contents?pageSize=100', { headers: getAdminHeaders() });
        return data.items.map(mapContent);
      },
      contents,
    ),
  fetchAdminNotifications: () =>
    withFallback(
      async () => {
        const data = await request<ListResponse<ApiAdminNotification>>('/admin/notifications?pageSize=100', { headers: getAdminHeaders() });
        return data.items.map(mapAdminNotification);
      },
      notifications,
    ),
  fetchAdminFiles: () =>
    withFallback(
      async () => {
        const data = await request<ListResponse<ApiAdminFile>>('/admin/files?pageSize=100', { headers: getAdminHeaders() });
        return data.items.map(mapAdminFile);
      },
      files,
    ),
  fetchAdminLogs: () =>
    withFallback(
      async () => {
        const data = await request<ListResponse<ApiAdminLog>>('/admin/logs?pageSize=100', { headers: getAdminHeaders() });
        return data.items.map(mapAdminLog);
      },
      logs,
    ),
  submitLotReview: (id: string) => adminPost<ApiLot>(`/admin/lots/${id}/submit-review`),
  closeLot: (id: string) => adminPost<ApiLot>(`/admin/lots/${id}/close`),
  createLot: (payload: LotMutationPayload) => adminPost<ApiLot>('/admin/lots', payload),
  updateLot: (id: string, payload: LotMutationPayload) => adminPut<ApiLot>(`/admin/lots/${id}`, payload),
  advanceLotToBidding: (id: string) => adminPost<ApiLot>(`/admin/lots/${id}/advance-to-bidding`),
  approveLotReview: (id: string) => adminPost<ApiLot>(`/admin/reviews/lots/${id}/approve`),
  rejectLotReview: (id: string, rejectReason: string) => adminPost<ApiLot>(`/admin/reviews/lots/${id}/reject`, { rejectReason }),
  registerEnterprise: (payload: EnterpriseRegisterPayload) => enterprisePost<ApiEnterprise>('/enterprises/register', payload),
  submitDepositVoucher: (lotId: string, payload: DepositVoucherPayload) => enterprisePost<ApiAdminDeposit>(`/lots/${lotId}/deposit-vouchers`, payload),
  submitBid: (lotId: string, amount: string) => enterprisePost<ApiPublicBid>(`/lots/${lotId}/bids`, { amount }),
  approveEnterpriseReview: (id: string) => adminPost<ApiEnterprise>(`/admin/reviews/enterprises/${id}/approve`),
  rejectEnterpriseReview: (id: string, rejectReason: string) => adminPost<ApiEnterprise>(`/admin/reviews/enterprises/${id}/reject`, { rejectReason }),
  approveDepositReview: (id: string) => adminPost<ApiAdminDeposit>(`/admin/reviews/deposits/${id}/approve`),
  rejectDepositReview: (id: string, rejectReason: string) => adminPost<ApiAdminDeposit>(`/admin/reviews/deposits/${id}/reject`, { rejectReason }),
  publishResult: (id: string) => adminPost<ApiResult>(`/admin/results/${id}/publish`),
  markContractSigned: (id: string) => adminPost<ApiContract>(`/admin/contracts/${id}/mark-signed`),
  markContractCompleted: (id: string) => adminPost<ApiContract>(`/admin/contracts/${id}/mark-completed`),
  markContractDefaulted: (id: string) => adminPost<ApiContract>(`/admin/contracts/${id}/mark-defaulted`),
  markRefundReviewing: (id: string) => adminPost<ApiRefund>(`/admin/refunds/${id}/mark-reviewing`),
  markRefundRefunded: (id: string) => adminPost<ApiRefund>(`/admin/refunds/${id}/mark-refunded`),
  createBlacklist: (payload: BlacklistMutationPayload) => adminPost<ApiBlacklist>('/admin/blacklist', payload),
  releaseBlacklist: (id: string, releaseReason: string) => adminPost<ApiBlacklist>(`/admin/blacklist/${id}/release`, { releaseReason }),
  createContent: (payload: ContentMutationPayload) => adminPost<ApiContent>('/admin/contents', payload),
  updateContent: (id: string, payload: ContentMutationPayload) => adminPut<ApiContent>(`/admin/contents/${id}`, payload),
  publishContent: (id: string) => adminPost<ApiContent>(`/admin/contents/${id}/publish`),
  unpublishContent: (id: string) => adminPost<ApiContent>(`/admin/contents/${id}/unpublish`),
};
