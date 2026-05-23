import { type CSSProperties, type ChangeEvent, type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ButtonRow } from '../components/Button';
import { SectionHeader, StatCards } from '../components/Cards';
import { DataTable } from '../components/DataTable';
import { FilterBar, type FilterValues } from '../components/FilterBar';
import { AdminLayout } from '../components/Layouts';
import { StatusTag } from '../components/StatusTag';
import { EmptyState, ErrorState, TableSkeleton } from '../components/StatusViews';
import { navigateTo } from '../navigation';
import {
  ApiError,
  api,
  type AuctionClosingPendingLot,
  type AuctionClosingRunRecord,
  type BlacklistMutationPayload,
  type ContentMutationPayload,
  type ContractWorkflowRecord,
  type LotMutationPayload,
  type ResultWorkflowRecord,
  type UploadCategory,
} from '../services/api';
import type { BidRecord, Lot, Stat } from '../types';
import { getAuthProfile, getAuthToken } from '../services/auth';
import type { Action, TableColumn } from '../types';

type AdminListConfig = {
  title: string;
  active: string;
  subActive: string;
  filters: string[];
  summaryCards?: AdminSummaryCard[] | ((rows: Record<string, unknown>[]) => AdminSummaryCard[]);
  loadRows?: () => Promise<Record<string, unknown>[]>;
  columns: TableColumn<Record<string, unknown>>[];
  tableClassName?: string;
  topActions?: Action[];
  drawerTitle?: string;
  drawerSections?: string[];
  detailItems?: (row: Record<string, unknown>) => AdminDetailItem[];
  drawerContent?: (row: Record<string, unknown>) => ReactNode;
  confirmPanel?: AdminConfirmPanel;
  batchReview?: AdminBatchReviewConfig;
};

type RowActionHandler = (label: string, row: Record<string, unknown>) => Promise<void>;
type RowNavigationHandler = (label: string, row: Record<string, unknown>) => string | undefined;
type RowActionLabel = string | ((row: Record<string, unknown>) => string | undefined);
type AdminRowActionResult = unknown | false;
type AdminActionFeedback = {
  message: string;
  actions: Action[];
  details?: string[];
};
type AdminBatchReviewConfig = {
  approve: (id: string) => Promise<unknown>;
  reject: (id: string, rejectReason: string) => Promise<unknown>;
  itemLabel: string;
  isSelectable?: (row: Record<string, unknown>) => boolean;
};
type BatchReviewResult = {
  id: string;
  title: string;
  ok: boolean;
  message?: string;
};
type BatchReviewAction = 'approve' | 'reject';
type AdminSummaryCard = {
  label: string;
  value: string;
  helper: string;
  tone?: 'blue' | 'orange' | 'green' | 'red';
};
type AdminDetailItem = {
  label: string;
  value: string;
  attachmentId?: string;
  fileUrl?: string;
};
type AdminConfirmPanel = {
  title: string;
  body: string;
  note?: string;
  tone?: 'blue' | 'orange' | 'red';
};
type FlowNodeState = 'done' | 'active' | 'todo' | 'danger';
type LotUploadTarget = {
  label: string;
  fieldName: keyof Pick<LotMutationPayload, 'imageOneUrl' | 'imageTwoUrl' | 'inspectionReportUrl'>;
  category: UploadCategory;
  accept: string;
  helper: string;
};
type LotUploadState = {
  fileName: string;
  fileUrl: string;
  previewUrl?: string;
  isImage: boolean;
  persisted?: boolean;
};
type AdditionalLotImageState = LotUploadState & {
  id: string;
};
type AdminImagePreviewState = {
  src: string;
  title: string;
  subtitle?: string;
};
type LotAttachmentFieldName = LotUploadTarget['fieldName'];
type LotAttachmentRequirement = {
  fieldName: LotAttachmentFieldName;
  label: string;
};

const REVIEW_REJECT_REASON = '后台页面快速驳回，请补充或修正资料。';
const BLACKLIST_RELEASE_REASON = '后台页面手动解除黑名单。';
const ADMIN_LIST_REFRESH_EVENT = 'admin-list-refresh';
const ADMIN_ACTION_FEEDBACK_EVENT = 'admin-action-feedback';
const ADMIN_DRAWER_SELECT_EVENT = 'admin-drawer-select-row';
const BLACKLIST_FORM_ID = 'admin-blacklist-form';
const LOT_FORM_FIELDS: Array<[keyof LotMutationPayload, string, string]> = [
  ['title', '拍品标题', 'T14-华宁矿产竞拍验收拍品'],
  ['startPrice', '单价/起拍价', '100'],
  ['quantity', '数量', '100.000'],
  ['supplier', '供应商', '华宁矿产供应有限公司'],
  ['origin', '产地', '云南华宁'],
  ['deadlineAt', '截止日期', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()],
  ['deliveryMethod', '发货方式', '买方自提'],
  ['email', '电子邮箱', 'auction@example.com'],
  ['phone', '联系电话预留', '0877-0000000'],
  ['productInfo', '商品信息/商品详情', '验收用矿产资源拍品'],
  ['inspectionReportUrl', '检测报告', 'https://files.example.com/e2e-report.pdf'],
  ['assessedPrice', '评估价', '120'],
  ['depositRatio', '保证金比例', '0.1000'],
  ['depositAmount', '保证金金额', '1000'],
  ['bidIncrement', '加价幅度', '10'],
  ['announcementStartAt', '公示开始时间', new Date(Date.now() - 60 * 60 * 1000).toISOString()],
  ['announcementEndAt', '公示结束时间', new Date(Date.now() - 30 * 60 * 1000).toISOString()],
  ['biddingStartAt', '竞拍开始时间', new Date(Date.now() - 10 * 60 * 1000).toISOString()],
  ['biddingEndAt', '竞拍结束时间', new Date(Date.now() + 60 * 60 * 1000).toISOString()],
  ['customerNotice', '客户须知', '验收用客户须知'],
  ['extensionRule', '延时竞价规则说明', '本次验收不启用延时竞价'],
];
const LOT_TIME_FIELD_NAMES = new Set<keyof LotMutationPayload>([
  'deadlineAt',
  'announcementStartAt',
  'announcementEndAt',
  'biddingStartAt',
  'biddingEndAt',
]);
const LOT_MONEY_FIELD_NAMES = new Set<keyof LotMutationPayload>([
  'startPrice',
  'assessedPrice',
  'depositAmount',
  'bidIncrement',
]);
const LOT_ATTACHMENT_REQUIREMENTS: LotAttachmentRequirement[] = [
  { fieldName: 'imageOneUrl', label: '拍品图一' },
  { fieldName: 'imageTwoUrl', label: '拍品图二' },
  { fieldName: 'inspectionReportUrl', label: '检测报告' },
];
const CONTENT_CATEGORY_OPTIONS = [
  ['POLICY', '政策法规'],
  ['TRADE_ANNOUNCEMENT', '交易公告'],
  ['MINING_NEWS', '矿能动态'],
  ['BLACKLIST_RULES', '用户黑名单管理说明'],
  ['PUBLISH_REVIEW_RULES', '信息发布审核机制'],
  ['AUCTION_RULES', '竞拍规则说明'],
  ['DEPOSIT_RULES', '保证金缴纳与退还说明'],
];
const CONTENT_CATEGORY_BY_LABEL = Object.fromEntries(CONTENT_CATEGORY_OPTIONS.map(([code, label]) => [label, code]));
const CONTENT_TREE_GROUPS = [
  ['信息资讯', ['政策法规', '交易公告', '矿能动态']],
  ['公开说明', ['用户黑名单管理说明', '信息发布审核机制', '竞拍规则说明', '保证金缴纳与退还说明']],
];

export function AdminLoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123456');
  const [captcha, setCaptcha] = useState(() => createAdminCaptcha());
  const [captchaValue, setCaptchaValue] = useState('');
  const [notice, setNotice] = useState('请输入管理员账号、密码和验证码后登录。');
  const [submitting, setSubmitting] = useState(false);
  const currentProfile = getAuthProfile('ADMIN');

  const refreshCaptcha = () => {
    setCaptcha(createAdminCaptcha());
    setCaptchaValue('');
  };

  const login = async () => {
    if (submitting) {
      return;
    }

    if (!username.trim() || !password) {
      setNotice('账号和密码不能为空。');
      return;
    }

    if (Number.parseInt(captchaValue, 10) !== captcha.answer) {
      setNotice('验证码错误，请重新输入。');
      refreshCaptcha();
      return;
    }

    try {
      setSubmitting(true);
      setNotice('正在校验管理员身份...');
      const result = await api.login(username.trim(), password, 'ADMIN');

      if (result.profile.roleCode !== 'ADMIN') {
        setNotice('当前账号不是管理员，不能进入管理后台。');
        refreshCaptcha();
        return;
      }

      navigateTo('/admin/dashboard');
    } catch (error) {
      setNotice(`登录失败：${getErrorMessage(error)}`);
      refreshCaptcha();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-login-page">
      <section className="admin-login-panel">
        <div className="admin-login-brand">
          <span>华</span>
          <div>
            <strong>华宁矿产</strong>
            <small>系统管理后台</small>
          </div>
        </div>
        <div className="admin-login-copy">
          <p>矿产资源交易业务管理</p>
          <h1>后台安全登录</h1>
          <span>请使用管理员账号进入审核、交易、内容和审计工作台。</span>
        </div>
        <dl className="admin-login-assurance">
          <div>
            <dt>权限校验</dt>
            <dd>仅 ADMIN 角色可进入后台</dd>
          </div>
          <div>
            <dt>会话口径</dt>
            <dd>沿用 Bearer Token 登录态</dd>
          </div>
          <div>
            <dt>审计边界</dt>
            <dd>关键操作进入后台日志链路</dd>
          </div>
        </dl>
      </section>
      <section className="admin-login-card">
        <h2>管理员登录</h2>
        <div className={`login-alert ${notice.includes('失败') || notice.includes('错误') || notice.includes('不能') || notice.includes('不能为空') ? 'danger' : 'info'}`}>{notice}</div>
        {currentProfile ? <div className="login-current-session">当前已登录：{currentProfile.username}（{currentProfile.roleName}）</div> : null}
        <label className="field login-field">
          <span>账号</span>
          <input autoComplete="username" onChange={(event) => setUsername(event.currentTarget.value)} placeholder="请输入管理员账号" value={username} />
        </label>
        <label className="field login-field">
          <span>密码</span>
          <input autoComplete="current-password" onChange={(event) => setPassword(event.currentTarget.value)} placeholder="请输入密码" type="password" value={password} />
        </label>
        <label className="field login-field">
          <span>验证码</span>
          <div className="captcha-row">
            <input
              inputMode="numeric"
              onChange={(event) => setCaptchaValue(event.currentTarget.value)}
              placeholder="输入计算结果"
              value={captchaValue}
            />
            <button aria-label="刷新验证码" className="captcha-box" onClick={refreshCaptcha} type="button">{captcha.label}</button>
          </div>
        </label>
        <button className="btn primary login-submit" disabled={submitting} onClick={() => void login()} type="button">{submitting ? '登录中...' : '登录后台'}</button>
        <div className="login-links">
          <button onClick={() => navigateTo('/')} type="button">返回门户首页</button>
        </div>
      </section>
    </div>
  );
}

