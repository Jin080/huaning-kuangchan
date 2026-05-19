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
import {
  clearAuthSession,
  getAuthToken,
  normalizeProfile,
  saveAuthSession,
  type AuthRole,
  type LoginResult,
} from './auth';

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

type MappedLot = Lot & {
  biddingEndAt?: string;
};

type ApiPortalDashboard = {
  currentYearCompletedCount: number;
  currentYearCompletedAmount: string;
  totalCompletedCount: number;
  totalCompletedAmount: string;
};

type ApiResult = {
  id: string;
  lotId: string;
  lotTitle: string;
  lotStatusCode?: Lot['status'] | string;
  winningEnterpriseName: string;
  finalPrice: string;
  status: ResultRecord['status'];
  publishedAt: string | null;
  generatedAt: string;
  createdAt?: string;
  updatedAt?: string;
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
  avatarUrl?: string | null;
  statusCode?: string;
  roleCode?: AuthRole;
  roleName?: string;
  enterprise: {
    id?: string;
    name: string;
    certificationStatus?: AccountProfile['certificationStatus'];
    certificationStatusCode?: string;
    isBlacklisted: boolean;
  } | null;
};

type ApiAccountDeposit = {
  id: string;
  lotId: string;
  lotTitle: string | null;
  requiredAmount: string;
  paidAmount: string | null;
  attachmentId?: string | null;
  voucherFileName?: string | null;
  voucherFileUrl?: string | null;
  status: DepositRecord['status'];
  statusCode?: string;
  submittedAt: string;
  reviewedAt: string | null;
  rejectReason: string | null;
};

type ApiAccountBid = {
  id: string;
  lotId: string;
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
  lotId: string | null;
  lotTitle: string;
  content: string;
  sendStatus: string;
  sentAt: string | null;
  readAt: string | null;
  createdAt: string;
};

type ApiAccountCertification = {
  id?: string;
  name?: string;
  contactPerson?: string;
  contactPhone?: string;
  mainCategory?: string;
  legalRepresentative?: string;
  legalRepresentativeIdNo?: string;
  email?: string;
  userCategory?: string;
  userType?: string;
  registeredCapital?: string | null;
  region?: string;
  address?: string;
  unifiedSocialCreditCode?: string;
  companyProfile?: string;
  businessScope?: string;
  paymentBankAccount?: string;
  paymentAccountName?: string;
  paymentBankName?: string;
  paymentBankLineNo?: string;
  paymentIsBankOfChina?: boolean;
  receivingBankAccount?: string;
  receivingAccountName?: string;
  receivingBankName?: string;
  receivingBankLineNo?: string;
  receivingIsBankOfChina?: boolean;
  agreementAccepted?: boolean;
  status: AccountProfile['certificationStatus'];
  statusCode?: string;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewerId?: string | null;
  rejectReason?: string | null;
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
  voucherFileName?: string | null;
  voucherFileUrl?: string | null;
  status: DepositRecord['status'];
  statusCode?: string;
  submittedAt?: string;
  reviewedAt?: string | null;
  rejectReason: string | null;
};

type AdminTodoCounts = {
  lotReviews: number;
  enterpriseReviews: number;
  depositReviews: number;
};

type ApiAdminBid = {
  id: string;
  sequenceNo: number;
  lotId: string;
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
  auctionResultId?: string;
  lotId: string;
  lotTitle: string;
  lotStatusCode?: Lot['status'] | string;
  enterpriseId?: string;
  enterpriseName: string;
  finalPrice: string;
  status: ContractRecord['status'];
  statusCode?: string;
  signedAt?: string | null;
  completedAt?: string | null;
  defaultedAt?: string | null;
  remark?: string | null;
  createdAt?: string;
  updatedAt: string;
};

type ApiRefund = {
  id: string;
  lotId: string;
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
type MappedDepositRecord = DepositRecord & {
  requiredAmount?: string;
  paidAmount?: string;
  attachmentId?: string;
  voucherFileName?: string;
  voucherFileUrl?: string;
  statusCode?: string;
};

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

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(
    message: string,
    status: number,
    code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

export type UploadCategory = 'LOT_IMAGE' | 'INSPECTION_REPORT' | 'DEPOSIT_VOUCHER';

export type FileUploadResponse = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  fileSize: number;
  category: UploadCategory;
  isSensitive: boolean;
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

export type AccountCertificationRecord = {
  id?: string;
  name: string;
  contactPerson: string;
  contactPhone: string;
  mainCategory: string;
  legalRepresentative: string;
  legalRepresentativeIdNo: string;
  email: string;
  userCategory: string;
  userType: string;
  registeredCapital: string;
  region: string;
  address: string;
  unifiedSocialCreditCode: string;
  companyProfile: string;
  businessScope: string;
  paymentBankAccount: string;
  paymentAccountName: string;
  paymentBankName: string;
  paymentBankLineNo: string;
  receivingBankAccount: string;
  receivingAccountName: string;
  receivingBankName: string;
  receivingBankLineNo: string;
  status: AccountProfile['certificationStatus'];
  submittedAt: string;
  reviewedAt: string;
  rejectReason?: string;
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

export type ResultWorkflowRecord = ResultRecord & {
  lotStatusCode?: string;
  generatedAt?: string;
  publishedAt?: string;
  updatedAt?: string;
};

export type ContractWorkflowRecord = ContractRecord & {
  auctionResultId?: string;
  lotStatusCode?: string;
  enterpriseId?: string;
  statusCode?: string;
  signedAt?: string;
  completedAt?: string;
  defaultedAt?: string;
  remark?: string;
  createdAt?: string;
};

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';
const ACCEPTANCE_MODE = import.meta.env.VITE_ACCEPTANCE_MODE === 'true';
const DEV_AUTH_HEADERS_ENABLED = import.meta.env.VITE_DEV_AUTH_HEADERS_ENABLED === 'true';
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
  const token = getAuthToken();
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    let message = `API request failed: ${response.status}`;
    let code: string | undefined;

    try {
      const errorBody = await response.json() as { code?: string; message?: string };
      message = errorBody.message ?? message;
      code = errorBody.code;
    } catch {
      // Keep the status-based message when backend returns a non-JSON error.
    }

    if (response.status === 401) {
      clearAuthSession();
    }

    throw new ApiError(message, response.status, code);
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

async function withPublicFallback<T>(load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      throw error;
    }

    if (ACCEPTANCE_MODE) {
      throw new Error('验收模式下真实 API 请求失败，已阻止 mock fallback。', { cause: error });
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

function getEnterpriseHeaders(): Record<string, string> {
  if (getAuthToken() || !DEV_AUTH_HEADERS_ENABLED) {
    return {};
  }

  return {
    'x-user-id': localStorage.getItem('devEnterpriseUserId') ?? import.meta.env.VITE_DEV_ENTERPRISE_USER_ID ?? '714ac6d2-aa76-4cff-9224-ecae6298c599',
    'x-user-role': 'ENTERPRISE',
  };
}

function getAdminHeaders(): Record<string, string> {
  if (getAuthToken() || !DEV_AUTH_HEADERS_ENABLED) {
    return {};
  }

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

async function uploadFile(file: File, category: UploadCategory) {
  const formData = new FormData();
  formData.append('category', category);
  formData.append('file', file);

  const uploaded = await request<FileUploadResponse>('/files/upload', {
    method: 'POST',
    headers: category === 'DEPOSIT_VOUCHER' ? getEnterpriseHeaders() : getAdminHeaders(),
    body: formData,
  });

  return {
    ...uploaded,
    fileUrl: resolveApiFileUrl(uploaded.fileUrl),
  };
}

function resolveApiFileUrl(fileUrl: string): string {
  if (/^https?:\/\//.test(fileUrl)) {
    return fileUrl;
  }

  const base = /^https?:\/\//.test(API_BASE) ? API_BASE : window.location.origin;

  return new URL(fileUrl, base).toString();
}

function mapDashboard(data: ApiPortalDashboard): Stat[] {
  return [
    { label: '本年成交量', value: `${data.currentYearCompletedCount} 宗`, helper: '合同已完成口径', tone: 'blue' },
    { label: '本年成交额', value: money(data.currentYearCompletedAmount), helper: '本自然年已完成合同', tone: 'orange' },
    { label: '累计成交量', value: `${data.totalCompletedCount} 宗`, helper: '平台累计完成', tone: 'green' },
    { label: '累计成交额', value: money(data.totalCompletedAmount), helper: '已完成合同汇总', tone: 'blue' },
  ];
}

function mapLot(lot: ApiLot): MappedLot {
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
    biddingEndAt: lot.biddingEndAt,
  };
}

function mapResult(result: ApiResult): ResultWorkflowRecord {
  return {
    id: result.id,
    lotId: result.lotId,
    lotTitle: result.lotTitle,
    winner: result.winningEnterpriseName,
    finalPrice: money(result.finalPrice),
    publicTime: formatDate(result.publishedAt ?? result.generatedAt),
    status: result.status,
    lotStatusCode: result.lotStatusCode,
    generatedAt: formatDate(result.generatedAt),
    publishedAt: formatDate(result.publishedAt),
    updatedAt: formatDate(result.updatedAt),
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
    lotId: bid.lotId,
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
  const normalizedProfile = normalizeProfile({
    id: profile.id,
    username: profile.username,
    avatarUrl: profile.avatarUrl ?? null,
    statusCode: profile.statusCode ?? 'ACTIVE',
    roleCode: profile.roleCode ?? 'ENTERPRISE',
    roleName: profile.roleName ?? '企业用户',
    enterprise: profile.enterprise
      ? {
          id: profile.enterprise.id ?? '',
          name: profile.enterprise.name,
          certificationStatus: profile.enterprise.certificationStatus,
          certificationStatusCode: profile.enterprise.certificationStatusCode,
          isBlacklisted: profile.enterprise.isBlacklisted,
        }
      : null,
  });

  return {
    id: profile.id,
    username: profile.username,
    enterpriseName: normalizedProfile.enterprise?.name ?? profile.username,
    certificationStatus: (normalizedProfile.enterprise?.certificationStatus ?? '未提交') as AccountProfile['certificationStatus'],
    isBlacklisted: normalizedProfile.enterprise?.isBlacklisted ?? false,
  };
}

function mapDeposit(deposit: ApiAccountDeposit): MappedDepositRecord {
  const requiredAmount = money(deposit.requiredAmount);
  const paidAmount = deposit.paidAmount ? money(deposit.paidAmount) : '';

  return {
    id: deposit.id,
    lotId: deposit.lotId,
    enterprise: '',
    lotTitle: deposit.lotTitle ?? '-',
    amount: paidAmount || requiredAmount,
    requiredAmount,
    paidAmount,
    attachmentId: deposit.attachmentId ?? undefined,
    voucher: deposit.voucherFileName || '查看凭证',
    voucherFileName: deposit.voucherFileName ?? undefined,
    voucherFileUrl: deposit.voucherFileUrl ?? undefined,
    status: deposit.status,
    statusCode: deposit.statusCode,
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

function mapAdminDeposit(deposit: ApiAdminDeposit): MappedDepositRecord {
  const requiredAmount = money(deposit.requiredAmount);
  const paidAmount = deposit.paidAmount ? money(deposit.paidAmount) : '';

  return {
    id: deposit.id,
    lotId: deposit.lotId,
    enterprise: deposit.enterpriseName || deposit.enterpriseId,
    lotTitle: deposit.lotTitle || deposit.lotId,
    amount: paidAmount || requiredAmount,
    requiredAmount,
    paidAmount,
    voucher: deposit.voucherFileName || '查看凭证',
    voucherFileName: deposit.voucherFileName ?? undefined,
    voucherFileUrl: deposit.voucherFileUrl ?? undefined,
    status: deposit.status,
    statusCode: deposit.statusCode,
    submittedAt: formatDate(deposit.submittedAt),
    reviewedAt: formatDate(deposit.reviewedAt),
    rejectReason: deposit.rejectReason ?? undefined,
  };
}

function isPendingReviewStatus(row: { status?: string; statusCode?: string }): boolean {
  return row.status === '待审核' || row.status === '待发布复核' || row.statusCode === 'PENDING' || row.statusCode === 'PENDING_RELEASE_REVIEW';
}

async function fetchAdminTodoCounts(): Promise<AdminTodoCounts> {
  const headers = getAdminHeaders();
  const [lotReviewData, enterpriseReviewData, depositReviewData] = await Promise.all([
    request<MaybeListResponse<ApiLot>>('/admin/reviews/lots?pageSize=100', { headers }),
    request<MaybeListResponse<ApiEnterprise>>('/admin/reviews/enterprises?pageSize=100', { headers }),
    request<MaybeListResponse<ApiAdminDeposit>>('/admin/reviews/deposits?pageSize=100', { headers }),
  ]);

  return {
    lotReviews: listItems(lotReviewData).filter(isPendingReviewStatus).length,
    enterpriseReviews: listItems(enterpriseReviewData).filter(isPendingReviewStatus).length,
    depositReviews: listItems(depositReviewData).filter(isPendingReviewStatus).length,
  };
}

function mapAccountBid(bid: ApiAccountBid): BidRecord {
  return {
    id: bid.id,
    lotId: bid.lotId,
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
    lotId: bid.lotId,
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

function mapContract(contract: ApiContract): ContractWorkflowRecord {
  return {
    id: contract.id,
    auctionResultId: contract.auctionResultId,
    lotId: contract.lotId,
    lotTitle: contract.lotTitle,
    lotStatusCode: contract.lotStatusCode,
    enterpriseId: contract.enterpriseId,
    enterprise: contract.enterpriseName,
    amount: money(contract.finalPrice),
    status: contract.status,
    statusCode: contract.statusCode,
    signedAt: formatDate(contract.signedAt),
    completedAt: formatDate(contract.completedAt),
    defaultedAt: formatDate(contract.defaultedAt),
    remark: contract.remark ?? undefined,
    createdAt: formatDate(contract.createdAt),
    updatedAt: formatDate(contract.updatedAt),
    operator: '平台管理员',
  };
}

function mapRefund(refund: ApiRefund): RefundRecord {
  return {
    id: refund.id,
    lotId: refund.lotId,
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
    lotId: message.lotId,
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

function mapCertification(certification: ApiAccountCertification): AccountCertificationRecord {
  return {
    id: certification.id,
    name: certification.name ?? '-',
    contactPerson: certification.contactPerson ?? '-',
    contactPhone: certification.contactPhone ?? '-',
    mainCategory: certification.mainCategory ?? '-',
    legalRepresentative: certification.legalRepresentative ?? '-',
    legalRepresentativeIdNo: certification.legalRepresentativeIdNo ?? '-',
    email: certification.email ?? '-',
    userCategory: certification.userCategory ?? '-',
    userType: certification.userType ?? '-',
    registeredCapital: certification.registeredCapital ?? '-',
    region: certification.region ?? '-',
    address: certification.address ?? '-',
    unifiedSocialCreditCode: certification.unifiedSocialCreditCode ?? '-',
    companyProfile: certification.companyProfile ?? '-',
    businessScope: certification.businessScope ?? '-',
    paymentBankAccount: certification.paymentBankAccount ?? '-',
    paymentAccountName: certification.paymentAccountName ?? '-',
    paymentBankName: certification.paymentBankName ?? '-',
    paymentBankLineNo: certification.paymentBankLineNo ?? '-',
    receivingBankAccount: certification.receivingBankAccount ?? '-',
    receivingAccountName: certification.receivingAccountName ?? '-',
    receivingBankName: certification.receivingBankName ?? '-',
    receivingBankLineNo: certification.receivingBankLineNo ?? '-',
    status: certification.status,
    submittedAt: formatDate(certification.submittedAt),
    reviewedAt: formatDate(certification.reviewedAt),
    rejectReason: certification.rejectReason ?? undefined,
  };
}

function mapAdminNotification(message: ApiAdminNotification): NotificationRecord {
  return {
    id: message.id,
    lotId: message.lotId,
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
    lotId: record.lotId ?? '',
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
  login: async (username: string, password: string) => {
    const result = await request<LoginResult>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    saveAuthSession(result);
    return result;
  },
  logout: async () => {
    try {
      await request<{ success: true; message: string }>('/auth/logout', { method: 'POST' });
    } finally {
      clearAuthSession();
    }
  },
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
  fetchResultDetail: (id: string) =>
    withFallback(
      async () => mapResult(await request<ApiResult>(`/results/${id}`)),
      results.find((result) => result.id === id || result.lotId === id) ?? results[0],
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
    withPublicFallback(
      async () => mapProfile(await request<ApiAccountProfile>('/account/profile', { headers: getEnterpriseHeaders() })),
      {
        id: 'mock-account',
        username: 'mock',
        enterpriseName: enterprises[0]?.name ?? '示例企业',
        certificationStatus: enterprises[0]?.status ?? '未提交',
        isBlacklisted: false,
      },
    ),
  fetchAccountCertification: () =>
    withPublicFallback(
      async () => mapCertification(await request<ApiAccountCertification>('/account/certification', { headers: getEnterpriseHeaders() })),
      mapCertification({
        id: enterprises[0]?.id,
        name: enterprises[0]?.name ?? '示例企业',
        contactPerson: enterprises[0]?.contact ?? '-',
        contactPhone: enterprises[0]?.phone ?? '-',
        mainCategory: enterprises[0]?.category ?? '-',
        legalRepresentative: '张建国',
        legalRepresentativeIdNo: '530102********1234',
        email: 'contact@example.com',
        userCategory: '企业法人',
        userType: enterprises[0]?.type ?? '内资企业',
        registeredCapital: '5000 万人民币',
        region: '云南省 玉溪市 华宁县',
        address: '华宁县宁州街道矿业服务中心',
        unifiedSocialCreditCode: enterprises[0]?.creditCode ?? '91110000X123456789',
        companyProfile: '专注于有色金属、非金属矿产资源开发与投资。',
        businessScope: '矿产资源开发、矿产品销售、供应链服务',
        paymentBankAccount: '中国银行 6222 **** 8899',
        paymentAccountName: enterprises[0]?.name ?? '示例企业',
        paymentBankName: '中国银行华宁支行',
        paymentBankLineNo: '104000000000',
        receivingBankAccount: '中国银行 6222 **** 7788',
        receivingAccountName: '华宁矿产资源交易中心',
        receivingBankName: '中国银行华宁支行',
        receivingBankLineNo: '104000000001',
        status: enterprises[0]?.status ?? '未提交',
        submittedAt: enterprises[0]?.submittedAt,
        reviewedAt: null,
        rejectReason: enterprises[0]?.rejectReason,
      }),
    ),
  fetchAccountDeposits: () =>
    withPublicFallback(
      async () => {
        const data = await request<ListResponse<ApiAccountDeposit>>('/account/deposit-vouchers?pageSize=100', { headers: getEnterpriseHeaders() });
        return data.items.map(mapDeposit);
      },
      deposits,
    ),
  fetchAccountBids: () =>
    withPublicFallback(
      async () => {
        const data = await request<ListResponse<ApiAccountBid>>('/account/bids?pageSize=100', { headers: getEnterpriseHeaders() });
        return data.items.map(mapAccountBid);
      },
      bids,
    ),
  fetchAccountMessages: () =>
    withPublicFallback(
      async () => {
        const data = await request<ListResponse<ApiAccountMessage>>('/account/messages?pageSize=100', { headers: getEnterpriseHeaders() });
        return data.items.map(mapMessage);
      },
      notifications,
    ),
  markMessageRead: (id: string) =>
    withPublicFallback(
      async () => mapMessage(await request<ApiAccountMessage>(`/account/messages/${id}/read`, { method: 'POST', headers: getEnterpriseHeaders() })),
      notifications.find((message) => message.id === id) ?? notifications[0],
    ),
  fetchAdminLots: () =>
    withPublicFallback(
      async () => {
        const data = await request<MaybeListResponse<ApiLot>>('/admin/lots?pageSize=100', { headers: getAdminHeaders() });
        return listItems(data).map(mapLot);
      },
      lots,
    ),
  fetchAdminLotReviews: () =>
    withPublicFallback(
      async () => {
        const data = await request<MaybeListResponse<ApiLot>>('/admin/reviews/lots?pageSize=100', { headers: getAdminHeaders() });
        return listItems(data).map(mapLot);
      },
      lots.filter((x) => ['待发布复核', '公示中', '发布驳回'].includes(x.status)),
    ),
  fetchAdminEnterpriseReviews: () =>
    withPublicFallback(
      async () => {
        const data = await request<MaybeListResponse<ApiEnterprise>>('/admin/reviews/enterprises?pageSize=100', { headers: getAdminHeaders() });
        return listItems(data).map(mapEnterprise);
      },
      enterprises,
    ),
  fetchAdminDepositReviews: () =>
    withPublicFallback(
      async () => {
        const data = await request<MaybeListResponse<ApiAdminDeposit>>('/admin/reviews/deposits?pageSize=100', { headers: getAdminHeaders() });
        return listItems(data).map(mapAdminDeposit);
      },
      deposits,
    ),
  fetchAdminBids: () =>
    withPublicFallback(
      async () => {
        const data = await request<ListResponse<ApiAdminBid>>('/admin/bids?pageSize=100', { headers: getAdminHeaders() });
        return data.items.map(mapAdminBid);
      },
      bids,
    ),
  fetchAdminResults: () =>
    withPublicFallback(
      async () => {
        const data = await request<ListResponse<ApiResult>>('/admin/results?pageSize=100', { headers: getAdminHeaders() });
        return data.items.map(mapResult);
      },
      results,
    ),
  fetchAdminContracts: () =>
    withPublicFallback(
      async () => {
        const data = await request<ListResponse<ApiContract>>('/admin/contracts?pageSize=100', { headers: getAdminHeaders() });
        return data.items.map(mapContract);
      },
      contracts,
    ),
  fetchAdminRefunds: () =>
    withPublicFallback(
      async () => {
        const data = await request<ListResponse<ApiRefund>>('/admin/refunds?pageSize=100', { headers: getAdminHeaders() });
        return data.items.map(mapRefund);
      },
      refunds,
    ),
  fetchAdminBlacklist: () =>
    withPublicFallback(
      async () => {
        const data = await request<ListResponse<ApiBlacklist>>('/admin/blacklist?pageSize=100', { headers: getAdminHeaders() });
        return data.items.map(mapBlacklist);
      },
      blacklist,
    ),
  fetchAdminContents: () =>
    withPublicFallback(
      async () => {
        const data = await request<ListResponse<ApiContent>>('/admin/contents?pageSize=100', { headers: getAdminHeaders() });
        return data.items.map(mapContent);
      },
      contents,
    ),
  fetchAdminNotifications: () =>
    withPublicFallback(
      async () => {
        const data = await request<ListResponse<ApiAdminNotification>>('/admin/notifications?pageSize=100', { headers: getAdminHeaders() });
        return data.items.map(mapAdminNotification);
      },
      notifications,
    ),
  fetchAdminFiles: () =>
    withPublicFallback(
      async () => {
        const data = await request<ListResponse<ApiAdminFile>>('/admin/files?pageSize=100', { headers: getAdminHeaders() });
        return data.items.map(mapAdminFile);
      },
      files,
    ),
  fetchAdminLogs: () =>
    withPublicFallback(
      async () => {
        const data = await request<ListResponse<ApiAdminLog>>('/admin/logs?pageSize=100', { headers: getAdminHeaders() });
        return data.items.map(mapAdminLog);
      },
      logs,
    ),
  fetchAdminTodoCounts,
  submitLotReview: (id: string) => adminPost<ApiLot>(`/admin/lots/${id}/submit-review`),
  closeLot: (id: string) => adminPost<ApiLot>(`/admin/lots/${id}/close`),
  createLot: (payload: LotMutationPayload) => adminPost<ApiLot>('/admin/lots', payload),
  updateLot: (id: string, payload: LotMutationPayload) => adminPut<ApiLot>(`/admin/lots/${id}`, payload),
  uploadFile,
  advanceLotToBidding: (id: string) => adminPost<ApiLot>(`/admin/lots/${id}/advance-to-bidding`),
  approveLotReview: (id: string) => adminPost<ApiLot>(`/admin/reviews/lots/${id}/approve`),
  rejectLotReview: (id: string, rejectReason: string) => adminPost<ApiLot>(`/admin/reviews/lots/${id}/reject`, { rejectReason }),
  registerEnterprise: (payload: EnterpriseRegisterPayload) => enterprisePost<ApiEnterprise>('/enterprises/register', payload),
  submitDepositVoucher: async (lotId: string, payload: DepositVoucherPayload) =>
    mapAdminDeposit(await enterprisePost<ApiAdminDeposit>(`/lots/${lotId}/deposit-vouchers`, payload)),
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