const rowActions = (onAction?: RowActionHandler, labels: RowActionLabel[] = [], getTarget?: RowNavigationHandler): TableColumn<Record<string, unknown>> => ({
  key: 'actions',
  label: '操作',
  render: (row) => {
    const visibleLabels = labels
      .map((label) => typeof label === 'function' ? label(row) : label)
      .filter((label): label is string => Boolean(label));

    return (
      <div className="inline-actions">
        {visibleLabels.map((label) => (
          <button
            className={label.includes('驳回') || label.includes('违约') || label.includes('拉黑') ? 'danger-link' : 'link-btn'}
            key={label}
            onClick={() => {
              if (label === '查看凭证' && openDepositVoucherPreview(row)) {
                return;
              }

              const target = getTarget?.(label, row);

              if (target) {
                navigateTo(target);
                return;
              }

              if (label.startsWith('查看')) {
                window.dispatchEvent(new CustomEvent<Record<string, unknown>>(ADMIN_DRAWER_SELECT_EVENT, { detail: row }));
              }

              void onAction?.(label, row);
            }}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
    );
  },
});

function renderLotCell(row: Record<string, unknown>) {
  const title = getStringValue(row, 'title') || getStringValue(row, 'lotTitle') || '-';
  const id = getStringValue(row, 'id') || getStringValue(row, 'lotId') || '暂无编号';

  return (
    <div className="admin-object-cell">
      <span aria-hidden="true">矿</span>
      <div className="admin-object-copy">
        <strong>{title}</strong>
        <small>No. {id}</small>
      </div>
    </div>
  );
}

function renderLotTitleCell(row: Record<string, unknown>) {
  const title = getStringValue(row, 'lotTitle') || getStringValue(row, 'title') || '-';
  const id = getStringValue(row, 'lotId') || getStringValue(row, 'id') || '';

  return (
    <div className="admin-title-cell">
      <strong>{title}</strong>
      {id ? <small>No. {id}</small> : null}
    </div>
  );
}

function renderEnterpriseCell(row: Record<string, unknown>) {
  const name = getStringValue(row, 'name') || '-';
  const code = getStringValue(row, 'creditCode') || '统一社会信用代码待返回';

  return (
    <div className="admin-title-cell">
      <strong>{name}</strong>
      <small>{code}</small>
    </div>
  );
}

function renderEnterpriseNameCell(row: Record<string, unknown>) {
  const name = getStringValue(row, 'enterprise') || getStringValue(row, 'enterpriseName') || getStringValue(row, 'name') || '-';

  return (
    <div className="admin-title-cell">
      <strong>{name}</strong>
      <small>意向金提交企业</small>
    </div>
  );
}

function renderDepositVoucherCell(row: Record<string, unknown>) {
  const fileName = getStringValue(row, 'voucherFileName') || getStringValue(row, 'voucher') || '查看凭证';
  const fileUrl = getStringValue(row, 'voucherFileUrl');
  const attachmentId = getStringValue(row, 'attachmentId');

  if (fileUrl || attachmentId) {
    return <button className="link-btn" onClick={() => void api.openFileUrl(fileUrl, attachmentId, 'ADMIN').catch((error: unknown) => window.alert(`凭证文件暂无法打开：${getErrorMessage(error)}`))} type="button">{fileName}</button>;
  }

  return <span>{fileName}</span>;
}

function renderEnterpriseMaterialCell(
  fileNameKey: string,
  fileUrlKey: string,
  attachmentIdKey: string,
) {
  return (row: Record<string, unknown>) => {
    const fileName = getStringValue(row, fileNameKey);
    const fileUrl = getStringValue(row, fileUrlKey);
    const attachmentId = getStringValue(row, attachmentIdKey);

    if (fileUrl) {
      return <button className="link-btn" onClick={() => void api.openFileUrl(fileUrl, attachmentId, 'ADMIN').catch((error: unknown) => window.alert(`企业材料暂无法打开：${getErrorMessage(error)}`))} type="button">{fileName || '查看材料'}</button>;
    }

    return <span>{fileName || '未提交'}</span>;
  };
}

function requestRejectReason(label = '审核驳回') {
  const reason = window.prompt(`请输入${label}原因`, '');

  if (reason === null) {
    return null;
  }

  const trimmedReason = reason.trim();

  if (!trimmedReason) {
    window.alert('驳回原因不能为空。');
    return null;
  }

  return trimmedReason;
}

function renderDepositAmountCell(row: Record<string, unknown>) {
  const required = getStringValue(row, 'requiredAmount') || getStringValue(row, 'amount') || '-';
  const paid = getStringValue(row, 'paidAmount') || getStringValue(row, 'amount') || '-';

  return (
    <div className="admin-title-cell">
      <strong>{paid}</strong>
      <small>应缴：{required}</small>
    </div>
  );
}

function renderBidSequenceCell(row: Record<string, unknown>) {
  const isHighest = Boolean(row.isHighest);

  return (
    <div className="admin-sequence-cell">
      <strong>{getStringValue(row, 'id') || '-'}</strong>
      <span className={isHighest ? 'current' : ''}>{isHighest ? '当前最高价' : '历史出价'}</span>
    </div>
  );
}

function renderBusinessTitleCell(row: Record<string, unknown>) {
  const title = getStringValue(row, 'lotTitle') || getStringValue(row, 'title') || getStringValue(row, 'objectName') || '-';
  const id = getStringValue(row, 'lotId') || getStringValue(row, 'id');

  return (
    <div className="admin-title-cell">
      <strong>{title}</strong>
      {id ? <small>No. {id}</small> : null}
    </div>
  );
}

function renderContentTitleCell(row: Record<string, unknown>) {
  const title = getStringValue(row, 'title') || '-';
  const summary = getStringValue(row, 'summary');

  return (
    <div className="admin-title-cell">
      <strong>{title}</strong>
      {summary ? <small>{summary}</small> : null}
    </div>
  );
}

function renderNotificationContentCell(row: Record<string, unknown>) {
  const lotTitle = getStringValue(row, 'lotTitle') || '-';
  const content = getStringValue(row, 'content');

  return (
    <div className="admin-title-cell">
      <strong>{lotTitle}</strong>
      {content ? <small>{content}</small> : null}
    </div>
  );
}

function renderFileNameCell(row: Record<string, unknown>) {
  const name = getStringValue(row, 'name') || '-';
  const type = getStringValue(row, 'type') || '平台文件';

  return (
    <div className="admin-file-cell">
      <span aria-hidden="true">{type.includes('图') || type.includes('照') ? '图' : '文'}</span>
      <div>
        <strong>{name}</strong>
        <small>{type}</small>
      </div>
    </div>
  );
}

function buildDashboardStats(results: Record<string, unknown>[], contracts: Record<string, unknown>[]): Stat[] {
  const completedContracts = contracts.filter((row) => getStringValue(row, 'status') === '已完成');
  const publishedResults = results.filter((row) => getStringValue(row, 'status') === '已公示');
  const pendingResults = results.filter((row) => getStringValue(row, 'status') === '已生成');
  const totalCompletedAmount = completedContracts.reduce((sum, row) => sum + parseMoneyValue(getStringValue(row, 'amount')), 0);

  return [
    { label: '成交结果', value: `${results.length} 宗`, helper: '来自后台成交结果 rows', tone: 'blue' },
    { label: '已公示结果', value: `${publishedResults.length} 宗`, helper: '成交结果状态为已公示', tone: 'green' },
    { label: '待发布公示', value: `${pendingResults.length} 宗`, helper: '成交结果状态为已生成', tone: 'orange' },
    { label: '已完成合同额', value: formatDashboardMoney(totalCompletedAmount), helper: '合同状态已完成 rows 汇总', tone: 'blue' },
  ];
}

export function AdminDashboard() {
  const [todoCounts, setTodoCounts] = useState({ lotReviews: 0, enterpriseReviews: 0, depositReviews: 0 });
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [contracts, setContracts] = useState<Record<string, unknown>[]>([]);
  const [logRows, setLogRows] = useState<Record<string, unknown>[]>([]);
  const [notice, setNotice] = useState('正在加载后台看板真实数据...');
  const [dashboardState, setDashboardState] = useState<'loading' | 'ready' | 'error'>('loading');
  const todoItems = [
    { label: '待发布复核', helper: '矿权上架前终审', value: String(todoCounts.lotReviews), tone: 'orange', to: '/admin/reviews/lots' },
    { label: '待企业认证审核', helper: '新增竞买人资质', value: String(todoCounts.enterpriseReviews), tone: 'blue', to: '/admin/reviews/enterprises' },
    { label: '待意向金凭证审核', helper: '线下汇款确认', value: String(todoCounts.depositReviews), tone: 'red', to: '/admin/reviews/deposits' },
  ];
  const stats = buildDashboardStats(results, contracts);
  const recentResults = results.slice(0, 5);
  const recentLogs = logRows.slice(0, 4);

  const loadDashboard = useCallback(async () => {
    if (!canLoadAdminData()) {
      setResults([]);
      setContracts([]);
      setLogRows([]);
      setNotice('请先登录管理员账号后访问管理后台。');
      setDashboardState('error');
      return;
    }

    try {
      const [counts, nextResults, nextContracts, nextLogs] = await Promise.all([
        api.fetchAdminTodoCounts(),
        api.fetchAdminResults(),
        api.fetchAdminContracts(),
        api.fetchAdminLogs(),
      ]);

      setTodoCounts(counts);
      setResults(nextResults as unknown as Record<string, unknown>[]);
      setContracts(nextContracts as unknown as Record<string, unknown>[]);
      setLogRows(nextLogs as unknown as Record<string, unknown>[]);
      setNotice('已加载后台看板真实数据；统计由成交结果、合同和日志 rows 计算。');
      setDashboardState('ready');
    } catch (error) {
      setTodoCounts({ lotReviews: 0, enterpriseReviews: 0, depositReviews: 0 });
      setResults([]);
      setContracts([]);
      setLogRows([]);
      setNotice(`后台看板真实接口暂不可用：${getErrorMessage(error)}`);
      setDashboardState('error');
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadDashboard();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadDashboard]);

  return (
    <AdminLayout active="首页看板">
      <PageHead title="后台首页/数据看板" subtitle="查看成交统计、审核待办与最近操作。" />
      <SectionHeader title="待办审核" subtitle="管理员登录后优先处理发布复核、企业认证和意向金凭证。" />
      <p className="admin-api-notice">{notice}</p>
      {dashboardState === 'loading' ? <TableSkeleton columns={3} rows={3} /> : null}
      {dashboardState === 'error' ? (
        <ErrorState
          description={notice}
          primaryAction={{ label: '重试', onClick: () => void loadDashboard() }}
          secondaryAction={{ label: '联系技术支持', to: '/admin/logs' }}
        />
      ) : null}
      {dashboardState === 'ready' ? (
        <section className="admin-todo-grid" aria-label="待办事项">
          {todoItems.map((item) => (
            <button className={`admin-todo-card ${item.tone}`} key={item.label} onClick={() => navigateTo(item.to)} type="button">
              <span aria-hidden="true">{item.tone === 'orange' ? '!' : item.tone === 'red' ? '￥' : '企'}</span>
              <strong>{item.label}</strong>
              <small>{item.helper}</small>
              <b>{item.value}</b>
              <em>去审核</em>
            </button>
          ))}
        </section>
      ) : null}
      <SectionHeader title="交易数据看板" />
      {dashboardState === 'loading' ? <TableSkeleton columns={4} rows={2} /> : null}
      {dashboardState === 'ready' ? (
        <>
          <StatCards stats={stats} />
          <section className="admin-dashboard-grid">
            <div className="admin-panel admin-panel-wide">
              <SectionHeader action="查看全部" actionTo="/admin/results" title="最近成交结果公示" />
              <DataTable
                columns={[
                  { key: 'lotTitle', label: '矿权名称', width: '38%' },
                  { key: 'finalPrice', label: '成交价' },
                  { key: 'winner', label: '竞得人' },
                  { key: 'status', label: '状态', render: (row) => <StatusTag value={String(row.status)} /> },
                ]}
                emptyText="暂无成交结果"
                emptyDescription="真实成交结果接口当前未返回记录。"
                rows={recentResults}
              />
            </div>
            <aside className="admin-panel admin-log-panel">
              <SectionHeader action="完整审计" actionTo="/admin/logs" title="系统操作日志" />
              {recentLogs.length ? (
                <div className="admin-log-list">
                  {recentLogs.map((log) => (
                    <article key={String(log.id)}>
                      <span aria-hidden="true" />
                      <small>{getStringValue(log, 'operatedAt')} · {getStringValue(log, 'operator')}</small>
                      <p>{getStringValue(log, 'action')}：{getStringValue(log, 'objectName')}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState compact description="真实操作日志接口当前未返回记录。" title="暂无操作日志" />
              )}
            </aside>
          </section>
        </>
      ) : null}
    </AdminLayout>
  );
}

export function LotManagementPage() {
  const handleAction = useAdminRowAction({
    提交复核: (id) => api.submitLotReview(id),
    '关闭/取消': (id) => api.closeLot(id),
    进入竞拍: (id) => api.advanceLotToBidding(id),
  }, {
    进入竞拍: (row) => ({
      message: `${getStringValue(row, 'title') || '拍品'}已提交进入竞拍请求。`,
      actions: [
        { label: '查看流程进度', tone: 'primary', to: getLotProgressTarget(row) },
        { label: '刷新列表', onClick: () => window.dispatchEvent(new Event(ADMIN_LIST_REFRESH_EVENT)) },
      ],
    }),
  });

  return <AdminListPage config={{
    title: '拍品管理列表页',
    active: '拍品管理',
    subActive: '拍品管理',
    filters: ['关键词', '拍品状态', '竞拍时间', '供应商'],
    loadRows: () => api.fetchAdminLots() as Promise<unknown> as Promise<Record<string, unknown>[]>,
    tableClassName: 'lot-management-table',
    columns: [
      { key: 'title', label: '拍品信息', width: '30%', render: renderLotCell },
      { key: 'startPrice', label: '起拍价', width: '8%' },
      { key: 'quantity', label: '数量', width: '8%' },
      { key: 'supplier', label: '供应商', width: '12%' },
      { key: 'status', label: '状态', width: '9%', render: (row) => <StatusTag value={String(row.status)} /> },
      { key: 'auctionTime', label: '竞拍期', width: '12%' },
      { key: 'updatedAt', label: '更新时间', width: '10%' },
      { ...rowActions(handleAction, ['查看', '编辑', '提交复核', getLotBiddingActionLabel, '关闭/取消'], getLotManagementTarget), width: '11%' },
    ],
    topActions: [
      { label: '新建拍品', tone: 'primary', to: '/admin/lots/edit' },
    ],
    drawerTitle: '拍品详情',
    drawerSections: ['基础信息', '竞价规则', '保证金规则', '时间规则', '附件与检测报告'],
  }} />;
}

export function LotEditPage() {
  const [notice, setNotice] = useState('请保存草稿或填写 URL 参数 id 后编辑拍品。');
  const [uploadingField, setUploadingField] = useState<string>();
  const [uploadStates, setUploadStates] = useState<Partial<Record<LotUploadTarget['fieldName'], LotUploadState>>>({});
  const [additionalImages, setAdditionalImages] = useState<AdditionalLotImageState[]>([]);
  const [imagePreview, setImagePreview] = useState<AdminImagePreviewState | null>(null);
  const [submittingAction, setSubmittingAction] = useState<'draft' | 'review' | null>(null);
  const uploadPreviewUrlsRef = useRef(new Set<string>());
  const lotId = new URLSearchParams(window.location.search).get('id') ?? undefined;
  const [assessedPrice, setAssessedPrice] = useState(() => lotId ? getLotFieldDefaultValue('assessedPrice') : '');
  const [depositRatio, setDepositRatio] = useState(() => lotId ? getLotFieldDefaultValue('depositRatio') : '');
  const depositAmount = calculateLotDepositAmount(assessedPrice, depositRatio);
  const formGroups: Array<[string, Array<[keyof LotMutationPayload, string, string]>]> = [
    ['基础信息', LOT_FORM_FIELDS.slice(0, 10)],
    ['商品与附件', LOT_FORM_FIELDS.slice(10, 11)],
    ['竞价业务配置', LOT_FORM_FIELDS.slice(11, 15)],
    ['时间规则', LOT_FORM_FIELDS.slice(15, 19)],
    ['客户须知与延时竞价', LOT_FORM_FIELDS.slice(19)],
  ];
  const uploadTargets: LotUploadTarget[] = [
    { label: '上传图片', fieldName: 'imageOneUrl', category: 'LOT_IMAGE', accept: 'image/jpeg,image/png', helper: '拍品图一，支持 JPG/PNG，成功后回填 URL' },
    { label: '上传图片', fieldName: 'imageTwoUrl', category: 'LOT_IMAGE', accept: 'image/jpeg,image/png', helper: '拍品图二，支持 JPG/PNG，成功后回填 URL' },
    { label: '检测报告', fieldName: 'inspectionReportUrl', category: 'INSPECTION_REPORT', accept: 'application/pdf', helper: '支持 PDF，成功后回填检测报告 URL' },
  ];

  useEffect(() => () => {
    uploadPreviewUrlsRef.current.forEach((previewUrl) => window.URL.revokeObjectURL(previewUrl));
    uploadPreviewUrlsRef.current.clear();
  }, []);

  useEffect(() => {
    if (!lotId) {
      return;
    }

    let ignore = false;

    void api.fetchAdminLots().then((lots) => lots.find((item) => item.id === lotId) ?? api.fetchLot(lotId)).then((lot) => {
      if (ignore) {
        return;
      }

      const nextStates: Partial<Record<LotUploadTarget['fieldName'], LotUploadState>> = {};
      const nextValues: Partial<Record<LotUploadTarget['fieldName'], string | undefined>> = {
        imageOneUrl: lot.imageOneUrl,
        imageTwoUrl: lot.imageTwoUrl,
        inspectionReportUrl: lot.inspectionReports?.[0]?.fileUrl,
      };
      const mainImageFileIds = new Set(
        [lot.imageOneUrl, lot.imageTwoUrl]
          .map(extractFileContentId)
          .filter((id): id is string => Boolean(id)),
      );
      const nextAdditionalImages = (lot.attachments ?? [])
        .filter((attachment) => attachment.category === 'LOT_IMAGE')
        .filter((attachment) => {
          const attachmentId = extractFileContentId(attachment.fileUrl) ?? attachment.id;

          return !mainImageFileIds.has(attachmentId);
        })
        .map((attachment) => ({
          id: attachment.id,
          fileName: attachment.fileName,
          fileUrl: attachment.fileUrl,
          isImage: true,
          persisted: true,
        }));

      LOT_ATTACHMENT_REQUIREMENTS.forEach(({ fieldName }) => {
        const fileUrl = nextValues[fieldName]?.trim();

        if (!fileUrl) {
          return;
        }

        const input = document.querySelector<HTMLInputElement>(`#admin-lot-form input[name="${fieldName}"]`);

        if (input) {
          input.value = fileUrl;
        }

        nextStates[fieldName] = {
          fileName: fieldName === 'inspectionReportUrl' ? '检测报告' : fieldName === 'imageOneUrl' ? '拍品图一' : '拍品图二',
          fileUrl,
          isImage: fieldName !== 'inspectionReportUrl',
          persisted: true,
        };
      });

      setUploadStates((current) => ({ ...nextStates, ...current }));
      setAdditionalImages(nextAdditionalImages);
    }).catch((error) => {
      if (!ignore) {
        setNotice(`拍品图片信息读取失败：${getErrorMessage(error)}`);
      }
    });

    return () => {
      ignore = true;
    };
  }, [lotId]);

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>, target: LotUploadTarget) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';

    if (!file) {
      return;
    }

    const isImage = file.type.startsWith('image/');
    const previewUrl = isImage ? window.URL.createObjectURL(file) : undefined;

    if (previewUrl) {
      uploadPreviewUrlsRef.current.add(previewUrl);
    }

    try {
      setUploadingField(target.fieldName);
      setNotice(`正在上传${target.label}：${file.name}`);
      const result = await api.uploadFile(file, target.category, lotId);
      const input = document.querySelector<HTMLInputElement>(`#admin-lot-form input[name="${target.fieldName}"]`);

      if (input) {
        input.value = result.fileUrl;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }

      setUploadStates((current) => {
        const previousPreview = current[target.fieldName]?.previewUrl;

        if (previousPreview) {
          window.URL.revokeObjectURL(previousPreview);
          uploadPreviewUrlsRef.current.delete(previousPreview);
        }

        return {
          ...current,
          [target.fieldName]: {
            fileName: result.fileName || file.name,
            fileUrl: result.fileUrl,
            previewUrl,
            isImage,
          },
        };
      });
      setNotice(`${target.label}上传成功，已回填真实文件 URL：${result.fileUrl}`);
    } catch (error) {
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
        uploadPreviewUrlsRef.current.delete(previewUrl);
      }
      setNotice(`${target.label}上传失败：${getErrorMessage(error)}。请重新选择文件，页面不会伪造成功 URL。`);
    } finally {
      setUploadingField(undefined);
    }
  };

  const clearUpload = (fieldName: LotUploadTarget['fieldName']) => {
    setUploadStates((current) => {
      const next = { ...current };
      const previousPreview = next[fieldName]?.previewUrl;

      if (previousPreview) {
        window.URL.revokeObjectURL(previousPreview);
        uploadPreviewUrlsRef.current.delete(previousPreview);
      }

      delete next[fieldName];
      return next;
    });

    const input = document.querySelector<HTMLInputElement>(`#admin-lot-form input[name="${fieldName}"]`);

    if (input) {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
  };

  const handleAdditionalImagesUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = '';

    if (files.length === 0) {
      return;
    }

    const uploadedImages: AdditionalLotImageState[] = [];

    try {
      setUploadingField('additionalImageUrls');
      setNotice(`正在上传更多拍品图片：${files.map((file) => file.name).join('、')}`);

      for (const file of files) {
        const previewUrl = window.URL.createObjectURL(file);
        uploadPreviewUrlsRef.current.add(previewUrl);

        try {
          const result = await api.uploadFile(file, 'LOT_IMAGE', lotId);
          uploadedImages.push({
            id: result.id,
            fileName: result.fileName || file.name,
            fileUrl: result.fileUrl,
            previewUrl,
            isImage: true,
          });
        } catch (error) {
          window.URL.revokeObjectURL(previewUrl);
          uploadPreviewUrlsRef.current.delete(previewUrl);
          throw error;
        }
      }

      setAdditionalImages((current) => [...current, ...uploadedImages]);
      setNotice(`更多拍品图片上传成功：${uploadedImages.length} 张。`);
    } catch (error) {
      if (uploadedImages.length > 0) {
        setAdditionalImages((current) => [...current, ...uploadedImages]);
      }

      setNotice(`更多拍品图片上传失败：${getErrorMessage(error)}。已成功上传的图片会保留，失败文件请重新选择。`);
    } finally {
      setUploadingField(undefined);
    }
  };

  const clearAdditionalImage = (imageId: string) => {
    setAdditionalImages((current) => current.filter((image) => {
      if (image.id !== imageId) {
        return true;
      }

      if (image.previewUrl) {
        window.URL.revokeObjectURL(image.previewUrl);
        uploadPreviewUrlsRef.current.delete(image.previewUrl);
      }

      return false;
    }));
  };

  const openUploadedFile = (state: LotUploadState, title = state.fileName) => {
    if (state.isImage) {
      setImagePreview({
        src: state.previewUrl || state.fileUrl,
        title,
        subtitle: state.fileName,
      });
      return;
    }

    void api.openFileUrl(state.fileUrl, undefined, 'ADMIN').catch((error: unknown) => window.alert(`文件暂无法打开：${getErrorMessage(error)}`));
  };

  const submitLot = async (submitReview: boolean) => {
    const form = document.querySelector<HTMLFormElement>('#admin-lot-form');

    if (!form || submittingAction) {
      return;
    }

    const formData = new FormData(form);
    const payload = buildLotPayload(formData);
    const missingAttachments: string[] = [];

    LOT_ATTACHMENT_REQUIREMENTS.forEach(({ fieldName, label }) => {
      const uploadedUrl = uploadStates[fieldName]?.fileUrl.trim();
      const fallbackUrl = payload[fieldName]?.trim();
      const fileUrl = uploadedUrl || fallbackUrl;

      payload[fieldName] = fileUrl;

      const input = form.querySelector<HTMLInputElement>(`input[name="${fieldName}"]`);

      if (input) {
        input.value = fileUrl;
      }

      if (!fileUrl) {
        missingAttachments.push(label);
      }
    });

    if (missingAttachments.length > 0) {
      setNotice(`请先上传：${missingAttachments.join('、')}。`);
      return;
    }

    payload.additionalImageUrls = additionalImages.map((image) => image.fileUrl);

    let keepDisabledAfterSuccess = false;

    try {
      setSubmittingAction(submitReview ? 'review' : 'draft');
      setNotice(submitReview ? '正在提交发布复核，请稍候...' : '正在保存拍品草稿，请稍候...');
      const saved = lotId ? await api.updateLot(lotId, payload) : await api.createLot(payload);

      if (submitReview) {
        await api.submitLotReview(saved.id);
      }

      if (submitReview) {
        keepDisabledAfterSuccess = true;
        setNotice('提交成功，已进入发布复核。');
        window.setTimeout(() => navigateTo('/admin/lots'), 700);
        return;
      }

      setNotice('拍品草稿已通过真实接口保存。');
    } catch (error) {
      setNotice(`拍品保存失败：${getErrorMessage(error)}`);
    } finally {
      if (!keepDisabledAfterSuccess) {
        setSubmittingAction(null);
      }
    }
  };

  return (
    <AdminLayout active="拍品管理" subActive="新建/编辑拍品">
      <AdminImagePreviewModal preview={imagePreview} onClose={() => setImagePreview(null)} />
      <PageHead title="新建/编辑拍品页" subtitle="填写拍品信息并保存草稿或提交发布复核。" />
      <p className="admin-api-notice">{notice}</p>
      <form className="long-form admin-form" id="admin-lot-form">
        <input defaultValue="" name="imageOneUrl" type="hidden" />
        <input defaultValue="" name="imageTwoUrl" type="hidden" />
        <input defaultValue="" name="inspectionReportUrl" type="hidden" />
        {formGroups.map(([title, fields]) => (
          <fieldset key={title}>
            <legend>{title}</legend>
            {title === '商品与附件' ? (
              <>
                <div className="admin-upload-grid" aria-label="拍品附件上传">
                  {uploadTargets.map((target) => {
                    const uploadState = uploadStates[target.fieldName];
                    const isUploading = uploadingField === target.fieldName;
                    const isInspectionReport = target.category === 'INSPECTION_REPORT';
                    const isPdfUpload = Boolean(uploadState && !uploadState.isImage && (isInspectionReport || uploadState.fileName.toLowerCase().endsWith('.pdf')));
                    const viewLabel = uploadState?.isImage ? '查看大图' : isPdfUpload ? '预览 PDF' : '预览文件';

                    if (uploadState) {
                      return (
                        <div className="admin-upload-card admin-upload-result" key={target.fieldName}>
                          <span className="admin-upload-preview">
                            {uploadState.isImage ? (
                              <img
                                alt={`${target.label}预览`}
                                onClick={() => openUploadedFile(uploadState, target.label)}
                                src={uploadState.previewUrl || uploadState.fileUrl}
                              />
                            ) : (
                              <button
                                aria-label={`${viewLabel}：${uploadState.fileName}`}
                                className="admin-upload-file-preview"
                                onClick={() => openUploadedFile(uploadState)}
                                type="button"
                              >
                                <span className="admin-upload-file-badge">{isPdfUpload ? 'PDF' : '文件'}</span>
                                <span className="admin-upload-file-title">{isInspectionReport ? '检测报告' : '文件已上传'}</span>
                                <span className="admin-upload-file-state">{isPdfUpload ? 'PDF 已上传' : '文件已上传'}</span>
                                <span className="admin-upload-file-hint">可预览文件</span>
                              </button>
                            )}
                          </span>
                          <div className="admin-upload-status">
                            <span title={uploadState.fileName}>{uploadState.fileName}</span>
                            <div className="admin-upload-links">
                              <button onClick={() => openUploadedFile(uploadState, target.label)} type="button">
                                {viewLabel}
                              </button>
                              <button onClick={() => clearUpload(target.fieldName)} type="button">
                                移除
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <label className="admin-upload-card admin-upload-action" key={target.fieldName}>
                        <input
                          accept={target.accept}
                          data-upload-field={target.fieldName}
                          onChange={(event) => void handleUpload(event, target)}
                          type="file"
                        />
                        <span className="admin-upload-preview" aria-hidden="true">
                          <span className="admin-upload-placeholder" aria-hidden="true">{target.category === 'INSPECTION_REPORT' ? '文' : '+'}</span>
                        </span>
                        <strong>{target.label}</strong>
                        <small>{isUploading ? '上传中...' : target.helper}</small>
                        <div className="admin-upload-status">
                          <span>未选择文件</span>
                          <em>{isUploading ? '上传中' : '等待上传'}</em>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <div className="admin-additional-images" aria-label="更多拍品图片">
                  <div className="admin-additional-images-head">
                    <div>
                      <strong>更多拍品图片</strong>
                      <span>可选，支持一次选择多张 JPG/PNG</span>
                    </div>
                    <label className="btn secondary">
                      {uploadingField === 'additionalImageUrls' ? '上传中...' : '上传更多图片'}
                      <input
                        accept="image/jpeg,image/png"
                        multiple
                        onChange={(event) => void handleAdditionalImagesUpload(event)}
                        type="file"
                      />
                    </label>
                  </div>
                  {additionalImages.length > 0 ? (
                    <div className="admin-upload-grid admin-upload-grid-extra">
                      {additionalImages.map((image) => (
                        <div className="admin-upload-card admin-upload-result" key={image.id}>
                          <span className="admin-upload-preview">
                            <img
                              alt={`${image.fileName}预览`}
                              onClick={() => openUploadedFile(image)}
                              src={image.previewUrl || image.fileUrl}
                            />
                          </span>
                          <div className="admin-upload-status">
                            <span title={image.fileName}>{image.fileName}</span>
                            <div className="admin-upload-links">
                              <button onClick={() => openUploadedFile(image)} type="button">
                                查看大图
                              </button>
                              <button onClick={() => clearAdditionalImage(image.id)} type="button">
                                移除
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="admin-additional-images-empty">暂无更多拍品图片</p>
                  )}
                </div>
              </>
            ) : null}
            {fields.length > 0 && title !== '商品与附件' ? <div className="form-grid">
              {fields.map(([name, label, value]) => {
                if (name === 'assessedPrice') {
                  return <LotFormField key={name} label={label} name={name} onValueChange={setAssessedPrice} value={assessedPrice} />;
                }

                if (name === 'depositRatio') {
                  return <LotFormField key={name} label={label} name={name} onValueChange={setDepositRatio} value={depositRatio} />;
                }

                if (name === 'depositAmount') {
                  return <LotFormField key={name} label={label} name={name} readOnly value={depositAmount} />;
                }

                return <LotFormField key={name} label={label} name={name} value={lotId ? value : ''} />;
              })}
              {title === '客户须知与延时竞价' ? (
                <label className="field">
                  <span>是否启用延时竞价</span>
                  <select defaultValue="false" name="extensionEnabled">
                    <option value="false">否</option>
                    <option value="true">是</option>
                  </select>
                </label>
              ) : null}
            </div> : null}
          </fieldset>
        ))}
        <div className="sticky-actions">
          <div className="button-row">
            <button className="btn secondary" disabled={Boolean(submittingAction)} onClick={() => void submitLot(false)} type="button">
              {submittingAction === 'draft' ? '保存中...' : '保存草稿'}
            </button>
            <button className="btn primary" disabled={Boolean(submittingAction)} onClick={() => void submitLot(true)} type="button">
              {submittingAction === 'review' ? '提交中...' : '提交复核'}
            </button>
            <button className="btn secondary" onClick={() => navigateTo('/admin/lots')} type="button">取消</button>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
}

function LotFormField({
  label,
  name,
  onValueChange,
  readOnly = false,
  value,
}: {
  label: string;
  name: keyof LotMutationPayload;
  onValueChange?: (value: string) => void;
  readOnly?: boolean;
  value: string;
}) {
  const isTimeField = LOT_TIME_FIELD_NAMES.has(name);
  const isMoneyField = LOT_MONEY_FIELD_NAMES.has(name);
  const [moneyValue, setMoneyValue] = useState(value);
  const inputValue = isTimeField ? toDateTimeLocalValue(value) : value;
  const isControlled = Boolean(onValueChange) || readOnly;
  const moneyHintValue = isControlled ? value : moneyValue;

  return (
    <label className="field" key={name}>
      <span>{label}</span>
      <input
        defaultValue={isControlled ? undefined : inputValue}
        inputMode={isMoneyField ? 'decimal' : undefined}
        name={name}
        onChange={(event) => {
          if (isMoneyField) {
            setMoneyValue(event.currentTarget.value);
          }

          onValueChange?.(event.currentTarget.value);
        }}
        placeholder={`请输入${label}`}
        readOnly={readOnly}
        step={isTimeField ? 60 : undefined}
        type={isTimeField ? 'datetime-local' : 'text'}
        value={isControlled ? inputValue : undefined}
      />
      {isMoneyField ? <small className="money-unit-hint">{formatLargeMoneyUnit(moneyHintValue)}</small> : null}
    </label>
  );
}

function AdminImagePreviewModal({
  onClose,
  preview,
}: {
  onClose: () => void;
  preview: AdminImagePreviewState | null;
}) {
  useEffect(() => {
    if (!preview) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, preview]);

  if (!preview) {
    return null;
  }

  return (
    <div className="admin-image-modal-backdrop" onClick={onClose} role="presentation">
      <section
        aria-label={preview.title}
        aria-modal="true"
        className="admin-image-modal-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header>
          <div>
            <span>图片预览</span>
            <h2>{preview.title}</h2>
            {preview.subtitle && preview.subtitle !== preview.title ? <p>{preview.subtitle}</p> : null}
          </div>
          <button aria-label="关闭图片预览" onClick={onClose} type="button">x</button>
        </header>
        <div className="admin-image-modal-body">
          <img alt={preview.title} src={preview.src} />
        </div>
      </section>
    </div>
  );
}

function getLotFieldDefaultValue(name: keyof LotMutationPayload): string {
  return LOT_FORM_FIELDS.find(([fieldName]) => fieldName === name)?.[2] ?? '';
}

function extractFileContentId(fileUrl?: string): string | undefined {
  return fileUrl?.match(/\/files\/(?:content|public)\/([^/?#]+)/)?.[1];
}

function calculateLotDepositAmount(assessedPrice: string, depositRatio: string): string {
  if (!assessedPrice || !depositRatio) {
    return '';
  }

  const amount = Number(assessedPrice) * Number(depositRatio);

  if (!Number.isFinite(amount)) {
    return '';
  }

  return formatUnitNumber(amount);
}

export function LotReviewPage() {
  const handleAction = useAdminRowAction({
    审核通过: (id) => api.approveLotReview(id),
    审核驳回: (id) => {
      const rejectReason = requestRejectReason();

      return rejectReason ? api.rejectLotReview(id, rejectReason) : Promise.resolve(false);
    },
  }, {
    审核通过: () => ({
      message: '拍品发布复核已通过。',
      actions: [
        { label: '返回待办', to: '/admin/dashboard' },
        { label: '去拍品列表', tone: 'primary', to: '/admin/lots' },
      ],
    }),
    审核驳回: () => ({
      message: '拍品发布复核已驳回。',
      actions: [
        { label: '返回待办', to: '/admin/dashboard' },
        { label: '继续审核下一条', tone: 'primary', onClick: () => window.dispatchEvent(new Event(ADMIN_LIST_REFRESH_EVENT)) },
      ],
    }),
  });

  return <AdminListPage config={{
    title: '拍品发布复核页',
    active: '审核管理',
    subActive: '拍品发布复核',
    filters: ['关键词', '审核状态', '提交时间'],
    loadRows: () => api.fetchAdminLotReviews() as Promise<unknown> as Promise<Record<string, unknown>[]>,
    columns: [
      { key: 'title', label: '拍品信息', width: '28%', render: renderLotCell },
      { key: 'supplier', label: '提交人' },
      { key: 'startPrice', label: '起拍价' },
      { key: 'deposit', label: '保证金金额' },
      { key: 'auctionTime', label: '竞拍时间' },
      { key: 'status', label: '状态', render: (row) => <StatusTag value={String(row.status)} /> },
      rowActions(handleAction, ['审核通过', '审核驳回']),
    ],
    batchReview: {
      approve: (id) => api.approveLotReview(id),
      reject: (id, rejectReason) => api.rejectLotReview(id, rejectReason),
      itemLabel: '拍品发布审核',
      isSelectable: (row) => getStringValue(row, 'status') === '待发布复核',
    },
    drawerTitle: '拍品复核详情',
    drawerSections: ['商品基础信息', '竞价规则', '保证金规则', '客户须知', '附件与检测报告', '驳回原因'],
  }} />;
}

export function EnterpriseReviewPage() {
  const handleAction = useAdminRowAction({
    审核通过: (id) => api.approveEnterpriseReview(id),
    审核驳回: (id) => {
      const rejectReason = requestRejectReason();

      return rejectReason ? api.rejectEnterpriseReview(id, rejectReason) : Promise.resolve(false);
    },
  });

  return <AdminListPage config={{
    title: '企业认证审核页',
    active: '审核管理',
    subActive: '企业认证审核',
    filters: ['企业名称', '审核状态', '提交时间'],
    loadRows: () => api.fetchAdminEnterpriseReviews() as Promise<unknown> as Promise<Record<string, unknown>[]>,
    columns: [
      { key: 'name', label: '企业资料', width: '26%', render: renderEnterpriseCell },
      { key: 'contact', label: '联系人' },
      { key: 'phone', label: '联系电话' },
      { key: 'category', label: '用户类别' },
      { key: 'type', label: '用户类型' },
      { key: 'status', label: '审核状态', render: (row) => <StatusTag value={String(row.status)} /> },
      { key: 'submittedAt', label: '提交时间' },
      { key: 'businessLicenseFileName', label: '营业执照', render: renderEnterpriseMaterialCell('businessLicenseFileName', 'businessLicenseFileUrl', 'businessLicenseAttachmentId') },
      { key: 'qualificationFileName', label: '企业资质', render: renderEnterpriseMaterialCell('qualificationFileName', 'qualificationFileUrl', 'qualificationAttachmentId') },
      rowActions(handleAction, ['查看', '审核通过', '审核驳回'], getEnterpriseReviewTarget),
    ],
    batchReview: {
      approve: (id) => api.approveEnterpriseReview(id),
      reject: (id, rejectReason) => api.rejectEnterpriseReview(id, rejectReason),
      itemLabel: '企业认证审核',
      isSelectable: (row) => getStringValue(row, 'status') === '待审核',
    },
  }} />;
}

export function EnterpriseReviewDetailPage() {
  const [row, setRow] = useState<Record<string, unknown> | null>(null);
  const [notice, setNotice] = useState('正在加载企业认证资料。');
  const [pageState, setPageState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [submitting, setSubmitting] = useState('');
  const enterpriseId = getQueryParam('id') ?? '';

  const loadDetail = useCallback(async () => {
    if (!canLoadAdminData()) {
      setRow(null);
      setNotice('请先登录管理员账号后访问企业认证详情。');
      setPageState('error');
      return;
    }

    if (!enterpriseId) {
      setRow(null);
      setNotice('当前链接缺少企业认证记录 ID。');
      setPageState('empty');
      return;
    }

    try {
      const rows = await api.fetchAdminEnterpriseReviews() as unknown as Record<string, unknown>[];
      const matched = rows.find((item) => getRowId(item) === enterpriseId);

      if (!matched) {
        setRow(null);
        setNotice('未找到对应企业认证记录，可能已被处理或当前账号无权限查看。');
        setPageState('empty');
        return;
      }

      setRow(matched);
      setNotice('已加载企业认证资料。');
      setPageState('ready');
    } catch (error) {
      setRow(null);
      setNotice(`企业认证详情暂不可用：${getErrorMessage(error)}`);
      setPageState('error');
    }
  }, [enterpriseId]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void loadDetail();
    }, 0);

    return () => window.clearTimeout(loadTimer);
  }, [loadDetail]);

  const review = async (label: '审核通过' | '审核驳回') => {
    if (!row || submitting) {
      return;
    }

    const id = getRowId(row);

    if (!id) {
      setNotice('当前记录缺少 ID，无法调用后台接口。');
      return;
    }

    try {
      if (label === '审核通过') {
        setSubmitting(label);
        await api.approveEnterpriseReview(id);
      } else {
        const rejectReason = requestRejectReason();

        if (!rejectReason) {
          return;
        }

        setSubmitting(label);
        await api.rejectEnterpriseReview(id, rejectReason);
      }
      setNotice(`${label}已提交，正在刷新企业资料。`);
      await loadDetail();
    } catch (error) {
      setNotice(`${label}失败：${getErrorMessage(error)}。页面数据已保持不变。`);
    } finally {
      setSubmitting('');
    }
  };

  return (
    <AdminLayout active="审核管理" subActive="企业认证审核">
      <PageHead
        actions={[{ label: '返回列表', to: '/admin/reviews/enterprises' }]}
        title="企业资料详情"
        subtitle="独立查看企业认证资料，文件材料通过后台附件接口打开。"
      />
      <p className="admin-api-notice">{notice}</p>
      {pageState === 'loading' ? <TableSkeleton columns={2} rows={6} /> : null}
      {pageState === 'error' ? (
        <ErrorState
          description={notice}
          primaryAction={{ label: '重试', onClick: () => void loadDetail() }}
          secondaryAction={{ label: '返回企业认证审核列表', to: '/admin/reviews/enterprises' }}
        />
      ) : null}
      {pageState === 'empty' ? (
        <EmptyState
          title="未找到企业认证记录"
          description={notice}
          primaryAction={{ label: '返回企业认证审核列表', to: '/admin/reviews/enterprises' }}
        />
      ) : null}
      {pageState === 'ready' && row ? (
        <section className="admin-detail-page-card">
          <header>
            <div>
              <span>企业认证</span>
              <h2>{getStringValue(row, 'name') || '未命名企业'}</h2>
              <p>统一社会信用代码：{getStringValue(row, 'creditCode') || '-'}</p>
            </div>
            <StatusTag value={getStringValue(row, 'status') || '-'} />
          </header>
          <EnterpriseMaterialPreview items={getEnterpriseMaterialItems(row)} />
          <dl className="admin-detail-grid">
            {getEnterpriseReviewDetailItems(row).map((item) => (
              <div key={item.label}>
                <dt>{item.label}</dt>
                <dd>
                  {item.fileUrl ? (
                    <button
                      className="link-btn"
                      onClick={() => void api.openFileUrl(item.fileUrl as string, item.attachmentId, 'ADMIN').catch((error: unknown) => window.alert(`企业材料暂无法打开：${getErrorMessage(error)}`))}
                      type="button"
                    >
                      {item.value || '查看附件'}
                    </button>
                  ) : item.value || '-'}
                </dd>
              </div>
            ))}
          </dl>
          <footer className="button-row">
            <button className="btn secondary" onClick={() => navigateTo('/admin/reviews/enterprises')} type="button">返回列表</button>
            <button className="btn primary" disabled={Boolean(submitting)} onClick={() => void review('审核通过')} type="button">
              {submitting === '审核通过' ? '提交中...' : '审核通过'}
            </button>
            <button className="btn danger" disabled={Boolean(submitting)} onClick={() => void review('审核驳回')} type="button">
              {submitting === '审核驳回' ? '提交中...' : '审核驳回'}
            </button>
          </footer>
        </section>
      ) : null}
    </AdminLayout>
  );
}

export function DepositReviewPage() {
  const handleAction = useAdminRowAction({
    审核通过: (id) => api.approveDepositReview(id),
    审核驳回: (id) => {
      const rejectReason = requestRejectReason();

      return rejectReason ? api.rejectDepositReview(id, rejectReason) : Promise.resolve(false);
    },
  }, {
    审核通过: (row) => ({
      message: `${getStringValue(row, 'enterprise') || '企业'}的意向金凭证已审核通过。`,
      actions: [
        { label: '继续审核下一条', tone: 'primary', onClick: () => window.dispatchEvent(new Event(ADMIN_LIST_REFRESH_EVENT)) },
        { label: '返回待办', to: '/admin/dashboard' },
        { label: '去拍品列表', to: '/admin/lots' },
        { label: '推进竞拍', to: getLotAdminTarget(row) },
      ],
    }),
    审核驳回: (row) => ({
      message: `${getStringValue(row, 'enterprise') || '企业'}的意向金凭证已驳回。`,
      actions: [
        { label: '继续审核下一条', tone: 'primary', onClick: () => window.dispatchEvent(new Event(ADMIN_LIST_REFRESH_EVENT)) },
        { label: '返回待办', to: '/admin/dashboard' },
      ],
    }),
  });

  return <DepositReviewWorkspace
    batchReview={{
      approve: (id) => api.approveDepositReview(id),
      reject: (id, rejectReason) => api.rejectDepositReview(id, rejectReason),
      itemLabel: '意向金凭证审核',
      isSelectable: (row) => getStringValue(row, 'status') === '待审核',
    }}
    handleAction={handleAction}
  />;
}

export function BidManagementPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [filters, setFilters] = useState<FilterValues>({});
  const [notice, setNotice] = useState('正在读取后台拍品和出价记录。');
  const [listState, setListState] = useState<'loading' | 'ready' | 'error'>('loading');
  const filteredRows = filterRowsByText(rows, filters);

  const loadRows = useCallback(async () => {
    if (!canLoadAdminData()) {
      setRows([]);
      setNotice('请先登录管理员账号后访问交易管理。');
      setListState('error');
      return;
    }

    try {
      const [lots, bids] = await Promise.all([
        api.fetchAdminLots(),
        api.fetchAdminBids(),
      ]);
      setRows(buildBidLotRows(lots, bids));
      setNotice('已按拍品维度汇总出价记录。');
      setListState('ready');
    } catch (error) {
      setRows([]);
      setNotice(`拍品竞价管理真实接口暂不可用：${getErrorMessage(error)}`);
      setListState('error');
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRows();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadRows]);

  return (
    <AdminLayout active="交易管理" subActive="竞价记录管理">
      <PageHead title="拍品竞价管理" subtitle="按拍品查看竞价状态、最高价、参与企业和出价趋势入口。" />
      <p className="admin-api-notice">{notice}</p>
      {listState === 'ready' ? <AdminSummaryStrip cards={[
        { label: '竞价拍品', value: String(rows.length), helper: '一行对应一件拍品', tone: 'blue' },
        { label: '有出价拍品', value: String(rows.filter((row) => Number(row.bidCount) > 0).length), helper: '存在真实出价记录', tone: 'orange' },
        { label: '总出价次数', value: String(rows.reduce((sum, row) => sum + Number(row.bidCount ?? 0), 0)), helper: '按拍品汇总后的出价量', tone: 'green' },
      ]} /> : null}
      <section className="admin-review-filter" aria-label="拍品竞价筛选">
        <label className="field">
          <span>拍品名称</span>
          <input onChange={(event) => setFilters((current) => ({ ...current, lotTitle: event.currentTarget.value }))} placeholder="请输入拍品名称 / 项目编号" />
        </label>
        <label className="field">
          <span>竞价状态</span>
          <input onChange={(event) => setFilters((current) => ({ ...current, status: event.currentTarget.value }))} placeholder="请输入竞价状态" />
        </label>
        <label className="field">
          <span>是否有出价</span>
          <select onChange={(event) => setFilters((current) => ({ ...current, hasBids: event.currentTarget.value }))}>
            <option value="">全部</option>
            <option value="有出价">有出价</option>
            <option value="暂无出价">暂无出价</option>
          </select>
        </label>
        <div className="account-filter-actions">
          <button onClick={() => setFilters({})} type="button">重置</button>
          <button className="primary" onClick={() => void loadRows()} type="button">刷新</button>
        </div>
      </section>
      <section className="admin-workspace full-width">
        <div className="admin-workspace-main">
          {listState === 'loading' ? <TableSkeleton columns={7} rows={6} /> : null}
          {listState === 'error' ? (
            <ErrorState
              description={notice}
              primaryAction={{ label: '重试', onClick: () => void loadRows() }}
              secondaryAction={{ label: '返回后台首页', to: '/admin/dashboard' }}
            />
          ) : null}
          {listState === 'ready' ? (
            <DataTable
              columns={[
                { key: 'lotTitle', label: '拍品名称', width: '30%', render: renderLotTitleCell },
                { key: 'status', label: '竞价状态', render: (row) => <StatusTag value={getStringValue(row, 'status') || '-'} /> },
                { key: 'highestAmount', label: '当前最高价' },
                { key: 'bidCount', label: '出价次数' },
                { key: 'enterpriseCount', label: '参与企业数' },
                { key: 'lastBidTime', label: '最后出价时间' },
                rowActions(undefined, ['查看出价详情'], getBidLotTarget),
              ]}
              emptyText="暂无拍品竞价记录"
              emptyDescription="当前筛选条件下没有可展示的拍品。"
              rows={filteredRows}
            />
          ) : null}
        </div>
      </section>
    </AdminLayout>
  );
}

export function LotBidDetailPage() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [bids, setBids] = useState<BidRecord[]>([]);
  const [notice, setNotice] = useState('正在读取拍品和竞价记录真实接口。');
  const [listState, setListState] = useState<'loading' | 'ready' | 'error'>('loading');
  const queryId = getQueryParam('id');

  useEffect(() => {
    void Promise.all([
      api.fetchAdminLots(),
      api.fetchAdminBids(),
    ]).then(([nextLots, nextBids]) => {
      setLots(nextLots);
      setBids(nextBids);
      setNotice('已加载后台拍品和竞价记录；下方明细按当前拍品过滤。');
      setListState('ready');
    }).catch((error) => {
      setLots([]);
      setBids([]);
      setNotice(`后台拍品出价真实接口暂不可用：${getErrorMessage(error)}`);
      setListState('error');
    });
  }, []);

  const selectedLot = selectBidDetailLot(lots, bids, queryId);
  const lotBids = selectedLot ? filterBidsForLot(bids, selectedLot) : bids;
  const bidSummary = buildBidDetailSummary(lotBids);
  const visibleBids = [...lotBids].sort((left, right) => isBidAfter(left, right) ? -1 : 1);

  return (
    <AdminLayout active="交易管理" subActive="竞价记录管理">
      <PageHead
        title={selectedLot?.title ?? '拍品出价详情'}
        subtitle="实时出价流转、趋势分析与逐笔记录。"
        actions={[
          { label: '返回拍品竞价管理', to: '/admin/bids' },
          { label: '查看流程进度', to: selectedLot ? `/admin/lots/progress?id=${selectedLot.id}` : '/admin/lots/progress' },
        ]}
      />
      <p className="admin-api-notice">{notice}</p>
      {listState === 'loading' ? <TableSkeleton columns={6} rows={5} /> : null}
      {listState === 'error' ? (
        <ErrorState
          description={notice}
          primaryAction={{ label: '刷新', onClick: () => window.location.reload() }}
          secondaryAction={{ label: '返回竞价记录', to: '/admin/bids' }}
        />
      ) : null}
      {listState === 'ready' ? (
        <div className="lot-bid-detail-page">
          <section className="lot-bid-summary">
            <div>
              <StatusTag value={selectedLot?.status ?? bidSummary.auctionStatus} />
              <h2>{selectedLot?.title ?? '未指定拍品'}</h2>
              <p>项目编号：{selectedLot?.id ?? queryId ?? '当前按全部竞价记录汇总'} · 实时出价流转、趋势分析与逐笔记录</p>
            </div>
            <dl>
              <div><dt>起拍价</dt><dd>{selectedLot?.startPrice ?? '-'}</dd></div>
              <div><dt>数量</dt><dd>{selectedLot?.quantity ?? '-'}</dd></div>
              <div><dt>供应商</dt><dd>{selectedLot?.supplier ?? '-'}</dd></div>
              <div><dt>竞价时间</dt><dd>{selectedLot?.auctionTime ?? '-'}</dd></div>
            </dl>
          </section>
          <section className="bid-detail-stat-grid">
            <article>
              <span>当前最高出价</span>
              <strong>{bidSummary.highestAmount}</strong>
              <small>{selectedLot ? `起拍价 ${selectedLot.startPrice}` : '按当前拍品出价金额解析'}</small>
            </article>
            <article>
              <span>参与竞拍统计</span>
              <strong>{bidSummary.enterpriseCount} 家企业</strong>
              <small>{lotBids.length} 次出价</small>
            </article>
            <article>
              <span>竞拍时间状态</span>
              <strong>{selectedLot?.status ?? bidSummary.auctionStatus}</strong>
              <small>{selectedLot?.auctionTime ?? bidSummary.lastBidTime}</small>
            </article>
          </section>
          <section className="bid-detail-panel">
            <div className="bid-detail-filterbar">
              <div>
                <strong>出价明细</strong>
                <span>价格增长趋势与逐笔出价记录</span>
              </div>
              <button onClick={() => window.location.reload()} type="button">刷新数据</button>
            </div>
            <BidTrendChart bids={lotBids} startPrice={selectedLot?.startPrice} />
            <DataTable
              columns={[
                { key: 'id', label: '竞拍编号', width: '14%', render: renderBidSequenceCell },
                { key: 'enterprise', label: '企业名称' },
                { key: 'amount', label: '出价金额' },
                { key: 'incrementTimes', label: '加价次数' },
                { key: 'isHighest', label: '状态', render: (row) => <StatusTag value={row.isHighest ? '当前最高价' : '被超越'} tone={row.isHighest ? 'orange' : 'gray'} /> },
                { key: 'bidTime', label: '出价时间' },
              ]}
              emptyText="暂无出价记录"
              emptyDescription="当前拍品未匹配到竞价记录；若后端未返回 lotId，页面已尝试按拍品标题兼容匹配。"
              rows={visibleBids as unknown as Record<string, unknown>[]}
            />
          </section>
        </div>
      ) : null}
    </AdminLayout>
  );
}

export function ResultManagementPage() {
  const handleAction = useAdminRowAction({
    发布公示: (id) => api.publishResult(id),
  });

  return <AdminListPage config={{
    title: '成交结果管理页',
    active: '交易管理',
    subActive: '成交结果管理',
    filters: ['拍品名称', '中标企业', '成交时间', '公示状态'],
    summaryCards: (rows) => [
      { label: '成交结果', value: String(rows.length), helper: '竞拍结束自动生成', tone: 'blue' },
      { label: '已公示', value: String(rows.filter((row) => getStringValue(row, 'status') === '已公示').length), helper: '已展示至前台成交公示', tone: 'green' },
      { label: '待发布', value: String(rows.filter((row) => getStringValue(row, 'status') === '已生成').length), helper: '需核对后发布公示', tone: 'orange' },
    ],
    loadRows: () => api.fetchAdminResults() as Promise<unknown> as Promise<Record<string, unknown>[]>,
    columns: [
      { key: 'lotTitle', label: '成交拍品', width: '34%', render: renderBusinessTitleCell },
      { key: 'winner', label: '中标企业名称' },
      { key: 'finalPrice', label: '最终成交价' },
      { key: 'publicTime', label: '生成时间' },
      { key: 'status', label: '公示状态', render: (row) => <StatusTag value={String(row.status)} /> },
      rowActions(handleAction, ['查看', '发布公示'], getResultTarget),
    ],
    drawerTitle: '成交详情',
    drawerSections: ['拍品摘要', '中标企业', '最终成交价', '竞拍结束时间', '公示状态'],
    detailItems: (row) => [
      { label: '成交拍品', value: getStringValue(row, 'lotTitle') },
      { label: '中标企业', value: getStringValue(row, 'winner') },
      { label: '最终成交价', value: getStringValue(row, 'finalPrice') },
      { label: '生成/公示时间', value: getStringValue(row, 'publicTime') },
      { label: '公示状态', value: getStringValue(row, 'status') },
    ],
    confirmPanel: {
      title: '发布成交公示确认',
      body: '发布后成交拍品、中标企业名称、最终成交价将在前台公示。',
      note: '请核对成交信息无误后再点击行内“发布公示”。',
      tone: 'orange',
    },
  }} />;
}

export function ContractManagementPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [filters, setFilters] = useState<FilterValues>({});
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown>>({});
  const [pendingAction, setPendingAction] = useState<{ label: string; row: Record<string, unknown> } | null>(null);
  const [defaultReason, setDefaultReason] = useState('逾期未签署合同或未按约完成尾款支付。');
  const [notice, setNotice] = useState('正在尝试读取后台合同真实接口。');
  const [listState, setListState] = useState<'loading' | 'ready' | 'error'>('loading');
  const filteredRows = filterRowsByText(rows, filters);

  const loadRows = useCallback(async () => {
    try {
      const nextRows = await api.fetchAdminContracts() as unknown as Record<string, unknown>[];
      setRows(nextRows);
      setSelectedRow((current) => nextRows.find((row) => getRowId(row) === getRowId(current)) ?? nextRows[0] ?? {});
      setNotice('已加载合同列表，详情抽屉展示当前选中合同。');
      setListState('ready');
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setRows([]);
        setSelectedRow({});
        setNotice(`无权限访问合同接口：${error.message}`);
        setListState('error');
        return;
      }

      setRows([]);
      setSelectedRow({});
      setNotice(`后台合同真实接口暂不可用：${getErrorMessage(error)}`);
      setListState('error');
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRows();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadRows]);

  const requestAction = (label: string, row: Record<string, unknown>) => {
    setSelectedRow(row);
    setPendingAction({ label, row });
  };

  const runAction = async (label: string, row: Record<string, unknown>) => {
    const id = getRowId(row);

    if (!id) {
      window.alert('当前合同缺少 ID，无法调用后台接口。');
      return;
    }

    if (label === '标记违约' && !defaultReason.trim()) {
      window.alert('请填写违约确认原因。');
      return;
    }

    const action = label === '标记已签约'
      ? api.markContractSigned
      : label === '确认尾款已线下支付并完成'
        ? api.markContractCompleted
        : api.markContractDefaulted;

    try {
      await action(id);
      await loadRows();
      setPendingAction(null);
      window.alert(`${label}已提交。`);
    } catch (error) {
      window.alert(`${label}调用后台接口失败：${getErrorMessage(error)}。页面数据已保持不变。`);
    }
  };

  return (
    <AdminLayout active="交易管理" subActive="合同状态管理">
      <PageHead title="合同履约核验" subtitle="管理全平台线下签约、尾款确认等流程状态。系统仅记录管理员已线下核验相关凭证。" />
      <p className="admin-api-notice">{notice}</p>
      <AdminSummaryStrip cards={[
        { label: '待签约', value: String(rows.filter((row) => getStringValue(row, 'status') === '待签约').length), helper: '需跟进线下合同', tone: 'orange' },
        { label: '已签约', value: String(rows.filter((row) => getStringValue(row, 'status') === '已签约').length), helper: '等待尾款核验', tone: 'blue' },
        { label: '已完成', value: String(rows.filter((row) => getStringValue(row, 'status') === '已完成').length), helper: '计入成交额看板', tone: 'green' },
      ]} />
      <section className="admin-workspace">
        <div className="admin-workspace-main">
          <FilterBar fields={['拍品名称', '企业名称', '合同状态']} onSearch={setFilters} />
          {listState === 'loading' ? <TableSkeleton columns={7} rows={6} /> : null}
          {listState === 'error' ? (
            <ErrorState
              description={notice}
              primaryAction={{ label: '重试', onClick: () => void loadRows() }}
              secondaryAction={{ label: '返回后台首页', to: '/admin/dashboard' }}
            />
          ) : null}
          {listState === 'ready' ? (
            <DataTable
              columns={[
                { key: 'lotTitle', label: '拍品名称', width: '30%', render: renderBusinessTitleCell },
                { key: 'enterprise', label: '中标企业' },
                { key: 'amount', label: '成交价' },
                { key: 'status', label: '合同状态', render: (row) => <StatusTag value={String(row.status)} /> },
                { key: 'updatedAt', label: '更新时间' },
                {
                  key: 'actions',
                  label: '操作',
                  render: (row) => (
                    <div className="inline-actions">
                      <button className="link-btn" onClick={() => setSelectedRow(row)} type="button">详情</button>
                      {['标记已签约', '确认尾款已线下支付并完成', '标记违约'].map((label) => (
                        <button className={label.includes('违约') ? 'danger-link' : 'link-btn'} key={label} onClick={() => requestAction(label, row)} type="button">{label}</button>
                      ))}
                    </div>
                  ),
                },
              ]}
              emptyText="暂无合同记录"
              emptyDescription="真实合同接口当前未返回记录。"
              rows={filteredRows}
            />
          ) : null}
        </div>
        <AdminDetailDrawer
          confirmPanel={{
            title: '尾款确认二次提示',
            body: '系统不处理线上资金，仅记录管理员已核验线下尾款支付凭证，请确认是否继续？',
            note: '请在线下核验银行回单、合同编号和付款企业名称后，再使用行内“确认尾款已线下支付并完成”。',
            tone: 'red',
          }}
          detailItems={getContractDetailItems(selectedRow)}
          sections={[]}
          title="合同与尾款确认详情"
        >
          <ContractDetailDrawerContent row={selectedRow} />
        </AdminDetailDrawer>
      </section>
      {pendingAction ? (
        <ContractActionModal
          defaultReason={defaultReason}
          onCancel={() => setPendingAction(null)}
          onConfirm={() => void runAction(pendingAction.label, pendingAction.row)}
          onDefaultReasonChange={setDefaultReason}
          pendingAction={pendingAction}
        />
      ) : null}
    </AdminLayout>
  );
}

export function RefundManagementPage() {
  const handleAction = useAdminRowAction({
    标记审核中: (id) => api.markRefundReviewing(id),
    标记已退款: (id) => api.markRefundRefunded(id),
  });

  return <AdminListPage config={{
    title: '退款状态管理页',
    active: '交易管理',
    subActive: '退款状态管理',
    filters: ['拍品名称', '企业名称', '退款状态'],
    summaryCards: (rows) => [
      { label: '未退款', value: String(rows.filter((row) => getStringValue(row, 'status') === '未退款').length), helper: '待线下处理', tone: 'orange' },
      { label: '审核中', value: String(rows.filter((row) => getStringValue(row, 'status') === '审核中').length), helper: '财务复核中', tone: 'blue' },
      { label: '已退款', value: String(rows.filter((row) => getStringValue(row, 'status') === '已退款').length), helper: '仅记录状态', tone: 'green' },
    ],
    loadRows: () => api.fetchAdminRefunds() as Promise<unknown> as Promise<Record<string, unknown>[]>,
    columns: [
      { key: 'enterprise', label: '企业名称' },
      { key: 'lotTitle', label: '拍品名称', width: '34%', render: renderBusinessTitleCell },
      { key: 'amount', label: '保证金金额' },
      { key: 'status', label: '退款状态', render: (row) => <StatusTag value={String(row.status)} /> },
      { key: 'updatedAt', label: '更新时间' },
      { key: 'operator', label: '操作人' },
      rowActions(handleAction, ['标记审核中', '标记已退款']),
    ],
    drawerTitle: '退款状态详情',
    drawerSections: ['企业信息', '拍品信息', '保证金金额', '状态备注'],
    detailItems: (row) => [
      { label: '企业名称', value: getStringValue(row, 'enterprise') },
      { label: '拍品名称', value: getStringValue(row, 'lotTitle') },
      { label: '保证金金额', value: getStringValue(row, 'amount') },
      { label: '退款状态', value: getStringValue(row, 'status') },
      { label: '更新时间', value: getStringValue(row, 'updatedAt') },
      { label: '操作人', value: getStringValue(row, 'operator') },
    ],
    confirmPanel: {
      title: '线下退款状态确认',
      body: '请确认线下退款已完成，系统仅记录状态，不产生实际资金转移。',
      note: '本页不设计退款凭证上传，按 T36/T38B 口径只维护状态。',
      tone: 'orange',
    },
  }} />;
}

export function LotProgressPage() {
  const [lots, setLots] = useState<Lot[]>([]);
  const [results, setResults] = useState<ResultWorkflowRecord[]>([]);
  const [contracts, setContracts] = useState<ContractWorkflowRecord[]>([]);
  const [notice, setNotice] = useState('正在读取拍品、成交和合同数据，节点为根据当前业务状态生成。');
  const queryId = getQueryParam('id');

  useEffect(() => {
    void Promise.all([
      api.fetchAdminLots(),
      api.fetchAdminResults(),
      api.fetchAdminContracts(),
    ]).then(([nextLots, nextResults, nextContracts]) => {
      setLots(nextLots);
      setResults(nextResults as ResultWorkflowRecord[]);
      setContracts(nextContracts as ContractWorkflowRecord[]);
      setNotice('已加载真实业务数据；下方流程节点为根据当前拍品、成交、合同状态生成。');
    }).catch((error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setNotice(`无法读取后台流程数据：${error.message}`);
        return;
      }

      setLots([]);
      setResults([]);
      setContracts([]);
      setNotice(`后台流程真实接口暂不可用：${getErrorMessage(error)}`);
    });
  }, []);

  const selectedLot = selectProgressLot(lots, results, contracts, queryId);
  const selectedResult = results.find((result) => result.lotId === selectedLot?.id);
  const selectedContract = contracts.find((contract) => contract.lotId === selectedLot?.id);
  const nodes = buildProgressNodes(selectedLot, selectedResult, selectedContract);
  const fulfillmentNodes = nodes.slice(7);
  const activeFulfillmentIndex = fulfillmentNodes.findIndex((node) => node.state === 'active' || node.state === 'danger');
  const fulfilledCount = fulfillmentNodes.filter((node) => node.state === 'done').length;
  const currentFulfillmentIndex = activeFulfillmentIndex >= 0 ? activeFulfillmentIndex : fulfilledCount === fulfillmentNodes.length ? fulfillmentNodes.length - 1 : 0;
  const winnerName = selectedResult?.winner ?? selectedContract?.enterprise ?? '-';
  const dealAmount = selectedResult?.finalPrice ?? selectedContract?.amount ?? '-';
  const contractStatus = selectedContract?.status ?? '未生成';
  const paymentStatus = selectedContract?.status === '已完成' ? '已确认到账' : selectedContract?.status === '已签约' ? '待财务确认' : '待合同签署';
  const fulfillmentHint = selectedContract?.status === '已完成'
    ? '合同签署与尾款确认均已完成，可进入履约完结归档。'
    : selectedContract?.status === '违约'
      ? '该项目已进入违约状态，请结合线下材料和监管要求处理。'
      : '请确认纸质合同签署、尾款到账等线下凭据后，再推进履约状态。';

  return (
    <AdminLayout active="拍品管理" subActive="全流程操作进度">
      <PageHead
        title="成交后履约推进"
        subtitle="围绕已成交项目的合同签署、尾款确认与履约完结进行跟进；节点继续由 lot/result/contract 真实数据推导。"
        actions={[
          { label: '返回拍品列表', to: '/admin/lots' },
          { label: '查看出价详情', tone: 'primary', to: selectedLot ? `/admin/lots/bids?id=${selectedLot.id}` : '/admin/lots/bids' },
        ]}
      />
      <p className="admin-api-notice">{notice}</p>
      {selectedLot ? (
        <div className="lot-progress-page">
          <section className="lot-progress-summary fulfillment-summary">
            <div className="fulfillment-summary-main">
              <div className="fulfillment-summary-title">
                <StatusTag value={selectedContract?.status ?? selectedLot.status} />
                <span>成交后履约项目</span>
              </div>
              <h2>{selectedLot.title}</h2>
              <p>项目编号：{selectedLot.id}；成交结果、合同状态和尾款节点均来自现有后台真实接口。</p>
            </div>
            <dl className="fulfillment-summary-grid">
              <div><dt>成交企业</dt><dd>{winnerName}</dd></div>
              <div><dt>成交金额</dt><dd className="money">{dealAmount}</dd></div>
              <div><dt>合同状态</dt><dd>{contractStatus}</dd></div>
              <div><dt>尾款核验</dt><dd>{paymentStatus}</dd></div>
              <div><dt>成交公示时间</dt><dd>{selectedResult?.publicTime ?? selectedResult?.generatedAt ?? '-'}</dd></div>
              <div><dt>合同更新时间</dt><dd>{selectedContract?.updatedAt ?? '-'}</dd></div>
              <div><dt>签约时间</dt><dd>{selectedContract?.signedAt ?? '-'}</dd></div>
              <div><dt>完成时间</dt><dd>{selectedContract?.completedAt ?? '-'}</dd></div>
            </dl>
          </section>
          <AdminSummaryStrip cards={[
            { label: '当前履约节点', value: getActiveProgressLabel(fulfillmentNodes), helper: '由成交后阶段节点推导', tone: selectedContract?.status === '违约' ? 'red' : 'blue' },
            { label: '成交结果', value: selectedResult?.status ?? '未生成', helper: selectedResult?.publicTime ?? selectedResult?.generatedAt ?? '成交结果接口暂无记录', tone: selectedResult ? 'green' : 'orange' },
            { label: '合同状态', value: contractStatus, helper: selectedContract?.updatedAt ?? '合同接口暂无记录', tone: selectedContract ? 'blue' : 'orange' },
            { label: '已完成阶段', value: `${fulfilledCount}/${fulfillmentNodes.length}`, helper: '成交公示至履约完结', tone: fulfilledCount === fulfillmentNodes.length ? 'green' : 'orange' },
          ]} />
          <section className="fulfillment-stage-card" aria-label="成交后履约阶段">
            <div className="fulfillment-stage-line" style={{ '--stage-progress': `${fulfillmentNodes.length > 1 ? (currentFulfillmentIndex / (fulfillmentNodes.length - 1)) * 100 : 0}%` } as CSSProperties} />
            {fulfillmentNodes.map((node, index) => (
              <article className={`fulfillment-stage ${node.state}`} key={node.label}>
                <span>{node.state === 'done' ? '✓' : index + 1}</span>
                <strong>{node.label}</strong>
                <small>{node.time}</small>
              </article>
            ))}
          </section>
          <section className={`fulfillment-verify-card ${selectedContract?.status === '违约' ? 'danger' : ''}`}>
            <div>
              <strong>履约核验提示</strong>
              <p>{fulfillmentHint}</p>
            </div>
            <dl>
              <div><dt>合同签署</dt><dd>{selectedContract?.signedAt ? '已记录签署时间' : '待线下签署确认'}</dd></div>
              <div><dt>尾款确认</dt><dd>{selectedContract?.completedAt ? '已记录完成时间' : '待管理员确认'}</dd></div>
            </dl>
          </section>
          <section className="flow-record-panel">
            <h2>节点表 / 推导记录</h2>
            <DataTable
              columns={[
                { key: 'label', label: '节点' },
                { key: 'stateLabel', label: '状态', render: (row) => <StatusTag value={String(row.stateLabel)} /> },
                { key: 'time', label: '时间' },
                { key: 'operator', label: '来源/操作人' },
                { key: 'note', label: '说明', width: '34%' },
              ]}
              rows={nodes.map((node) => ({
                ...node,
                stateLabel: node.state === 'done' ? '已完成' : node.state === 'active' ? '当前节点' : node.state === 'danger' ? '异常' : '待流转',
              }))}
            />
          </section>
        </div>
      ) : (
        <ErrorState
          description="暂无拍品数据可生成流程进度。"
          primaryAction={{ label: '刷新', onClick: () => window.location.reload() }}
          secondaryAction={{ label: '返回后台首页', to: '/admin/dashboard' }}
        />
      )}
    </AdminLayout>
  );
}

export function AuctionClosingPage() {
  const [pendingLots, setPendingLots] = useState<AuctionClosingPendingLot[]>([]);
  const [runs, setRuns] = useState<AuctionClosingRunRecord[]>([]);
  const [runsEphemeral, setRunsEphemeral] = useState(true);
  const [notice, setNotice] = useState('正在读取待结拍队列和最近调度记录。');
  const [listState, setListState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [running, setRunning] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [runResult, setRunResult] = useState('');

  const loadClosingData = useCallback(async () => {
    return Promise.all([
      api.fetchAuctionClosingPending(),
      api.fetchAuctionClosingRuns(),
    ]);
  }, []);

  const applyClosingData = useCallback((data: Awaited<ReturnType<typeof loadClosingData>>) => {
    const [nextPendingLots, nextRuns] = data;
    setPendingLots(nextPendingLots);
    setRuns(nextRuns.items);
    setRunsEphemeral(nextRuns.ephemeral);
  }, []);

  useEffect(() => {
    void loadClosingData().then((data) => {
      applyClosingData(data);
      setNotice('已从后端读取待结拍队列和最近调度记录。');
      setListState('ready');
    }).catch((error) => {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setPendingLots([]);
        setRuns([]);
        setNotice(`无法读取结拍调度接口：${error.message}`);
        setListState('error');
        return;
      }

      setPendingLots([]);
      setRuns([]);
      setNotice(`结拍调度真实接口暂不可用：${getErrorMessage(error)}。`);
      setListState('error');
    });
  }, [applyClosingData, loadClosingData]);

  const latestRun = runs[0];
  const runClosing = async () => {
    try {
      setRunning(true);
      const result = await api.runAuctionClosing();
      setRunResult(`结拍调度已执行：检查 ${result.checkedLots} 宗，成交 ${result.closedLots} 宗，无出价结束 ${result.endedWithoutBids} 宗，跳过 ${result.skippedLots} 宗。`);
      setConfirmOpen(false);
      applyClosingData(await loadClosingData());
      setListState('ready');
    } catch (error) {
      setRunResult(`结拍调度执行失败：${getErrorMessage(error)}。`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <AdminLayout active="系统审计" subActive="结拍调度">
      <PageHead
        title="结拍调度"
        subtitle="查看后端待结拍队列、最近执行记录，并保留手动触发入口。"
        actions={[{ label: '返回流程进度', to: '/admin/lots/progress' }]}
      />
      <p className="admin-api-notice">{notice}</p>
      {runResult ? <p className="admin-api-notice">{runResult}</p> : null}
      <section className="closing-warning">
        <strong>执行逻辑提示</strong>
        <span>待结拍队列来自后端调度接口；手动执行前请确认竞价已完全停止，且业务数据同步完成。</span>
      </section>
      <AdminSummaryStrip cards={[
        { label: '当前待结拍拍品', value: String(pendingLots.length), helper: '后端 pending 接口', tone: pendingLots.length > 0 ? 'orange' : 'green' },
        { label: '最近执行状态', value: latestRun ? getClosingRunStatusLabel(latestRun.status) : '暂无记录', helper: latestRun ? getClosingRunTriggerLabel(latestRun.trigger) : '进程内记录', tone: latestRun?.status === 'FAILED' ? 'red' : 'blue' },
        { label: '调度记录口径', value: runsEphemeral ? '临时' : '持久化', helper: runsEphemeral ? '服务重启后清空' : '后端持久化记录', tone: runsEphemeral ? 'orange' : 'green' },
      ]} />
      <section className="closing-layout">
        <div className="admin-workspace-main">
          <div className="closing-section-head">
            <div>
              <h2>待处理结拍队列</h2>
              <p>若字段不足以判断是否待结拍，页面会提示需要人工确认。</p>
            </div>
            <button className="btn primary" disabled={running} onClick={() => setConfirmOpen(true)} type="button">
              {running ? '执行中...' : '手动执行结拍'}
            </button>
          </div>
          {listState === 'loading' ? <TableSkeleton columns={5} rows={5} /> : null}
          {listState === 'error' ? (
            <ErrorState
              description={notice}
              primaryAction={{ label: '刷新页面', onClick: () => window.location.reload() }}
              secondaryAction={{ label: '返回后台首页', to: '/admin/dashboard' }}
            />
          ) : null}
          {listState === 'ready' ? (
            <DataTable
              columns={[
                { key: 'id', label: '项目编号', width: '18%' },
                { key: 'title', label: '拍品名称', width: '30%' },
                { key: 'endAt', label: '结拍时间' },
                { key: 'currentPrice', label: '当前最高价' },
                { key: 'status', label: '状态', render: (row) => <StatusTag value={String(row.status)} tone={String(row.status) === '已结束' ? 'orange' : 'blue'} /> },
              ]}
              emptyText="暂无待结拍拍品"
              emptyDescription="当前后端 pending 接口未返回应结拍或即将结拍的竞拍中拍品。"
              rows={pendingLots.map(mapClosingPendingRow)}
            />
          ) : null}
        </div>
        <aside className="closing-ops-panel">
          <h2>最近调度记录</h2>
          <dl>
            <div><dt>执行接口</dt><dd>POST /api/admin/auction-closing/run</dd></div>
            <div><dt>记录口径</dt><dd>{runsEphemeral ? '进程内最近记录，服务重启后清空。' : '后端持久化记录。'}</dd></div>
            <div><dt>资金边界</dt><dd>只生成成交/流转状态，不处理线上资金。</dd></div>
            {runs.slice(0, 5).map((run) => (
              <div key={run.id}>
                <dt>{getClosingRunTriggerLabel(run.trigger)} / {getClosingRunStatusLabel(run.status)}</dt>
                <dd>{formatClosingRun(run)}</dd>
              </div>
            ))}
          </dl>
        </aside>
      </section>
      {confirmOpen ? (
        <div className="admin-modal-backdrop" role="presentation">
          <section className="admin-modal-panel" role="dialog" aria-modal="true" aria-label="执行结拍确认">
            <header>
              <span>拍</span>
              <div>
                <h2>执行结拍确认</h2>
                <p>将触发后台结拍服务处理所有符合条件的拍品。</p>
              </div>
            </header>
            <div className="admin-modal-body">
              <p className="modal-warning danger">执行后可能生成成交结果并推进业务状态。请确认竞价已完全停止，此操作不涉及线上资金划拨。</p>
            </div>
            <footer>
              <button className="btn secondary" disabled={running} onClick={() => setConfirmOpen(false)} type="button">取消</button>
              <button className="btn primary" disabled={running} onClick={() => void runClosing()} type="button">{running ? '执行中...' : '确认执行'}</button>
            </footer>
          </section>
        </div>
      ) : null}
    </AdminLayout>
  );
}

export function BlacklistManagementPage() {
  const handleAction = useAdminRowAction({
    解除拉黑: (id) => api.releaseBlacklist(id, BLACKLIST_RELEASE_REASON),
  });

  return (
    <AdminListPage
      config={{
        title: '黑名单管理页',
        active: '企业管理',
        subActive: '黑名单管理',
        filters: ['企业名称', '黑名单状态', '操作时间'],
        summaryCards: (rows) => [
          { label: '已拉黑企业', value: String(rows.filter((row) => getStringValue(row, 'status') === '已拉黑').length), helper: '禁止继续参与竞拍', tone: 'red' },
          { label: '解除入口', value: '行内', helper: '保留既有解除拉黑操作', tone: 'blue' },
          { label: '人工拉黑', value: '真实接口', helper: '提交企业 ID、拍品 ID 与原因', tone: 'orange' },
        ],
        loadRows: () => api.fetchAdminBlacklist() as Promise<unknown> as Promise<Record<string, unknown>[]>,
        columns: [
          { key: 'enterprise', label: '企业名称' },
          { key: 'contact', label: '联系人' },
          { key: 'phone', label: '联系电话' },
          { key: 'status', label: '黑名单状态', render: (row) => <StatusTag value={String(row.status)} /> },
          { key: 'reason', label: '拉黑原因', width: '25%' },
          { key: 'operator', label: '操作人' },
          { key: 'operatedAt', label: '操作时间' },
          rowActions(handleAction, ['查看', '解除拉黑']),
        ],
        drawerTitle: '黑名单企业详情',
        drawerSections: ['企业信息', '违约记录', '拉黑原因', '解除原因'],
        detailItems: (row) => [
          { label: '企业名称', value: getStringValue(row, 'enterprise') },
          { label: '联系人', value: getStringValue(row, 'contact') },
          { label: '联系电话', value: getStringValue(row, 'phone') },
          { label: '黑名单状态', value: getStringValue(row, 'status') },
          { label: '拉黑原因', value: getStringValue(row, 'reason') },
          { label: '操作人', value: getStringValue(row, 'operator') },
          { label: '操作时间', value: getStringValue(row, 'operatedAt') },
        ],
        confirmPanel: {
          title: '黑名单高风险操作',
          body: '拉黑后账号将被封禁，不允许继续参与竞拍；解除后企业账号恢复正常操作权限。',
          note: '请先核对违约记录和线下处置结论。',
          tone: 'red',
        },
      }}
      extraContent={<BlacklistForm />}
    />
  );
}

export function ContentManagementPage() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [filters, setFilters] = useState<FilterValues>({});
  const [notice, setNotice] = useState('正在尝试读取后台内容真实接口。');
  const [listState, setListState] = useState<'loading' | 'ready' | 'error'>('loading');
  const filteredRows = filterRowsByText(rows, filters);

  const loadRows = useCallback(async () => {
    try {
      const nextRows = await api.fetchAdminContents() as unknown as Record<string, unknown>[];
      setRows(nextRows);
      setNotice('已加载后台内容列表；保存会调用真实内容接口。');
      setListState('ready');
    } catch (error) {
      setRows([]);
      setNotice(`后台内容真实接口不可用：${getErrorMessage(error)}`);
      setListState('error');
    }
  }, []);

  const handleAction = useAdminRowAction({
    发布: (id) => api.publishContent(id),
    下架: (id) => api.unpublishContent(id),
  });

  const handleContentAction: RowActionHandler = useCallback(async (label, row) => {
    if (label === '编辑') {
      navigateTo(`/admin/content/edit?id=${encodeURIComponent(String(row.id ?? ''))}`);
      return;
    }

    await handleAction(label, row);
  }, [handleAction]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRows();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadRows]);

  useEffect(() => {
    window.addEventListener(ADMIN_LIST_REFRESH_EVENT, loadRows);
    return () => window.removeEventListener(ADMIN_LIST_REFRESH_EVENT, loadRows);
  }, [loadRows]);

  return (
    <AdminLayout active="内容运营" subActive="内容管理">
      <PageHead
        subtitle="真实接口优先加载；保存失败会显性提示，发布/下架沿用既有接口。"
        title="内容管理页"
        actions={[{ label: '新建内容', tone: 'primary', to: '/admin/content/edit' }]}
      />
      <p className="admin-api-notice">{notice}</p>
      <section className="admin-content-workspace">
        <aside className="content-category-panel">
          <div>
            <strong>内容分类</strong>
            <small>信息资讯与公开说明</small>
          </div>
          {CONTENT_TREE_GROUPS.map(([group, items]) => (
            <div className="content-tree-group" key={group as string}>
              <span>{group as string}</span>
              {(items as string[]).map((item) => (
                <span className={rows.some((row) => row.category === item) ? 'active' : ''} key={item}>
                  {item}
                </span>
              ))}
            </div>
          ))}
        </aside>
        <div className="admin-workspace-main">
          <FilterBar fields={['分类', '状态', '关键词']} onSearch={setFilters} />
          {listState === 'loading' ? <TableSkeleton columns={6} rows={6} /> : null}
          {listState === 'error' ? (
            <ErrorState
              description={notice}
              primaryAction={{ label: '重试', onClick: () => void loadRows() }}
              secondaryAction={{ label: '返回后台首页', to: '/admin/dashboard' }}
            />
          ) : null}
          {listState === 'ready' ? (
            <DataTable
              columns={[
                { key: 'title', label: '标题', width: '34%', render: renderContentTitleCell },
                { key: 'category', label: '分类' },
                { key: 'status', label: '状态', render: (row) => <StatusTag value={String(row.status)} /> },
                { key: 'publishedAt', label: '发布时间' },
                { key: 'updatedBy', label: '更新人' },
                rowActions(handleContentAction, ['编辑', '发布', '下架']),
              ]}
              emptyText="暂无内容记录"
              emptyDescription="真实内容接口当前未返回记录。"
              rows={filteredRows}
            />
          ) : null}
        </div>
      </section>
    </AdminLayout>
  );
}

export function ContentEditPage() {
  const query = new URLSearchParams(window.location.search);
  const contentId = query.get('id') ?? '';
  const [content, setContent] = useState<Record<string, unknown> | undefined>();
  const [notice, setNotice] = useState('正在准备内容编辑页。');
  const [pageState, setPageState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [saving, setSaving] = useState(false);
  const activeContentId = String(content?.id ?? contentId);
  const frontContentUrl = activeContentId ? `/news/detail?id=${encodeURIComponent(activeContentId)}` : '';
  const canViewFrontContent = String(content?.status ?? '') === '已发布' && Boolean(frontContentUrl);

  useEffect(() => {
    let ignore = false;

    const loadContent = async () => {
      if (!contentId) {
        setContent(undefined);
        setNotice('正在新建内容，请填写标题、摘要和正文。');
        setPageState('ready');
        return;
      }

      try {
        const nextRows = await api.fetchAdminContents() as unknown as Record<string, unknown>[];
        const matched = nextRows.find((row) => String(row.id ?? '') === contentId);

        if (ignore) {
          return;
        }

        if (!matched) {
          setContent(undefined);
          setNotice(`未找到编号为 ${contentId} 的内容。`);
          setPageState('error');
          return;
        }

        setContent(matched);
        setNotice(`已加载内容：${String(matched.title ?? '')}`);
        setPageState('ready');
      } catch (error) {
        if (!ignore) {
          setContent(undefined);
          setNotice(`后台内容真实接口不可用：${getErrorMessage(error)}`);
          setPageState('error');
        }
      }
    };

    void loadContent();

    return () => {
      ignore = true;
    };
  }, [contentId]);

  const saveContent = async (): Promise<string | undefined> => {
    const form = document.querySelector<HTMLFormElement>('#admin-content-edit-form');

    if (!form) {
      setNotice('未找到内容编辑表单。');
      return undefined;
    }

    const payload = buildContentPayload(new FormData(form));
    const editingId = String(content?.id ?? contentId);

    if (!payload.title) {
      setNotice('请先填写内容标题。');
      return undefined;
    }

    setSaving(true);

    try {
      if (editingId) {
        await api.updateContent(editingId, payload);
        setContent((current) => ({ ...current, ...payload, id: editingId }));
        setNotice('内容已保存为草稿，可继续编辑或返回内容列表查看草稿。');
        return editingId;
      }

      const saved = await api.createContent(payload);
      const savedRow: Record<string, unknown> = { ...payload, ...(saved as unknown as Record<string, unknown>) };
      const savedId = String(savedRow.id ?? '');

      setContent(savedRow);
      if (savedId) {
        window.history.replaceState(null, '', `/admin/content/edit?id=${encodeURIComponent(savedId)}`);
      }
      setNotice('内容草稿已新建并保存，可继续编辑或返回内容列表查看草稿。');
      return savedId || undefined;
    } catch (error) {
      setNotice(`内容保存失败：${getErrorMessage(error)}`);
      return undefined;
    } finally {
      setSaving(false);
    }
  };

  const publishContent = async () => {
    const savedId = await saveContent();

    if (!savedId) {
      return;
    }

    setSaving(true);

    try {
      await api.publishContent(savedId);
      setContent((current) => ({ ...current, id: savedId, status: '已发布' }));
      setNotice('内容已保存并确认发布，可从前台内容详情查看。');
    } catch (error) {
      setNotice(`确认发布失败：${getErrorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  const currentTitle = String(content?.title ?? '');

  return (
    <AdminLayout active="内容运营" subActive="内容管理">
      <section className="content-edit-topbar">
        <button className="btn secondary" onClick={() => navigateTo('/admin/content')} type="button">返回内容列表</button>
        <div className="content-edit-topbar-copy">
          <span>内容运营 / {contentId ? '编辑内容' : '新建内容'}</span>
          <strong>{currentTitle || '未命名内容'}</strong>
        </div>
        <div className="content-edit-topbar-actions">
          <button className="btn secondary" onClick={() => setNotice('预览能力待接入。')} type="button">预览</button>
          <button className="btn secondary" disabled={saving || pageState !== 'ready'} onClick={() => void saveContent()} type="button">保存草稿</button>
          <button className="btn primary" disabled={saving || pageState !== 'ready'} onClick={() => void publishContent()} type="button">确认发布</button>
        </div>
      </section>
      <p className="admin-api-notice">{notice}</p>
      {pageState === 'loading' ? <TableSkeleton columns={2} rows={5} /> : null}
      {pageState === 'error' ? (
        <ErrorState
          description={notice}
          primaryAction={{ label: '返回内容列表', onClick: () => navigateTo('/admin/content') }}
          secondaryAction={{ label: '新建内容', to: '/admin/content/edit' }}
        />
      ) : null}
      {pageState === 'ready' ? (
        <form className="content-edit-shell" id="admin-content-edit-form" key={String(content?.id ?? 'new')}>
          <main className="content-edit-main">
            <label className="content-title-field">
              <span>标题</span>
              <input defaultValue={currentTitle} name="title" placeholder="请输入内容标题" />
            </label>
            <label className="content-summary-field">
              <span>摘要</span>
              <textarea defaultValue={String(content?.summary ?? '')} name="summary" placeholder="请输入内容摘要" rows={4} />
            </label>
            <div className="content-edit-toolbar" aria-label="正文编辑工具栏">
              <button type="button">段落</button>
              <button type="button">加粗</button>
              <button type="button">引用</button>
              <button type="button">列表</button>
            </div>
            <label className="content-body-editor">
              <span>正文</span>
              <textarea defaultValue={String(content?.body ?? '')} name="body" placeholder="请输入正文内容" rows={18} />
            </label>
          </main>
          <aside className="content-edit-aside">
            <section className="content-side-card publish-assistant-card">
              <span aria-hidden="true">发</span>
              <div>
                <strong>发布助手</strong>
                <p>按当前表单执行真实链路：先保存草稿，确认发布会保存后调用发布接口。</p>
                <div className="publish-assistant-actions">
                  <button className="btn secondary" disabled={saving || pageState !== 'ready'} onClick={() => void saveContent()} type="button">保存草稿</button>
                  <button className="btn primary" disabled={saving || pageState !== 'ready'} onClick={() => void publishContent()} type="button">确认发布</button>
                  <button className="btn secondary" disabled={!activeContentId} onClick={() => navigateTo('/admin/content')} type="button">返回列表查看</button>
                  <button className="btn secondary" disabled={!canViewFrontContent} onClick={() => navigateTo(frontContentUrl)} type="button">查看前台内容</button>
                </div>
                {activeContentId ? <small>内容编号：{activeContentId}</small> : <small>保存草稿后会生成内容编号。</small>}
              </div>
            </section>
            <section className="content-side-card">
              <h3>封面图片</h3>
              <div className="content-cover-placeholder">
                <span>封</span>
                <div>
                  <strong>封面上传占位</strong>
                  <small>上传能力待接入，当前仅保留配置位置。</small>
                </div>
              </div>
            </section>
            <section className="content-side-card">
              <label className="field">
                <span>内容分类</span>
                <select defaultValue={getContentCategoryCode(content)} name="category">
                  {CONTENT_CATEGORY_OPTIONS.map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </label>
              <div className="content-tag-placeholder">
                <span>标签</span>
                <strong>标签能力待接入</strong>
              </div>
            </section>
            <section className="content-side-card">
              <h3>发布设置</h3>
              <label className="content-radio-row">
                <input defaultChecked name="publishMode" type="radio" value="now" />
                <span>立即发布</span>
              </label>
              <label className="content-radio-row">
                <input name="publishMode" type="radio" value="draft" />
                <span>仅保存草稿</span>
              </label>
              <div className="content-editor-status">
                <span>当前状态</span>
                <strong>{String(content?.status ?? '新建草稿')}</strong>
              </div>
            </section>
            <div className="content-edit-side-actions">
              <button className="btn secondary" onClick={() => navigateTo('/admin/content')} type="button">取消</button>
              <button className="btn primary" disabled={saving} onClick={() => void saveContent()} type="button">保存草稿</button>
            </div>
          </aside>
        </form>
      ) : null}
    </AdminLayout>
  );
}

export function NotificationManagementPage() {
  return <AdminListPage config={{
    title: '通知管理页',
    active: '内容运营',
    subActive: '通知管理',
    filters: ['通知类型', '通知渠道', '接收企业', '发送状态', '发送时间'],
    summaryCards: (rows) => [
      { label: '发送成功', value: String(rows.filter((row) => getStringValue(row, 'status') === '发送成功').length), helper: '网关/站内投递成功', tone: 'green' },
      { label: '发送失败', value: String(rows.filter((row) => getStringValue(row, 'status') === '发送失败').length), helper: '需人工关注业务结果', tone: 'red' },
      { label: '通知类型', value: String(new Set(rows.map((row) => getStringValue(row, 'type')).filter(Boolean)).size), helper: '按真实通知记录统计', tone: 'blue' },
    ],
    loadRows: () => api.fetchAdminNotifications() as Promise<unknown> as Promise<Record<string, unknown>[]>,
    columns: [
      { key: 'type', label: '通知类型' },
      { key: 'channel', label: '通知渠道' },
      { key: 'enterprise', label: '接收企业' },
      { key: 'lotTitle', label: '通知内容摘要', width: '30%', render: renderNotificationContentCell },
      { key: 'status', label: '发送状态', render: (row) => <StatusTag value={String(row.status)} /> },
      { key: 'sentAt', label: '发送时间' },
      rowActions(undefined, ['查看内容']),
    ],
    drawerTitle: '通知内容详情',
    drawerSections: ['通知类型', '通知渠道', '接收企业', '通知内容', '发送状态'],
    detailItems: (row) => [
      { label: '通知类型', value: getStringValue(row, 'type') },
      { label: '通知渠道', value: getStringValue(row, 'channel') },
      { label: '接收企业', value: getStringValue(row, 'enterprise') },
      { label: '关联拍品', value: getStringValue(row, 'lotTitle') },
      { label: '通知正文', value: getStringValue(row, 'content') },
      { label: '发送状态', value: getStringValue(row, 'status') },
      { label: '发送时间', value: getStringValue(row, 'sentAt') },
    ],
  }} />;
}

export function FileManagementPage() {
  return <AdminListPage config={{
    title: '文件管理页',
    active: '内容运营',
    subActive: '文件管理',
    filters: ['文件类型', '来源业务', '上传人', '上传时间'],
    summaryCards: (rows) => [
      { label: '文件记录', value: String(rows.length), helper: '平台上传文件引用', tone: 'blue' },
      { label: '权限控制', value: '敏感附件', helper: '检测报告/凭证按权限查看', tone: 'orange' },
      { label: '只读盘点', value: '无删除', helper: '本页仅查看与引用追踪', tone: 'green' },
    ],
    loadRows: () => api.fetchAdminFiles() as Promise<unknown> as Promise<Record<string, unknown>[]>,
    columns: [
      { key: 'name', label: '文件名', width: '28%', render: renderFileNameCell },
      { key: 'type', label: '文件类型' },
      { key: 'source', label: '来源业务' },
      { key: 'uploader', label: '上传人' },
      { key: 'uploadedAt', label: '上传时间' },
      { key: 'ref', label: '关联对象', width: '24%' },
      rowActions(undefined, ['预览', '下载', '查看引用']),
    ],
    drawerTitle: '文件预览',
    drawerSections: ['文件预览', '关联业务', '权限控制提示'],
    detailItems: (row) => [
      { label: '文件名', value: getStringValue(row, 'name') },
      { label: '文件类型', value: getStringValue(row, 'type') },
      { label: '来源业务', value: getStringValue(row, 'source') },
      { label: '上传人', value: getStringValue(row, 'uploader') },
      { label: '上传时间', value: getStringValue(row, 'uploadedAt') },
      { label: '关联对象', value: getStringValue(row, 'ref') },
      { label: '查看状态', value: '敏感附件需通过后端权限校验' },
    ],
  }} />;
}

export function OperationLogPage() {
  return <AdminListPage config={{
    title: '操作日志页',
    active: '系统审计',
    subActive: '操作日志',
    filters: ['操作人', '操作动作', '对象类型', '操作时间'],
    summaryCards: (rows) => [
      { label: '审计记录', value: String(rows.length), helper: '关键操作留痕', tone: 'blue' },
      { label: '成功操作', value: String(rows.filter((row) => getStringValue(row, 'result') === '成功').length), helper: '按后端日志结果展示', tone: 'green' },
      { label: '删除按钮', value: '0', helper: '操作日志不可删除', tone: 'red' },
    ],
    loadRows: () => api.fetchAdminLogs() as Promise<unknown> as Promise<Record<string, unknown>[]>,
    columns: [
      { key: 'operator', label: '操作人' },
      { key: 'action', label: '操作动作' },
      { key: 'objectType', label: '对象类型' },
      { key: 'objectName', label: '对象名称', width: '30%' },
      { key: 'result', label: '操作结果' },
      { key: 'operatedAt', label: '操作时间' },
      rowActions(undefined, ['查看详情']),
    ],
    drawerTitle: '日志详情',
    drawerSections: ['操作人', '操作时间', '操作动作', '对象信息', '操作结果', '备注'],
    detailItems: (row) => [
      { label: '操作人', value: getStringValue(row, 'operator') },
      { label: '操作动作', value: getStringValue(row, 'action') },
      { label: '对象类型', value: getStringValue(row, 'objectType') },
      { label: '对象名称', value: getStringValue(row, 'objectName') },
      { label: '操作结果', value: getStringValue(row, 'result') },
      { label: '操作时间', value: getStringValue(row, 'operatedAt') },
      { label: '前后摘要', value: '由后端审计摘要字段返回后展示' },
    ],
  }} />;
}

function AdminListPage({ config, extraContent }: { config: AdminListConfig; extraContent?: ReactNode }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [filters, setFilters] = useState<FilterValues>({});
  const [notice, setNotice] = useState('正在尝试读取后台真实接口。');
  const [listState, setListState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [feedback, setFeedback] = useState<AdminActionFeedback | null>(null);
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null);
  const summaryCards = typeof config.summaryCards === 'function' ? config.summaryCards(rows) : config.summaryCards;
  const filteredRows = filterRowsByText(rows, filters);
  const selectedRowId = selectedRow ? getRowId(selectedRow) : '';
  const drawerRow: Record<string, unknown> = selectedRowId
    ? filteredRows.find((row) => getRowId(row) === selectedRowId) ?? selectedRow ?? {}
    : filteredRows[0] ?? {};
  const hasDrawer = Boolean(config.drawerTitle || config.drawerSections?.length || config.detailItems || config.drawerContent || config.confirmPanel);

  const loadRows = useCallback(async () => {
    if (!canLoadAdminData()) {
      setRows([]);
      setNotice('请先登录管理员账号后访问管理后台。');
      setListState('error');
      return;
    }

    if (!config.loadRows) {
      setRows([]);
      setNotice('当前页面暂未接入可复用的后台真实列表接口。');
      setListState('error');
      return;
    }

    try {
      const nextRows = await config.loadRows();
      setRows(nextRows);
      setSelectedRow((current) => {
        const currentId = current ? getRowId(current) : '';
        return currentId ? nextRows.find((row) => getRowId(row) === currentId) ?? null : null;
      });
      setNotice('已加载后台列表。');
      setListState('ready');
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setRows([]);
        setNotice(`无权限访问后台接口：${error.message}`);
        setListState('error');
        return;
      }

      if (error instanceof ApiError && error.status === 401) {
        setRows([]);
        setNotice(`登录状态已失效：${error.message}。请重新登录。`);
        setListState('error');
        return;
      }

      setRows([]);
      setNotice(`后台真实接口暂不可用：${getErrorMessage(error)}`);
      setListState('error');
    }
  }, [config]);
  const batchReview = useBatchReview({
    config: config.batchReview,
    rows,
    onComplete: loadRows,
    setFeedback,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRows();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadRows]);

  useEffect(() => {
    window.addEventListener(ADMIN_LIST_REFRESH_EVENT, loadRows);
    return () => window.removeEventListener(ADMIN_LIST_REFRESH_EVENT, loadRows);
  }, [loadRows]);

  useEffect(() => {
    const showFeedback = (event: Event) => {
      setFeedback((event as CustomEvent<AdminActionFeedback>).detail);
    };

    window.addEventListener(ADMIN_ACTION_FEEDBACK_EVENT, showFeedback);
    return () => window.removeEventListener(ADMIN_ACTION_FEEDBACK_EVENT, showFeedback);
  }, []);

  useEffect(() => {
    const selectDrawerRow = (event: Event) => {
      setSelectedRow((event as CustomEvent<Record<string, unknown>>).detail);
    };

    window.addEventListener(ADMIN_DRAWER_SELECT_EVENT, selectDrawerRow);
    return () => window.removeEventListener(ADMIN_DRAWER_SELECT_EVENT, selectDrawerRow);
  }, []);

  return (
    <AdminLayout active={config.active} subActive={config.subActive}>
      <PageHead title={config.title} subtitle="真实接口优先加载；接口不可用时显示错误状态，状态操作失败不改变当前页面。" actions={config.topActions} />
      <p className="admin-api-notice">{notice}</p>
      {feedback ? <AdminActionFeedbackPanel feedback={feedback} onClose={() => setFeedback(null)} /> : null}
      {extraContent}
      {listState === 'ready' && summaryCards ? <AdminSummaryStrip cards={summaryCards} /> : null}
      <section className={`admin-workspace${hasDrawer ? '' : ' full-width'}`}>
        <div className="admin-workspace-main">
          <FilterBar fields={config.filters} onSearch={setFilters} />
          {listState === 'loading' ? <TableSkeleton columns={config.columns.length} rows={6} /> : null}
          {listState === 'error' ? (
            <ErrorState
              description={notice}
              primaryAction={{ label: '重试', onClick: () => void loadRows() }}
              secondaryAction={{ label: '返回后台首页', to: '/admin/dashboard' }}
            />
          ) : null}
          {listState === 'ready' && config.batchReview ? (
            <BatchReviewToolbar
              disabled={!batchReview.selectableRows.length}
              itemLabel={config.batchReview.itemLabel}
              onApprove={() => batchReview.requestRun('approve')}
              onReject={() => batchReview.requestRun('reject')}
              onSelectAll={batchReview.selectAll}
              onSelectNone={batchReview.clearSelection}
              processing={batchReview.processing}
              selectedCount={batchReview.selectedRows.length}
              selectableCount={batchReview.selectableRows.length}
            />
          ) : null}
          {listState === 'ready' ? (
            <DataTable
              columns={config.batchReview ? [
                createBatchSelectionColumn(batchReview),
                ...config.columns,
              ] : config.columns}
              emptyText="暂无相关数据"
              emptyDescription="真实后台接口当前未返回记录。"
              rows={filteredRows}
              tableClassName={config.tableClassName}
            />
          ) : null}
          {config.batchReview ? (
            <BatchReviewConfirmDialog
              action={batchReview.pendingAction}
              itemLabel={config.batchReview.itemLabel}
              onCancel={batchReview.cancelRun}
              onConfirm={() => void batchReview.confirmRun()}
              processing={batchReview.processing}
              rejectReason={batchReview.rejectReason}
              selectedCount={batchReview.selectedRows.length}
              setRejectReason={batchReview.setRejectReason}
            />
          ) : null}
        </div>
        {hasDrawer ? (
          <AdminDetailDrawer
            confirmPanel={config.confirmPanel}
            detailItems={config.detailItems?.(drawerRow)}
            sections={config.drawerSections ?? []}
            title={config.drawerTitle ?? '详情'}
          >
            {config.drawerContent?.(drawerRow)}
          </AdminDetailDrawer>
        ) : null}
      </section>
    </AdminLayout>
  );
}

function DepositReviewWorkspace({ batchReview: batchReviewConfig, handleAction }: { batchReview: AdminBatchReviewConfig; handleAction: RowActionHandler }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [notice, setNotice] = useState('正在加载意向金凭证审核列表。');
  const [listState, setListState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('待审核');
  const [feedback, setFeedback] = useState<AdminActionFeedback | null>(null);

  const loadRows = useCallback(async () => {
    if (!canLoadAdminData()) {
      setRows([]);
      setNotice('请先登录管理员账号后访问管理后台。');
      setListState('error');
      return;
    }

    try {
      const nextRows = await api.fetchAdminDepositReviews() as unknown as Record<string, unknown>[];
      setRows(nextRows);
      setNotice('已加载意向金凭证审核列表，默认优先查看待审核记录。');
      setListState('ready');
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        setRows([]);
        setNotice(`无权限访问意向金审核接口：${error.message}`);
        setListState('error');
        return;
      }

      if (error instanceof ApiError && error.status === 401) {
        setRows([]);
        setNotice(`登录状态已失效：${error.message}。请重新登录。`);
        setListState('error');
        return;
      }

      setRows([]);
      setNotice(`意向金审核真实接口暂不可用：${getErrorMessage(error)}`);
      setListState('error');
    }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRows();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadRows]);

  useEffect(() => {
    window.addEventListener(ADMIN_LIST_REFRESH_EVENT, loadRows);
    return () => window.removeEventListener(ADMIN_LIST_REFRESH_EVENT, loadRows);
  }, [loadRows]);

  useEffect(() => {
    const showFeedback = (event: Event) => {
      setFeedback((event as CustomEvent<AdminActionFeedback>).detail);
    };

    window.addEventListener(ADMIN_ACTION_FEEDBACK_EVENT, showFeedback);
    return () => window.removeEventListener(ADMIN_ACTION_FEEDBACK_EVENT, showFeedback);
  }, []);

  const filteredRows = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();

    return rows
      .filter((row) => status === '全部' || getStringValue(row, 'status') === status)
      .filter((row) => {
        if (!normalizedKeyword) {
          return true;
        }

        return [
          getStringValue(row, 'enterprise'),
          getStringValue(row, 'enterpriseName'),
          getStringValue(row, 'lotTitle'),
          getStringValue(row, 'lotId'),
          getStringValue(row, 'id'),
        ].some((value) => value.toLowerCase().includes(normalizedKeyword));
      })
      .sort((left, right) => {
        const leftPending = getStringValue(left, 'status') === '待审核' ? 0 : 1;
        const rightPending = getStringValue(right, 'status') === '待审核' ? 0 : 1;

        return leftPending - rightPending;
      });
  }, [keyword, rows, status]);
  const batchReview = useBatchReview({
    config: batchReviewConfig,
    rows: filteredRows,
    onComplete: loadRows,
    setFeedback,
  });

  return (
    <AdminLayout active="审核管理" subActive="意向金凭证审核">
      <PageHead title="意向金凭证审核" subtitle="默认优先处理待审核凭证，可按企业名称、拍品标题、项目编号或拍品 ID 搜索。" />
      <p className="admin-api-notice">{notice}</p>
      {feedback ? <AdminActionFeedbackPanel feedback={feedback} onClose={() => setFeedback(null)} /> : null}
      <section className="admin-review-filter" aria-label="意向金凭证审核筛选">
        <label className="field">
          <span>搜索</span>
          <input
            onChange={(event) => setKeyword(event.currentTarget.value)}
            placeholder="企业名称 / 拍品标题 / 项目编号 / 拍品 ID"
            value={keyword}
          />
        </label>
        <label className="field">
          <span>状态</span>
          <select onChange={(event) => setStatus(event.currentTarget.value)} value={status}>
            {['待审核', '审核通过', '审核驳回', '全部'].map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <div className="account-filter-actions">
          <button onClick={() => { setKeyword(''); setStatus('待审核'); }} type="button">重置</button>
          <button className="primary" onClick={() => void loadRows()} type="button">刷新</button>
        </div>
      </section>
      <section className="admin-workspace full-width">
        <div className="admin-workspace-main">
          {listState === 'loading' ? <TableSkeleton columns={7} rows={6} /> : null}
          {listState === 'error' ? (
            <ErrorState
              description={notice}
              primaryAction={{ label: '重试', onClick: () => void loadRows() }}
              secondaryAction={{ label: '返回待办', to: '/admin/dashboard' }}
            />
          ) : null}
          {listState === 'ready' ? (
            <BatchReviewToolbar
              disabled={!batchReview.selectableRows.length}
              itemLabel={batchReviewConfig.itemLabel}
              onApprove={() => batchReview.requestRun('approve')}
              onReject={() => batchReview.requestRun('reject')}
              onSelectAll={batchReview.selectAll}
              onSelectNone={batchReview.clearSelection}
              processing={batchReview.processing}
              selectedCount={batchReview.selectedRows.length}
              selectableCount={batchReview.selectableRows.length}
            />
          ) : null}
          {listState === 'ready' ? (
            <DataTable
              columns={[
                createBatchSelectionColumn(batchReview),
                { key: 'enterprise', label: '企业名称', width: '20%', render: renderEnterpriseNameCell },
                { key: 'lotTitle', label: '拍品名称', width: '24%', render: renderLotTitleCell },
                { key: 'amount', label: '应缴/实缴金额', render: renderDepositAmountCell },
                { key: 'submittedAt', label: '提交时间' },
                { key: 'voucher', label: '凭证文件', render: renderDepositVoucherCell },
                { key: 'status', label: '审核状态', render: (row) => <StatusTag value={String(row.status)} /> },
                rowActions(handleAction, ['查看凭证', '审核通过', '审核驳回'], getDepositReviewTarget),
              ]}
              emptyText="暂无相关数据"
              emptyDescription="当前筛选条件下没有意向金凭证记录。"
              rows={filteredRows}
            />
          ) : null}
          <BatchReviewConfirmDialog
            action={batchReview.pendingAction}
            itemLabel={batchReviewConfig.itemLabel}
            onCancel={batchReview.cancelRun}
            onConfirm={() => void batchReview.confirmRun()}
            processing={batchReview.processing}
            rejectReason={batchReview.rejectReason}
            selectedCount={batchReview.selectedRows.length}
            setRejectReason={batchReview.setRejectReason}
          />
        </div>
      </section>
    </AdminLayout>
  );
}

function AdminActionFeedbackPanel({ feedback, onClose }: { feedback: AdminActionFeedback; onClose: () => void }) {
  return (
    <section className="admin-action-feedback" role="status">
      <div>
        <strong>{feedback.message}</strong>
        <span>请选择下一步操作。</span>
      </div>
      <ButtonRow actions={feedback.actions} />
      {feedback.details?.length ? (
        <ul>
          {feedback.details.map((detail) => <li key={detail}>{detail}</li>)}
        </ul>
      ) : null}
      <button className="link-btn" onClick={onClose} type="button">关闭</button>
    </section>
  );
}

function AdminSummaryStrip({ cards }: { cards: AdminSummaryCard[] }) {
  return (
    <section className="admin-summary-strip" aria-label="页面业务摘要">
      {cards.map((card) => (
        <article className={`admin-summary-card ${card.tone ?? 'blue'}`} key={card.label}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
          <small>{card.helper}</small>
        </article>
      ))}
    </section>
  );
}

function EnterpriseMaterialPreview({ items }: { items: AdminDetailItem[] }) {
  const [imagePreview, setImagePreview] = useState<AdminImagePreviewState | null>(null);

  return (
    <>
      <AdminImagePreviewModal preview={imagePreview} onClose={() => setImagePreview(null)} />
      <section className="enterprise-material-preview" aria-label="企业上传材料">
        {items.map((item) => {
          const fileUrl = item.fileUrl ?? '';
          const hasFile = Boolean(fileUrl || item.attachmentId);

          return (
            <article className="enterprise-material-card" key={item.label}>
              <div className="enterprise-material-card-head">
                <strong>{item.label}</strong>
                <span>{item.value || '未提交'}</span>
              </div>
              {hasFile ? (
                <EnterpriseMaterialCardBody
                  item={item}
                  key={`${fileUrl}:${item.attachmentId ?? ''}`}
                  onPreviewImage={(preview) => setImagePreview(preview)}
                />
              ) : (
                <p>未提交材料</p>
              )}
            </article>
          );
        })}
      </section>
    </>
  );
}

function EnterpriseMaterialCardBody({
  item,
  onPreviewImage,
}: {
  item: AdminDetailItem;
  onPreviewImage: (preview: AdminImagePreviewState) => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [isPreviewLoading, setIsPreviewLoading] = useState(true);
  const fileUrl = item.fileUrl ?? '';
  const openMaterial = () => void api.openFileUrl(fileUrl, item.attachmentId, 'ADMIN').catch((error: unknown) => window.alert(`企业材料暂无法打开：${getErrorMessage(error)}`));
  const openImagePreview = () => {
    if (!previewUrl) {
      return;
    }

    onPreviewImage({
      src: previewUrl,
      title: item.label,
      subtitle: item.value,
    });
  };

  useEffect(() => {
    let canceled = false;
    let objectUrl: string | undefined;

    void api.createFileObjectUrl(fileUrl, item.attachmentId, 'ADMIN')
      .then((url) => {
        if (canceled) {
          window.URL.revokeObjectURL(url);
          return;
        }

        objectUrl = url;
        setPreviewUrl(url);
      })
      .catch(() => {
        if (!canceled) {
          setImageFailed(true);
        }
      })
      .finally(() => {
        if (!canceled) {
          setIsPreviewLoading(false);
        }
      });

    return () => {
      canceled = true;

      if (objectUrl) {
        window.URL.revokeObjectURL(objectUrl);
      }
    };
  }, [fileUrl, item.attachmentId]);

  if (previewUrl && !imageFailed) {
    return (
      <>
        <button
          className="enterprise-material-image"
          onClick={openImagePreview}
          type="button"
        >
          <img alt={item.label} onError={() => setImageFailed(true)} src={previewUrl} />
        </button>
        <button className="link-btn" onClick={openImagePreview} type="button">查看大图</button>
      </>
    );
  }

  return (
    <>
      <div className="enterprise-material-file">
        <span aria-hidden="true">FILE</span>
        <small>{isPreviewLoading ? '加载中' : item.value || '附件'}</small>
      </div>
      <button className="link-btn" onClick={openMaterial} type="button">查看附件</button>
    </>
  );
}

function BidTrendChart({ bids, startPrice }: { bids: BidRecord[]; startPrice?: string }) {
  const points = buildBidTrendPoints(bids, startPrice);
  const hasTrend = points.length > 1;
  const path = hasTrend ? buildTrendPath(points) : '';
  const areaPath = hasTrend ? `${path} L 100 100 L 0 100 Z` : '';
  const lastPoint = points[points.length - 1];

  return (
    <div className="bid-trend-chart" aria-label="竞价趋势图">
      <div className="bid-trend-chart-title">
        <span>价格增长趋势</span>
        <strong>{lastPoint ? formatDashboardMoney(lastPoint.amount) : '暂无出价'}</strong>
      </div>
      {hasTrend ? (
        <svg preserveAspectRatio="none" viewBox="0 0 100 100">
          <defs>
            <linearGradient id="bidTrendFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#1a4f95" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#1a4f95" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#bidTrendFill)" />
          <path d={path} fill="none" stroke="#1a4f95" strokeWidth="2.6" vectorEffect="non-scaling-stroke" />
          <circle cx={lastPoint.x} cy={lastPoint.y} fill="#f97316" r="3.2" />
        </svg>
      ) : (
        <div className="bid-trend-empty">暂无足够出价形成趋势</div>
      )}
      <div className="bid-trend-axis">
        <span>{points[0]?.label ?? '起点'}</span>
        <span>{lastPoint?.label ?? '最新'}</span>
      </div>
    </div>
  );
}

function AdminDetailDrawer({
  confirmPanel,
  children,
  detailItems,
  sections,
  title,
}: {
  confirmPanel?: AdminConfirmPanel;
  children?: ReactNode;
  detailItems?: AdminDetailItem[];
  sections: string[];
  title: string;
}) {
  return (
    <aside className="drawer-preview">
          <div className="drawer-preview-head">
            <span aria-hidden="true">详</span>
            <div>
              <h3>{title}</h3>
              <p>右侧详情抽屉视觉位，行操作与真实接口保持原逻辑。</p>
            </div>
          </div>
          {children}
          {detailItems?.length ? (
            <dl className="drawer-detail-list">
              {detailItems.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.fileUrl ? <button className="link-btn" onClick={() => void api.openFileUrl(item.fileUrl as string, item.attachmentId, 'ADMIN').catch((error: unknown) => window.alert(`附件暂无法打开：${getErrorMessage(error)}`))} type="button">{item.value || '查看附件'}</button> : item.value || '-'}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          {sections.map((section, index) => (
            <div className="drawer-section" key={section}>
              <strong>{index + 1}. {section}</strong>
              <p>展示 {section} 信息，后续由后端接口返回。</p>
            </div>
          ))}
          {confirmPanel ? <AdminConfirmPreview panel={confirmPanel} /> : null}
        </aside>
  );
}

function AdminConfirmPreview({ panel }: { panel: AdminConfirmPanel }) {
  return (
    <div className={`admin-confirm-preview ${panel.tone ?? 'blue'}`}>
      <strong>{panel.title}</strong>
      <p>{panel.body}</p>
      {panel.note ? <small>{panel.note}</small> : null}
    </div>
  );
}

function BatchReviewToolbar({
  disabled,
  itemLabel,
  onApprove,
  onReject,
  onSelectAll,
  onSelectNone,
  processing,
  selectedCount,
  selectableCount,
}: {
  disabled: boolean;
  itemLabel: string;
  onApprove: () => void;
  onReject: () => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  processing: boolean;
  selectedCount: number;
  selectableCount: number;
}) {
  return (
    <section className="admin-batch-toolbar" aria-label={`${itemLabel}批量操作`}>
      <div>
        <strong>{itemLabel}批量处理</strong>
        <span>已选 {selectedCount} 条，可选 {selectableCount} 条。</span>
      </div>
      <div className="button-row">
        <button disabled={disabled || processing} onClick={onSelectAll} type="button">全选当前页</button>
        <button disabled={!selectedCount || processing} onClick={onSelectNone} type="button">清空选择</button>
        <button className="btn primary" disabled={!selectedCount || processing} onClick={onApprove} type="button">
          {processing ? '操作中...' : '批量通过'}
        </button>
        <button className="btn danger" disabled={!selectedCount || processing} onClick={onReject} type="button">
          {processing ? '操作中...' : '批量驳回'}
        </button>
      </div>
    </section>
  );
}

function BatchReviewConfirmDialog({
  action,
  itemLabel,
  onCancel,
  onConfirm,
  processing,
  rejectReason,
  selectedCount,
  setRejectReason,
}: {
  action: BatchReviewAction | null;
  itemLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  processing: boolean;
  rejectReason: string;
  selectedCount: number;
  setRejectReason: (value: string) => void;
}) {
  if (!action) {
    return null;
  }

  const isReject = action === 'reject';
  const title = isReject ? '批量驳回确认' : '批量通过确认';
  const confirmLabel = processing ? '执行中...' : isReject ? '确认驳回' : '确认通过';

  return (
    <div className="admin-modal-backdrop" role="presentation">
      <section aria-modal="true" className="admin-modal" role="dialog">
        <div className="admin-modal-head">
          <span aria-hidden="true">{isReject ? '!' : '✓'}</span>
          <div>
            <h3>{title}</h3>
            <p>将对已选择的 {selectedCount} 条{itemLabel}逐条调用现有单条接口。</p>
          </div>
        </div>
        {isReject ? (
          <label className="field">
            <span>统一驳回原因</span>
            <textarea
              disabled={processing}
              onChange={(event) => setRejectReason(event.currentTarget.value)}
              rows={4}
              value={rejectReason}
            />
          </label>
        ) : (
          <p className="admin-modal-note">确认后将依次执行审核通过。若部分记录失败，失败项会保留选择，便于重试。</p>
        )}
        <div className="button-row">
          <button className="btn secondary" disabled={processing} onClick={onCancel} type="button">取消</button>
          <button
            className={isReject ? 'btn danger' : 'btn primary'}
            disabled={processing || (isReject && !rejectReason.trim())}
            onClick={onConfirm}
            type="button"
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function ContractDetailDrawerContent({ row }: { row: Record<string, unknown> }) {
  const status = getStringValue(row, 'status') || '待签约';
  const records = [
    { label: '竞拍成功', time: getStringValue(row, 'createdAt') || getStringValue(row, 'updatedAt'), done: true },
    { label: '线下签约', time: getStringValue(row, 'signedAt'), done: status === '已签约' || status === '已完成' },
    { label: '尾款确认', time: getStringValue(row, 'completedAt'), done: status === '已完成' },
  ];

  return (
    <div className="contract-drawer-content">
      <section className="contract-drawer-notice">
        <h4>核验口径</h4>
        <p>系统仅记录管理员已线下核验合同、银行回单和相关凭证，不处理线上资金、不发起付款或扣款。</p>
      </section>
      <section>
        <h4>拍品信息</h4>
        <dl>
          <div><dt>合同编号</dt><dd>{getStringValue(row, 'id') || '-'}</dd></div>
          <div><dt>拍品名称</dt><dd>{getStringValue(row, 'lotTitle') || '-'}</dd></div>
          <div><dt>拍品 ID</dt><dd>{getStringValue(row, 'lotId') || '-'}</dd></div>
          <div><dt>合同状态</dt><dd><StatusTag value={status} /></dd></div>
        </dl>
      </section>
      <section>
        <h4>资金及成交详情</h4>
        <dl>
          <div><dt>成交价</dt><dd className="money">{getStringValue(row, 'amount') || '-'}</dd></div>
          <div><dt>待付尾款</dt><dd className="money">{getStringValue(row, 'amount') || '-'}</dd></div>
          <div><dt>中标企业</dt><dd>{getStringValue(row, 'enterprise') || '-'}</dd></div>
          <div><dt>资金处理</dt><dd>系统不处理线上资金，仅记录线下核验状态。</dd></div>
        </dl>
      </section>
      <section>
        <h4>线下签约指引</h4>
        <dl>
          <div><dt>签约地址</dt><dd>华宁县宁州街道矿产资源交易服务中心二楼合同办理窗口</dd></div>
          <div><dt>办理时间</dt><dd>工作日 09:00-12:00，14:00-17:30</dd></div>
          <div><dt>联系人</dt><dd>交易服务窗口</dd></div>
          <div><dt>联系电话</dt><dd>0877-5012345</dd></div>
        </dl>
      </section>
      <section>
        <h4>状态流转记录</h4>
        <div className="contract-timeline">
          {records.map((record) => (
            <article className={record.done ? 'done' : 'todo'} key={record.label}>
              <span>{record.done ? '✓' : '•'}</span>
              <div>
                <strong>{record.label}</strong>
                <small>{record.time && record.time !== '-' ? record.time : '待记录'}</small>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

function ContractActionModal({
  defaultReason,
  onCancel,
  onConfirm,
  onDefaultReasonChange,
  pendingAction,
}: {
  defaultReason: string;
  onCancel: () => void;
  onConfirm: () => void;
  onDefaultReasonChange: (value: string) => void;
  pendingAction: { label: string; row: Record<string, unknown> };
}) {
  const isDefault = pendingAction.label === '标记违约';
  const isComplete = pendingAction.label === '确认尾款已线下支付并完成';
  const title = isDefault
    ? '确认标记违约'
    : isComplete
      ? '确认尾款线下核验'
      : '确认标记已签约';

  return (
    <div className="admin-modal-backdrop" role="presentation">
      <section className={`admin-modal-panel ${isDefault ? 'danger' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <header>
          <span>{isDefault ? '!' : '核'}</span>
          <div>
            <h2>{title}</h2>
            <p>{getStringValue(pendingAction.row, 'lotTitle') || '当前合同记录'}</p>
          </div>
        </header>
        <div className="admin-modal-body">
          <dl>
            <div><dt>中标企业</dt><dd>{getStringValue(pendingAction.row, 'enterprise') || '-'}</dd></div>
            <div><dt>成交价</dt><dd>{getStringValue(pendingAction.row, 'amount') || '-'}</dd></div>
            <div><dt>当前状态</dt><dd>{getStringValue(pendingAction.row, 'status') || '-'}</dd></div>
          </dl>
          <p className={isDefault ? 'modal-warning danger' : 'modal-warning'}>
            {isComplete
              ? '系统不处理线上资金，仅记录管理员已线下核验尾款支付凭证。请确认银行回单、合同编号和付款企业名称一致。'
              : isDefault
                ? '违约确认会推进合同异常状态。请确认已完成线下事实核验与内部审批。'
                : '请确认纸质合同已完成线下签署，系统仅记录履约状态。'}
          </p>
          {isDefault ? (
            <label className="field">
              <span>违约确认原因</span>
              <textarea onChange={(event) => onDefaultReasonChange(event.currentTarget.value)} rows={3} value={defaultReason} />
            </label>
          ) : null}
        </div>
        <footer>
          <button className="btn secondary" onClick={onCancel} type="button">取消</button>
          <button className={isDefault ? 'btn danger' : 'btn primary'} disabled={isDefault && !defaultReason.trim()} onClick={onConfirm} type="button">
            {isDefault ? '确认违约' : '确认提交'}
          </button>
        </footer>
      </section>
    </div>
  );
}

function BlacklistForm() {
  const [notice, setNotice] = useState('填写企业 ID、拍品 ID 和原因后调用真实拉黑接口。');
  const [submitting, setSubmitting] = useState(false);

  const submitBlacklist = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const payload = buildBlacklistPayload(formData);

    if (!payload.enterpriseId || !payload.lotId || !payload.reason) {
      setNotice('企业 ID、拍品 ID 和拉黑原因不能为空。');
      return;
    }

    try {
      setSubmitting(true);
      await api.createBlacklist(payload);
      event.currentTarget.reset();
      window.dispatchEvent(new Event(ADMIN_LIST_REFRESH_EVENT));
      setNotice('手动拉黑已提交，列表已刷新。');
    } catch (error) {
      setNotice(`手动拉黑失败：${getErrorMessage(error)}。页面数据已保持不变。`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="long-form admin-form" id={BLACKLIST_FORM_ID} onSubmit={(event) => void submitBlacklist(event)}>
      <fieldset>
        <legend>手动拉黑</legend>
        <div className="form-grid">
          <label className="field">
            <span>企业 ID</span>
            <input name="enterpriseId" placeholder="请输入企业 ID" />
          </label>
          <label className="field">
            <span>拍品 ID</span>
            <input name="lotId" placeholder="请输入关联拍品 ID" />
          </label>
          <label className="field">
            <span>拉黑原因</span>
            <input name="reason" placeholder="请输入拉黑原因" />
          </label>
        </div>
        <div className="button-row">
          <button className="btn danger" disabled={submitting} type="submit">手动拉黑</button>
        </div>
        <p className="admin-api-notice">{notice}</p>
      </fieldset>
    </form>
  );
}

function useAdminRowAction(
  handlers: Record<string, (id: string) => Promise<AdminRowActionResult>>,
  feedbackByLabel: Partial<Record<string, (row: Record<string, unknown>) => AdminActionFeedback>> = {},
): RowActionHandler {
  return useCallback(async (label, row) => {
    const action = handlers[label];

    if (!action) {
      return;
    }

    const id = String(row.id ?? '');

    if (!id) {
      window.alert('当前记录缺少 ID，无法调用后台接口。');
      return;
    }

    try {
      if (label === '确认尾款已线下支付并完成') {
        const ok = window.confirm('系统不处理线上资金，仅记录管理员已核验线下尾款支付凭证，请确认是否继续？');

        if (!ok) {
          return;
        }
      }

      const result = await action(id);

      if (result === false) {
        return;
      }

      window.dispatchEvent(new Event(ADMIN_LIST_REFRESH_EVENT));
      const feedback = feedbackByLabel[label]?.(row);

      if (feedback) {
        window.dispatchEvent(new CustomEvent<AdminActionFeedback>(ADMIN_ACTION_FEEDBACK_EVENT, { detail: feedback }));
      } else {
        window.alert(`${label}已提交。`);
      }
    } catch (error) {
      window.dispatchEvent(new CustomEvent<AdminActionFeedback>(ADMIN_ACTION_FEEDBACK_EVENT, {
        detail: {
          message: `${label}调用后台接口失败：${getErrorMessage(error)}。页面数据已保持不变。`,
          actions: [{ label: '刷新列表', tone: 'primary', onClick: () => window.dispatchEvent(new Event(ADMIN_LIST_REFRESH_EVENT)) }],
        },
      }));
    }
  }, [handlers, feedbackByLabel]);
}

function useBatchReview({
  config,
  rows,
  onComplete,
  setFeedback,
}: {
  config?: AdminBatchReviewConfig;
  rows: Record<string, unknown>[];
  onComplete: () => Promise<void>;
  setFeedback: (feedback: AdminActionFeedback | null) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [rejectReason, setRejectReason] = useState(REVIEW_REJECT_REASON);
  const [processing, setProcessing] = useState(false);
  const [pendingAction, setPendingAction] = useState<BatchReviewAction | null>(null);
  const selectableRows = useMemo(() => {
    if (!config) {
      return [];
    }

    return rows.filter((row) => {
      const id = getRowId(row);
      return Boolean(id) && (config.isSelectable?.(row) ?? true);
    });
  }, [config, rows]);
  const selectedRows = useMemo(() => {
    const selected = new Set(selectedIds);
    return selectableRows.filter((row) => selected.has(getRowId(row)));
  }, [selectableRows, selectedIds]);

  const toggle = useCallback((id: string, checked: boolean) => {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(id) ? current : [...current, id];
      }

      return current.filter((item) => item !== id);
    });
  }, []);
  const selectAll = useCallback(() => setSelectedIds(selectableRows.map(getRowId)), [selectableRows]);
  const clearSelection = useCallback(() => setSelectedIds([]), []);
  const requestRun = useCallback((action: BatchReviewAction) => {
    if (!config || processing || !selectedRows.length) {
      return;
    }

    if (action === 'reject' && !rejectReason.trim()) {
      window.alert('请填写统一驳回原因。');
      return;
    }

    setPendingAction(action);
  }, [config, processing, rejectReason, selectedRows.length]);
  const cancelRun = useCallback(() => {
    if (!processing) {
      setPendingAction(null);
    }
  }, [processing]);
  const confirmRun = useCallback(async () => {
    const action = pendingAction;

    if (!config || processing || !selectedRows.length) {
      return;
    }

    const reason = rejectReason.trim();
    if (action === 'reject' && !reason) {
      window.alert('请填写统一驳回原因。');
      return;
    }

    setProcessing(true);
    try {
      const results: BatchReviewResult[] = [];

      for (const row of selectedRows) {
        const id = getRowId(row);
        try {
          if (action === 'approve') {
            await config.approve(id);
          } else {
            await config.reject(id, reason);
          }
          results.push({ id, title: getBatchReviewTitle(row), ok: true });
        } catch (error) {
          results.push({ id, title: getBatchReviewTitle(row), ok: false, message: getErrorMessage(error) });
        }
      }

      const failed = results.filter((result) => !result.ok);
      const succeededCount = results.length - failed.length;
      setFeedback({
        message: `${config.itemLabel}${action === 'approve' ? '批量通过' : '批量驳回'}完成：成功 ${succeededCount} 条，失败 ${failed.length} 条。`,
        actions: [{ label: '刷新列表', tone: 'primary', onClick: () => window.dispatchEvent(new Event(ADMIN_LIST_REFRESH_EVENT)) }],
        details: failed.map((result) => `${result.title || result.id}：${result.message ?? '未知错误'}`),
      });
      setSelectedIds(failed.map((result) => result.id));
      await onComplete();
    } finally {
      setProcessing(false);
      setPendingAction(null);
    }
  }, [config, onComplete, pendingAction, processing, rejectReason, selectedRows, setFeedback]);

  return {
    cancelRun,
    clearSelection,
    confirmRun,
    isSelected: (id: string) => selectedIds.includes(id),
    pendingAction,
    processing,
    requestRun,
    rejectReason,
    selectAll,
    selectableRows,
    selectedRows,
    setRejectReason,
    toggle,
  };
}

function createBatchSelectionColumn(batchReview: ReturnType<typeof useBatchReview>): TableColumn<Record<string, unknown>> {
  const allSelected = Boolean(batchReview.selectableRows.length) && batchReview.selectedRows.length === batchReview.selectableRows.length;
  const someSelected = batchReview.selectedRows.length > 0 && !allSelected;

  return {
    key: 'batchSelect',
    label: (
      <BatchSelectAllCheckbox
        checked={allSelected}
        disabled={!batchReview.selectableRows.length || batchReview.processing}
        indeterminate={someSelected}
        onChange={(checked) => {
          if (checked) {
            batchReview.selectAll();
            return;
          }

          batchReview.clearSelection();
        }}
      />
    ),
    width: '64px',
    render: (row) => {
      const id = getRowId(row);
      const selectable = batchReview.selectableRows.some((item) => getRowId(item) === id);

      return (
        <label className="batch-check-cell">
          <input
            aria-label={`选择${getBatchReviewTitle(row) || id}`}
            checked={batchReview.isSelected(id)}
            disabled={!selectable || batchReview.processing}
            onChange={(event) => batchReview.toggle(id, event.currentTarget.checked)}
            type="checkbox"
          />
        </label>
      );
    },
  };
}

function BatchSelectAllCheckbox({
  checked,
  disabled,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  indeterminate: boolean;
  onChange: (checked: boolean) => void;
}) {
  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <label className="batch-check-cell">
      <input
        aria-label="全选当前页"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.currentTarget.checked)}
        ref={checkboxRef}
        type="checkbox"
      />
    </label>
  );
}

function getBatchReviewTitle(row: Record<string, unknown>) {
  return getStringValue(row, 'title') || getStringValue(row, 'name') || getStringValue(row, 'enterprise') || getStringValue(row, 'lotTitle') || getRowId(row);
}

function canLoadAdminData() {
  const profile = getAuthProfile('ADMIN');
  return Boolean(getAuthToken('ADMIN') && profile?.roleCode === 'ADMIN');
}

function getEnterpriseReviewDetailItems(row: Record<string, unknown>): AdminDetailItem[] {
  return [
    { label: '企业名称', value: getStringValue(row, 'name') },
    { label: '联系人', value: getStringValue(row, 'contact') },
    { label: '联系电话', value: getStringValue(row, 'phone') },
    { label: '主营/用户类别', value: getStringValue(row, 'category') },
    { label: '用户类型', value: getStringValue(row, 'type') },
    { label: '统一社会信用代码', value: getStringValue(row, 'creditCode') },
    {
      label: '营业执照',
      value: getStringValue(row, 'businessLicenseFileName') || '未提交',
      fileUrl: getStringValue(row, 'businessLicenseFileUrl'),
      attachmentId: getStringValue(row, 'businessLicenseAttachmentId'),
    },
    {
      label: '企业资质',
      value: getStringValue(row, 'qualificationFileName') || '未提交',
      fileUrl: getStringValue(row, 'qualificationFileUrl'),
      attachmentId: getStringValue(row, 'qualificationAttachmentId'),
    },
    {
      label: '授权材料',
      value: getStringValue(row, 'authorizationMaterialFileName') || '未提交',
      fileUrl: getStringValue(row, 'authorizationMaterialUrl'),
      attachmentId: getStringValue(row, 'authorizationMaterialAttachmentId'),
    },
    { label: '头像', value: '暂未提供' },
    { label: '提交时间', value: getStringValue(row, 'submittedAt') },
    { label: '审核状态', value: getStringValue(row, 'status') },
    { label: '驳回原因', value: getStringValue(row, 'rejectReason') },
  ];
}

function getEnterpriseMaterialItems(row: Record<string, unknown>): AdminDetailItem[] {
  return getEnterpriseReviewDetailItems(row).filter((item) => Boolean(item.fileUrl || item.attachmentId));
}

function getContractDetailItems(row: Record<string, unknown>): AdminDetailItem[] {
  return [
    { label: '拍品名称', value: getStringValue(row, 'lotTitle') },
    { label: '中标企业', value: getStringValue(row, 'enterprise') },
    { label: '成交价', value: getStringValue(row, 'amount') },
    { label: '合同状态', value: getStringValue(row, 'status') },
    { label: '签约时间', value: getStringValue(row, 'signedAt') },
    { label: '完成时间', value: getStringValue(row, 'completedAt') },
    { label: '更新时间', value: getStringValue(row, 'updatedAt') },
    { label: '操作人', value: getStringValue(row, 'operator') },
  ];
}

function buildProgressNodes(
  lot?: Lot,
  result?: ResultWorkflowRecord,
  contract?: ContractWorkflowRecord,
): Array<{ label: string; state: FlowNodeState; time: string; operator: string; note: string }> {
  const currentIndex = getProgressIndex(lot, result, contract);
  const completed = (index: number): FlowNodeState => {
    if (contract?.status === '违约') {
      return index <= currentIndex ? 'danger' : 'todo';
    }

    if (index < currentIndex) {
      return 'done';
    }

    return index === currentIndex ? 'active' : 'todo';
  };

  const updatedAt = lot?.updatedAt || '-';
  const resultTime = result?.publishedAt && result.publishedAt !== '-' ? result.publishedAt : result?.generatedAt ?? '-';

  return [
    { label: '拍品创建', state: completed(0), time: updatedAt, operator: '拍品接口', note: '根据拍品记录存在生成。' },
    { label: '发布复核', state: completed(1), time: updatedAt, operator: '审核接口', note: '根据拍品状态达到公示及后续阶段推导。' },
    { label: '公示中', state: completed(2), time: lot?.publicityPeriod ?? '-', operator: '拍品状态', note: '根据公告公示期与状态生成。' },
    { label: '意向金提交', state: completed(3), time: '-', operator: '凭证审核', note: '拍品结束前均可提交，当前页面未读取完整凭证记录。' },
    { label: '意向金审核', state: completed(4), time: '-', operator: '凭证审核', note: '审核通过才放行报价，竞拍状态推进不依赖凭证提交。' },
    { label: '竞价中', state: completed(5), time: lot?.auctionTime ?? '-', operator: '竞价状态', note: '根据拍品竞价时间与状态生成。' },
    { label: '竞价结束', state: completed(6), time: result?.generatedAt ?? updatedAt, operator: '结拍服务', note: '成交结果存在时视为竞价已结束。' },
    { label: '成交公示', state: completed(7), time: resultTime, operator: '成交结果接口', note: '根据公开/后台成交结果生成。' },
    { label: '线下签约', state: completed(8), time: contract?.signedAt ?? '-', operator: '合同接口', note: '根据合同状态 SIGNED/COMPLETED 推导。' },
    { label: '尾款确认', state: completed(9), time: contract?.completedAt ?? '-', operator: '合同接口', note: '管理员确认线下尾款后进入完成。' },
    { label: '完成', state: completed(10), time: contract?.completedAt ?? '-', operator: '合同接口', note: '根据合同已完成状态生成。' },
  ];
}

function getProgressIndex(lot?: Lot, result?: ResultWorkflowRecord, contract?: ContractWorkflowRecord): number {
  if (contract?.status === '已完成') {
    return 10;
  }

  if (contract?.status === '已签约') {
    return 9;
  }

  if (contract?.status === '待签约' || lot?.status === '待签约' || lot?.status === '已签约') {
    return 8;
  }

  if (result?.status === '已公示' || lot?.status === '成交公示中') {
    return 7;
  }

  if (result) {
    return 6;
  }

  if (lot?.status === '竞拍中') {
    return 5;
  }

  if (lot?.status === '公示中') {
    return 2;
  }

  if (lot?.status === '待发布复核') {
    return 1;
  }

  return 0;
}

function getActiveProgressLabel(nodes: Array<{ label: string; state: FlowNodeState }>) {
  return nodes.find((node) => node.state === 'active' || node.state === 'danger')?.label ?? '已完成';
}

function selectProgressLot(
  lots: Lot[],
  results: ResultWorkflowRecord[],
  contracts: ContractWorkflowRecord[],
  queryId?: string,
) {
  if (queryId) {
    const matched = lots.find((lot) => lot.id === queryId) ?? lots.find((lot) => results.some((result) => result.id === queryId && result.lotId === lot.id));

    if (matched) {
      return matched;
    }
  }

  const contractLot = contracts[0]?.lotId;
  const resultLot = results[0]?.lotId;
  return lots.find((lot) => lot.id === contractLot || lot.id === resultLot) ?? lots[0];
}

function selectBidDetailLot(lots: Lot[], bids: BidRecord[], queryId?: string) {
  if (queryId) {
    const byId = lots.find((lot) => lot.id === queryId);

    if (byId) {
      return byId;
    }

    const matchedBid = bids.find((bid) => bid.lotId === queryId);
    const byBidTitle = matchedBid ? lots.find((lot) => lot.title === matchedBid.lotTitle) : undefined;

    if (byBidTitle) {
      return byBidTitle;
    }
  }

  const firstBid = bids[0];

  if (firstBid) {
    return lots.find((lot) => lot.id === firstBid.lotId) ?? lots.find((lot) => lot.title === firstBid.lotTitle) ?? lots[0];
  }

  return lots[0];
}

function buildBidLotRows(lots: Lot[], bids: BidRecord[]): Record<string, unknown>[] {
  const lotById = new Map(lots.map((lot) => [lot.id, lot]));
  const lotTitleById = new Map(lots.map((lot) => [lot.title, lot]));
  const bidsByLot = new Map<string, BidRecord[]>();

  bids.forEach((bid) => {
    const lot = lotById.get(bid.lotId) ?? lotTitleById.get(bid.lotTitle);
    const lotId = lot?.id ?? bid.lotId ?? bid.lotTitle;
    bidsByLot.set(lotId, [...(bidsByLot.get(lotId) ?? []), bid]);
  });

  const rows: Record<string, unknown>[] = lots.map((lot) => {
    const lotBids = bidsByLot.get(lot.id) ?? [];
    const summary = buildBidDetailSummary(lotBids);

    return {
      id: lot.id,
      lotId: lot.id,
      lotTitle: lot.title,
      title: lot.title,
      status: lot.status,
      highestAmount: lotBids.length ? summary.highestAmount : '-',
      bidCount: lotBids.length,
      enterpriseCount: summary.enterpriseCount,
      lastBidTime: lotBids.length ? summary.lastBidTime : '-',
      hasBids: lotBids.length ? '有出价' : '暂无出价',
    };
  });

  bidsByLot.forEach((lotBids, lotId) => {
    if (lotById.has(lotId)) {
      return;
    }

    const summary = buildBidDetailSummary(lotBids);
    const firstBid = lotBids[0];
    rows.push({
      id: lotId,
      lotId,
      lotTitle: firstBid?.lotTitle ?? lotId,
      title: firstBid?.lotTitle ?? lotId,
      status: firstBid?.auctionStatus ?? '暂无拍品信息',
      highestAmount: summary.highestAmount,
      bidCount: lotBids.length,
      enterpriseCount: summary.enterpriseCount,
      lastBidTime: summary.lastBidTime,
      hasBids: '有出价',
    });
  });

  return rows.sort((left, right) => Number(right.bidCount ?? 0) - Number(left.bidCount ?? 0));
}

function filterBidsForLot(bids: BidRecord[], lot: Lot) {
  return bids.filter((bid) => bid.lotId === lot.id || (!bid.lotId && bid.lotTitle === lot.title) || bid.lotTitle === lot.title);
}

function buildBidDetailSummary(bids: BidRecord[]) {
  const highestBid = bids.reduce<BidRecord | undefined>((current, bid) => {
    if (!current) {
      return bid;
    }

    return parseMoneyValue(bid.amount) > parseMoneyValue(current.amount) ? bid : current;
  }, undefined);
  const lastBid = bids.reduce<BidRecord | undefined>((current, bid) => isBidAfter(bid, current) ? bid : current, undefined);

  return {
    auctionStatus: bids[0]?.auctionStatus ?? '暂无出价',
    enterpriseCount: new Set(bids.map((bid) => bid.enterprise).filter(Boolean)).size,
    highestAmount: highestBid?.amount ?? '-',
    lastBidTime: lastBid?.bidTime ?? '-',
  };
}

function isBidAfter(bid: BidRecord, current?: BidRecord) {
  if (!current) {
    return true;
  }

  const bidTime = new Date(bid.bidTime).getTime();
  const currentTime = new Date(current.bidTime).getTime();

  if (!Number.isFinite(bidTime) || !Number.isFinite(currentTime)) {
    return bid.id > current.id;
  }

  return bidTime > currentTime;
}

function buildBidTrendPoints(bids: BidRecord[], startPrice?: string) {
  const sortedBids = [...bids].sort((left, right) => isBidAfter(left, right) ? 1 : -1);
  const bidAmounts = sortedBids.map((bid) => parseMoneyValue(bid.amount)).filter((value) => value > 0);
  const startAmount = startPrice ? parseMoneyValue(startPrice) : 0;
  const amounts = startAmount > 0 ? [startAmount, ...bidAmounts] : bidAmounts;

  if (amounts.length === 0) {
    return [];
  }

  const min = Math.min(...amounts);
  const max = Math.max(...amounts);
  const range = Math.max(max - min, 1);
  const denominator = Math.max(amounts.length - 1, 1);

  return amounts.map((amount, index) => ({
    amount,
    label: index === 0 && startAmount > 0 ? '起拍价' : `第 ${startAmount > 0 ? index : index + 1} 次`,
    x: (index / denominator) * 100,
    y: 88 - ((amount - min) / range) * 72,
  }));
}

function buildTrendPath(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
}

function mapClosingPendingRow(lot: AuctionClosingPendingLot): Record<string, unknown> {
  return {
    id: lot.lotId,
    title: lot.title,
    endAt: formatDateTime(lot.endAt),
    currentPrice: lot.currentHighestPrice ? `${lot.currentHighestPrice} 元` : '-',
    status: lot.status === 'BIDDING' ? '竞拍中' : lot.status,
  };
}

function getClosingRunStatusLabel(status: AuctionClosingRunRecord['status']) {
  return status === 'SUCCESS' ? '成功' : '失败';
}

function getClosingRunTriggerLabel(trigger: AuctionClosingRunRecord['trigger']) {
  return trigger === 'manual' ? '手动执行' : '自动调度';
}

function formatClosingRun(run: AuctionClosingRunRecord) {
  const summary = run.summary;
  const result = `检查 ${summary.checkedLots}，成交 ${summary.closedLots}，无出价 ${summary.endedWithoutBids}，跳过 ${summary.skippedLots}`;
  const error = run.errorMessage ? `；${run.errorMessage}` : '';
  return `${formatDateTime(run.finishedAt)}；${result}${error}`;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('zh-CN', { hour12: false });
}

function getLotManagementTarget(label: string, row: Record<string, unknown>) {
  const id = getRowId(row);

  if (label === '查看') {
    return getLotProgressTarget(row);
  }

  if (label === '编辑') {
    return id ? `/admin/lots/edit?id=${id}` : '/admin/lots/edit';
  }

  return undefined;
}

function getDepositReviewTarget() {
  return undefined;
}

function getBidLotTarget(label: string, row: Record<string, unknown>) {
  if (label === '查看出价详情') {
    const lotId = getStringValue(row, 'lotId') || getRowId(row);

    return lotId ? `/admin/lots/bids?id=${encodeURIComponent(lotId)}` : '/admin/lots/bids';
  }

  return undefined;
}

function getEnterpriseReviewTarget(label: string, row: Record<string, unknown>) {
  if (label === '查看') {
    const id = getRowId(row);

    return id ? `/admin/reviews/enterprises/detail?id=${encodeURIComponent(id)}` : '/admin/reviews/enterprises/detail';
  }

  return undefined;
}

function getResultTarget(label: string) {
  if (label === '查看') {
    return undefined;
  }

  return undefined;
}

function getLotProgressTarget(row: Record<string, unknown>) {
  const lotId = getStringValue(row, 'lotId') || getLotIdByTitle(row) || getStringValue(row, 'id');

  return lotId ? `/admin/lots/progress?id=${lotId}` : '/admin/lots/progress';
}

function getLotBiddingActionLabel(row: Record<string, unknown>) {
  const status = getStringValue(row, 'status');
  const statusCode = getStringValue(row, 'statusCode');

  return status === '公示中' || statusCode === 'ANNOUNCING' ? '进入竞拍' : undefined;
}

function getLotAdminTarget(row: Record<string, unknown>) {
  const lotId = getStringValue(row, 'lotId') || getLotIdByTitle(row);

  return lotId ? `/admin/lots/edit?id=${lotId}` : '/admin/lots';
}

function getLotIdByTitle(row: Record<string, unknown>) {
  return getStringValue(row, 'lotId');
}

function getRowId(row: Record<string, unknown>) {
  return getStringValue(row, 'id');
}

function getQueryParam(key: string) {
  return new URLSearchParams(window.location.search).get(key) ?? undefined;
}

function getStringValue(row: Record<string, unknown>, key: string) {
  const value = row[key];

  return value === undefined || value === null ? '' : String(value);
}

function openDepositVoucherPreview(row: Record<string, unknown>): boolean {
  const fileUrl = getStringValue(row, 'voucherFileUrl');
  const attachmentId = getStringValue(row, 'attachmentId');

  if (fileUrl || attachmentId) {
    void api.openFileUrl(fileUrl, attachmentId, 'ADMIN').catch((error: unknown) => window.alert(`凭证文件暂无法打开：${getErrorMessage(error)}`));
    return true;
  }

  window.alert('当前记录未返回可预览的凭证链接，请联系后端补充文件地址后再查看。');
  return true;
}

function filterRowsByText(rows: Record<string, unknown>[], filters: FilterValues): Record<string, unknown>[] {
  const values = Object.values(filters).map(normalizeFilterText).filter(Boolean);

  if (values.length === 0) {
    return rows;
  }

  return rows.filter((row) => {
    const haystack = normalizeFilterText(
      Object.values(row)
        .filter((value) => typeof value === 'string' || typeof value === 'number')
        .join(' '),
    );

    return values.every((value) => haystack.includes(value));
  });
}

function normalizeFilterText(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function buildLotPayload(formData: FormData): LotMutationPayload {
  const productInfo = getFormValue(formData, 'productInfo');

  return {
    title: getFormValue(formData, 'title'),
    imageOneUrl: getFormValue(formData, 'imageOneUrl'),
    imageTwoUrl: getFormValue(formData, 'imageTwoUrl'),
    startPrice: getFormValue(formData, 'startPrice'),
    quantity: getFormValue(formData, 'quantity'),
    quantityUnit: '吨',
    supplier: getFormValue(formData, 'supplier'),
    origin: getFormValue(formData, 'origin'),
    deadlineAt: toIsoFromDateTimeLocal(getFormValue(formData, 'deadlineAt')),
    deliveryMethod: getFormValue(formData, 'deliveryMethod'),
    productInfo,
    productDetail: productInfo,
    inspectionReportUrl: getFormValue(formData, 'inspectionReportUrl'),
    email: getFormValue(formData, 'email'),
    phone: getFormValue(formData, 'phone'),
    mineralCategory: '磷矿石',
    grade: 'P2O5 28%',
    assessedPrice: getFormValue(formData, 'assessedPrice'),
    depositRatio: getFormValue(formData, 'depositRatio'),
    depositAmount: getFormValue(formData, 'depositAmount'),
    bidIncrement: getFormValue(formData, 'bidIncrement'),
    announcementStartAt: toIsoFromDateTimeLocal(getFormValue(formData, 'announcementStartAt')),
    announcementEndAt: toIsoFromDateTimeLocal(getFormValue(formData, 'announcementEndAt')),
    biddingStartAt: toIsoFromDateTimeLocal(getFormValue(formData, 'biddingStartAt')),
    biddingEndAt: toIsoFromDateTimeLocal(getFormValue(formData, 'biddingEndAt')),
    customerNotice: getFormValue(formData, 'customerNotice'),
    extensionEnabled: getFormValue(formData, 'extensionEnabled') === 'true',
    extensionRule: getFormValue(formData, 'extensionRule'),
  };
}

function buildContentPayload(formData: FormData): ContentMutationPayload {
  return {
    title: getFormValue(formData, 'title'),
    category: getFormValue(formData, 'category'),
    summary: getFormValue(formData, 'summary'),
    body: getFormValue(formData, 'body'),
  };
}

function buildBlacklistPayload(formData: FormData): BlacklistMutationPayload {
  return {
    enterpriseId: getFormValue(formData, 'enterpriseId'),
    lotId: getFormValue(formData, 'lotId'),
    reason: getFormValue(formData, 'reason'),
  };
}

function getContentCategoryCode(row?: Record<string, unknown>): string {
  const categoryCode = String(row?.categoryCode ?? '');

  if (categoryCode) {
    return categoryCode;
  }

  const category = String(row?.category ?? '');
  const isCode = CONTENT_CATEGORY_OPTIONS.some(([code]) => code === category);

  if (isCode) {
    return category;
  }

  return CONTENT_CATEGORY_BY_LABEL[category] ?? 'MINING_NEWS';
}

function getFormValue(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

function toDateTimeLocalValue(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function toIsoFromDateTimeLocal(value: string): string {
  if (!value) {
    return value;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function formatLargeMoneyUnit(value: string): string {
  const amount = Number(value);

  if (!Number.isFinite(amount) || amount <= 0) {
    return '输入数字后显示大额单位';
  }

  if (amount >= 100000000) {
    return `${formatUnitNumber(amount / 100000000)} 亿元`;
  }

  if (amount >= 10000) {
    return `${formatUnitNumber(amount / 10000)} 万元`;
  }

  return `${formatUnitNumber(amount)} 元`;
}

function parseMoneyValue(value: string): number {
  const normalized = value.replace(/,/g, '');
  const matched = normalized.match(/-?\d+(?:\.\d+)?/);

  if (!matched) {
    return 0;
  }

  const amount = Number(matched[0]);
  if (!Number.isFinite(amount)) {
    return 0;
  }

  if (normalized.includes('亿')) {
    return amount * 100000000;
  }

  if (normalized.includes('万')) {
    return amount * 10000;
  }

  return amount;
}

function formatDashboardMoney(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return '0 元';
  }

  if (value >= 100000000) {
    return `${formatUnitNumber(value / 100000000)} 亿元`;
  }

  if (value >= 10000) {
    return `${formatUnitNumber(value / 10000)} 万元`;
  }

  return `${formatUnitNumber(value)} 元`;
}

function formatUnitNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '未知错误';
}

function createAdminCaptcha() {
  const left = Math.floor(Math.random() * 8) + 2;
  const right = Math.floor(Math.random() * 8) + 1;

  return {
    label: `${left} + ${right} = ?`,
    answer: left + right,
  };
}

function PageHead({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: Action[] }) {
  return (
    <section className="admin-page-head">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <ButtonRow actions={actions} /> : null}
    </section>
  );
}
