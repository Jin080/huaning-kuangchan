import { type ChangeEvent, type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { ButtonRow } from '../components/Button';
import { SectionHeader, StatCards } from '../components/Cards';
import { DataTable } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { AdminLayout } from '../components/Layouts';
import { StatusTag } from '../components/StatusTag';
import { ErrorState, TableSkeleton } from '../components/StatusViews';
import { navigateTo } from '../navigation';
import {
  ApiError,
  api,
  type BlacklistMutationPayload,
  type ContentMutationPayload,
  type ContractWorkflowRecord,
  type LotMutationPayload,
  type ResultWorkflowRecord,
  type UploadCategory,
} from '../services/api';
import type { Lot } from '../types';
import { getAuthProfile } from '../services/auth';
import type { Action, TableColumn } from '../types';

type AdminListConfig = {
  title: string;
  active: string;
  subActive: string;
  filters: string[];
  summaryCards?: AdminSummaryCard[];
  fallbackRows: Record<string, unknown>[];
  loadRows?: () => Promise<Record<string, unknown>[]>;
  columns: TableColumn<Record<string, unknown>>[];
  topActions?: Action[];
  drawerTitle: string;
  drawerSections: string[];
  detailItems?: (row: Record<string, unknown>) => AdminDetailItem[];
  drawerContent?: (row: Record<string, unknown>) => ReactNode;
  confirmPanel?: AdminConfirmPanel;
};

type RowActionHandler = (label: string, row: Record<string, unknown>) => Promise<void>;
type RowNavigationHandler = (label: string, row: Record<string, unknown>) => string | undefined;
type AdminActionFeedback = {
  message: string;
  actions: Action[];
};
type AdminSummaryCard = {
  label: string;
  value: string;
  helper: string;
  tone?: 'blue' | 'orange' | 'green' | 'red';
};
type AdminDetailItem = {
  label: string;
  value: string;
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

const REVIEW_REJECT_REASON = '后台页面快速驳回，请补充或修正资料。';
const BLACKLIST_RELEASE_REASON = '后台页面手动解除黑名单。';
const ADMIN_LIST_REFRESH_EVENT = 'admin-list-refresh';
const ADMIN_ACTION_FEEDBACK_EVENT = 'admin-action-feedback';
const BLACKLIST_FORM_ID = 'admin-blacklist-form';
const LOT_FORM_FIELDS: Array<[keyof LotMutationPayload, string, string]> = [
  ['imageOneUrl', '图一', 'https://files.example.com/e2e-lot-a.jpg'],
  ['imageTwoUrl', '图二', 'https://files.example.com/e2e-lot-b.jpg'],
  ['title', '拍品标题', 'T14-华宁矿产竞拍验收标的'],
  ['startPrice', '单价/起拍价', '100'],
  ['quantity', '数量', '100.000'],
  ['supplier', '供应商', '华宁矿产供应有限公司'],
  ['origin', '产地', '云南华宁'],
  ['deadlineAt', '截止日期', new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()],
  ['deliveryMethod', '发货方式', '买方自提'],
  ['email', '电子邮箱', 'auction@example.com'],
  ['phone', '联系电话预留', '0877-0000000'],
  ['productInfo', '商品信息/商品详情', '验收用矿产资源标的'],
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
  const currentProfile = getAuthProfile();

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
      const result = await api.login(username.trim(), password);

      if (result.profile.roleCode !== 'ADMIN') {
        await api.logout();
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
          <button onClick={() => navigateTo('/login')} type="button">企业登录</button>
          <button onClick={() => navigateTo('/')} type="button">返回门户首页</button>
        </div>
      </section>
    </div>
  );
}

const rowActions = (onAction?: RowActionHandler, labels: string[] = [], getTarget?: RowNavigationHandler): TableColumn<Record<string, unknown>> => ({
  key: 'actions',
  label: '操作',
  render: (row) => (
    <div className="inline-actions">
      {labels.map((label) => (
        <button
          className={label.includes('驳回') || label.includes('违约') || label.includes('拉黑') ? 'danger-link' : 'link-btn'}
          key={label}
          onClick={() => {
            const target = getTarget?.(label, row);

            if (target) {
              navigateTo(target);
              return;
            }

            void onAction?.(label, row);
          }}
          type="button"
        >
          {label}
        </button>
      ))}
    </div>
  ),
});

function renderLotCell(row: Record<string, unknown>) {
  const title = getStringValue(row, 'title') || getStringValue(row, 'lotTitle') || '-';
  const id = getStringValue(row, 'id') || getStringValue(row, 'lotId') || '暂无编号';

  return (
    <div className="admin-object-cell">
      <span aria-hidden="true">矿</span>
      <div>
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

  if (fileUrl) {
    return <a className="link-btn" href={fileUrl} rel="noreferrer" target="_blank">{fileName}</a>;
  }

  return <span>{fileName}</span>;
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

export function AdminDashboard() {
  const [todoCounts, setTodoCounts] = useState({ lotReviews: '-', enterpriseReviews: '-', depositReviews: '-' });
  const [todoNotice, setTodoNotice] = useState('正在加载待办审核数量...');
  const [todoState, setTodoState] = useState<'loading' | 'ready' | 'error'>('loading');
  const todoItems = [
    { label: '待发布复核', helper: '矿权上架前终审', value: todoCounts.lotReviews, tone: 'orange', to: '/admin/reviews/lots' },
    { label: '待企业认证审核', helper: '新增竞买人资质', value: todoCounts.enterpriseReviews, tone: 'blue', to: '/admin/reviews/enterprises' },
    { label: '待意向金凭证审核', helper: '线下汇款确认', value: todoCounts.depositReviews, tone: 'red', to: '/admin/reviews/deposits' },
  ];
  const logRows = api.getLogs().slice(0, 4);

  useEffect(() => {
    void api.fetchAdminTodoCounts().then((counts) => {
      setTodoCounts({
        lotReviews: String(counts.lotReviews),
        enterpriseReviews: String(counts.enterpriseReviews),
        depositReviews: String(counts.depositReviews),
      });
      setTodoNotice('待办审核数量已从真实接口加载。');
      setTodoState('ready');
    }).catch(() => {
      setTodoCounts({ lotReviews: '-', enterpriseReviews: '-', depositReviews: '-' });
      setTodoNotice('待办加载失败，请刷新。');
      setTodoState('error');
    });
  }, []);

  return (
    <AdminLayout active="首页看板">
      <PageHead title="后台首页/数据看板" subtitle="查看成交统计、审核待办与最近操作。" />
      <SectionHeader title="待办审核" subtitle="管理员登录后优先处理发布复核、企业认证和意向金凭证。" />
      <p className="admin-api-notice">{todoNotice}</p>
      {todoState === 'loading' ? <TableSkeleton columns={3} rows={3} /> : null}
      {todoState === 'error' ? (
        <ErrorState
          description="网络连接异常或服务器响应错误，待办审核数量暂时无法加载。"
          primaryAction={{ label: '重试', onClick: () => window.location.reload() }}
          secondaryAction={{ label: '联系技术支持', to: '/admin/logs' }}
        />
      ) : null}
      {todoState === 'ready' ? (
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
      <StatCards stats={api.getStats()} />
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
            rows={api.getResults().slice(0, 5) as unknown as Record<string, unknown>[]}
          />
        </div>
        <aside className="admin-panel admin-log-panel">
          <SectionHeader action="完整审计" actionTo="/admin/logs" title="系统操作日志" />
          <div className="admin-log-list">
            {logRows.map((log) => (
              <article key={log.id}>
                <span aria-hidden="true" />
                <small>{log.operatedAt} · {log.operator}</small>
                <p>{log.action}：{log.objectName}</p>
              </article>
            ))}
          </div>
        </aside>
      </section>
    </AdminLayout>
  );
}

export function LotManagementPage() {
  const handleAction = useAdminRowAction({
    提交复核: (id) => api.submitLotReview(id),
    '关闭/取消': (id) => api.closeLot(id),
    进入竞拍: (id) => api.advanceLotToBidding(id),
  });

  return <AdminListPage config={{
    title: '拍品管理列表页',
    active: '拍品管理',
    subActive: '拍品管理',
    filters: ['关键词', '拍品状态', '竞拍时间', '供应商'],
    fallbackRows: api.getLots() as unknown as Record<string, unknown>[],
    loadRows: () => api.fetchAdminLots() as Promise<unknown> as Promise<Record<string, unknown>[]>,
    columns: [
      { key: 'title', label: '拍品信息', width: '28%', render: renderLotCell },
      { key: 'startPrice', label: '起拍价' },
      { key: 'quantity', label: '数量' },
      { key: 'supplier', label: '供应商' },
      { key: 'status', label: '状态', render: (row) => <StatusTag value={String(row.status)} /> },
      { key: 'auctionTime', label: '竞拍期' },
      { key: 'updatedAt', label: '更新时间' },
      rowActions(handleAction, ['查看', '编辑', '提交复核', '进入竞拍', '关闭/取消'], getLotManagementTarget),
    ],
    topActions: [
      { label: '全流程进度', to: '/admin/lots/progress' },
      { label: '新建拍品', tone: 'primary', to: '/admin/lots/edit' },
    ],
    drawerTitle: '拍品详情',
    drawerSections: ['基础信息', '竞价规则', '保证金规则', '时间规则', '附件与检测报告'],
  }} />;
}

export function LotEditPage() {
  const [notice, setNotice] = useState('请保存草稿或填写 URL 参数 id 后编辑拍品。');
  const [uploadingField, setUploadingField] = useState<string>();
  const [submittingAction, setSubmittingAction] = useState<'draft' | 'review' | null>(null);
  const formGroups: Array<[string, Array<[keyof LotMutationPayload, string, string]>]> = [
    ['基础信息', LOT_FORM_FIELDS.slice(0, 11)],
    ['商品与附件', LOT_FORM_FIELDS.slice(11, 13)],
    ['竞价业务配置', LOT_FORM_FIELDS.slice(13, 17)],
    ['时间规则', LOT_FORM_FIELDS.slice(17, 21)],
    ['客户须知与延时竞价', LOT_FORM_FIELDS.slice(21)],
  ];
  const lotId = new URLSearchParams(window.location.search).get('id') ?? undefined;
  const uploadTargets: LotUploadTarget[] = [
    { label: '拍品图一', fieldName: 'imageOneUrl', category: 'LOT_IMAGE', accept: 'image/jpeg,image/png', helper: '支持 JPG/PNG，成功后回填图一 URL' },
    { label: '拍品图二', fieldName: 'imageTwoUrl', category: 'LOT_IMAGE', accept: 'image/jpeg,image/png', helper: '支持 JPG/PNG，成功后回填图二 URL' },
    { label: '检测报告', fieldName: 'inspectionReportUrl', category: 'INSPECTION_REPORT', accept: 'application/pdf', helper: '支持 PDF，成功后回填检测报告 URL' },
  ];

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>, target: LotUploadTarget) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';

    if (!file) {
      return;
    }

    try {
      setUploadingField(target.fieldName);
      setNotice(`正在上传${target.label}：${file.name}`);
      const result = await api.uploadFile(file, target.category);
      const input = document.querySelector<HTMLInputElement>(`#admin-lot-form input[name="${target.fieldName}"]`);

      if (input) {
        input.value = result.fileUrl;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }

      setNotice(`${target.label}上传成功，已回填真实文件 URL：${result.fileUrl}`);
    } catch (error) {
      setNotice(`${target.label}上传失败：${getErrorMessage(error)}。请重新选择文件，页面不会伪造成功 URL。`);
    } finally {
      setUploadingField(undefined);
    }
  };

  const submitLot = async (submitReview: boolean) => {
    const form = document.querySelector<HTMLFormElement>('#admin-lot-form');

    if (!form || submittingAction) {
      return;
    }

    const formData = new FormData(form);
    const payload = buildLotPayload(formData);
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
      <PageHead title="新建/编辑拍品页" subtitle="填写拍品信息并保存草稿或提交发布复核。" />
      <p className="admin-api-notice">{notice}</p>
      <form className="long-form admin-form" id="admin-lot-form">
        {formGroups.map(([title, fields]) => (
          <fieldset key={title}>
            <legend>{title}</legend>
            {title === '商品与附件' ? (
              <div className="admin-upload-grid" aria-label="拍品附件上传">
                {uploadTargets.map((target) => (
                  <label className="admin-upload-card admin-upload-action" key={target.fieldName}>
                    <input
                      accept={target.accept}
                      data-upload-field={target.fieldName}
                      onChange={(event) => void handleUpload(event, target)}
                      type="file"
                    />
                    <span aria-hidden="true">{target.category === 'INSPECTION_REPORT' ? '文' : '+'}</span>
                    <strong>{target.label}</strong>
                    <small>{uploadingField === target.fieldName ? '上传中...' : target.helper}</small>
                  </label>
                ))}
              </div>
            ) : null}
            <div className="form-grid">
              {fields.map(([name, label, value]) => <LotFormField key={name} label={label} name={name} value={value} />)}
              {title === '商品与附件' ? (
                <label className="field">
                  <span>商品详情</span>
                  <input defaultValue="验收用商品详情" name="productDetail" placeholder="请输入商品详情" />
                </label>
              ) : null}
              {title === '客户须知与延时竞价' ? (
                <label className="field">
                  <span>是否启用延时竞价</span>
                  <select defaultValue="false" name="extensionEnabled">
                    <option value="false">否</option>
                    <option value="true">是</option>
                  </select>
                </label>
              ) : null}
            </div>
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

function LotFormField({ label, name, value }: { label: string; name: keyof LotMutationPayload; value: string }) {
  const isTimeField = LOT_TIME_FIELD_NAMES.has(name);
  const isMoneyField = LOT_MONEY_FIELD_NAMES.has(name);
  const [moneyValue, setMoneyValue] = useState(value);

  return (
    <label className="field" key={name}>
      <span>{label}</span>
      <input
        defaultValue={isTimeField ? toDateTimeLocalValue(value) : value}
        inputMode={isMoneyField ? 'decimal' : undefined}
        name={name}
        onChange={isMoneyField ? (event) => setMoneyValue(event.currentTarget.value) : undefined}
        placeholder={`请输入${label}`}
        step={isTimeField ? 60 : undefined}
        type={isTimeField ? 'datetime-local' : 'text'}
      />
      {isMoneyField ? <small className="money-unit-hint">{formatLargeMoneyUnit(moneyValue)}</small> : null}
    </label>
  );
}

export function LotReviewPage() {
  const handleAction = useAdminRowAction({
    审核通过: (id) => api.approveLotReview(id),
    审核驳回: (id) => api.rejectLotReview(id, REVIEW_REJECT_REASON),
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
    title: '标的发布复核页',
    active: '审核管理',
    subActive: '标的发布复核',
    filters: ['关键词', '审核状态', '提交时间'],
    fallbackRows: api.getLots().filter((x) => ['待发布复核', '公示中', '发布驳回'].includes(x.status)) as unknown as Record<string, unknown>[],
    loadRows: () => api.fetchAdminLotReviews() as Promise<unknown> as Promise<Record<string, unknown>[]>,
    columns: [
      { key: 'title', label: '拍品信息', width: '28%', render: renderLotCell },
      { key: 'supplier', label: '提交人' },
      { key: 'startPrice', label: '起拍价' },
      { key: 'deposit', label: '保证金金额' },
      { key: 'auctionTime', label: '竞拍时间' },
      { key: 'status', label: '状态', render: (row) => <StatusTag value={String(row.status)} /> },
      rowActions(handleAction, ['查看', '审核通过', '审核驳回'], getLotReviewTarget),
    ],
    drawerTitle: '标的复核详情',
    drawerSections: ['商品基础信息', '竞价规则', '保证金规则', '客户须知', '附件与检测报告', '驳回原因'],
  }} />;
}

export function EnterpriseReviewPage() {
  const handleAction = useAdminRowAction({
    审核通过: (id) => api.approveEnterpriseReview(id),
    审核驳回: (id) => api.rejectEnterpriseReview(id, REVIEW_REJECT_REASON),
  });

  return <AdminListPage config={{
    title: '企业认证审核页',
    active: '审核管理',
    subActive: '企业认证审核',
    filters: ['企业名称', '审核状态', '提交时间'],
    fallbackRows: api.getEnterprises() as unknown as Record<string, unknown>[],
    loadRows: () => api.fetchAdminEnterpriseReviews() as Promise<unknown> as Promise<Record<string, unknown>[]>,
    columns: [
      { key: 'name', label: '企业资料', width: '26%', render: renderEnterpriseCell },
      { key: 'contact', label: '联系人' },
      { key: 'phone', label: '联系电话' },
      { key: 'category', label: '用户类别' },
      { key: 'type', label: '用户类型' },
      { key: 'status', label: '审核状态', render: (row) => <StatusTag value={String(row.status)} /> },
      { key: 'submittedAt', label: '提交时间' },
      rowActions(handleAction, ['查看', '审核通过', '审核驳回']),
    ],
    drawerTitle: '企业资料详情',
    drawerSections: ['企业基础信息', '法人及联系人', '经营信息', '付款银行账户', '收款银行账户', '企业资质与营业执照', '重新提交记录'],
  }} />;
}

export function DepositReviewPage() {
  const handleAction = useAdminRowAction({
    审核通过: (id) => api.approveDepositReview(id),
    审核驳回: (id) => api.rejectDepositReview(id, REVIEW_REJECT_REASON),
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

  return <DepositReviewWorkspace handleAction={handleAction} />;
}

export function BidManagementPage() {
  return <AdminListPage config={{
    title: '竞价记录管理页',
    active: '交易管理',
    subActive: '竞价记录管理',
    filters: ['拍品名称', '企业名称', '出价时间', '是否当前最高价'],
    summaryCards: [
      { label: '出价记录', value: String(api.getBids().length), helper: '保留完整竞价留痕', tone: 'blue' },
      { label: '当前最高价', value: String(api.getBids().filter((row) => row.isHighest).length), helper: '按拍品最高价标记', tone: 'orange' },
      { label: '删除操作', value: '0', helper: '页面不提供删除入口', tone: 'green' },
    ],
    fallbackRows: api.getBids() as unknown as Record<string, unknown>[],
    loadRows: () => api.fetchAdminBids() as Promise<unknown> as Promise<Record<string, unknown>[]>,
    columns: [
      { key: 'id', label: '出价序号', width: '12%', render: renderBidSequenceCell },
      { key: 'lotTitle', label: '拍品名称', width: '26%', render: renderBusinessTitleCell },
      { key: 'enterprise', label: '企业名称' },
      { key: 'maskedEnterprise', label: '脱敏企业名称' },
      { key: 'amount', label: '出价金额' },
      { key: 'incrementTimes', label: '加价次数' },
      { key: 'bidTime', label: '出价时间' },
      rowActions(undefined, ['查看拍品', '查看企业'], getBidTarget),
    ],
    drawerTitle: '出价详情',
    drawerSections: ['拍品信息', '企业信息', '出价金额', '服务器接收时间'],
    detailItems: (row) => [
      { label: '出价序号', value: getStringValue(row, 'id') },
      { label: '拍品名称', value: getStringValue(row, 'lotTitle') },
      { label: '企业名称', value: getStringValue(row, 'enterprise') },
      { label: '脱敏企业', value: getStringValue(row, 'maskedEnterprise') },
      { label: '出价金额', value: getStringValue(row, 'amount') },
      { label: '加价次数', value: getStringValue(row, 'incrementTimes') },
      { label: '出价时间', value: getStringValue(row, 'bidTime') },
      { label: '最高价标记', value: row.isHighest ? '当前最高价' : '历史出价' },
    ],
  }} />;
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
    summaryCards: [
      { label: '成交结果', value: String(api.getResults().length), helper: '竞拍结束自动生成', tone: 'blue' },
      { label: '已公示', value: String(api.getResults().filter((row) => row.status === '已公示').length), helper: '已展示至前台成交公示', tone: 'green' },
      { label: '待发布', value: String(api.getResults().filter((row) => row.status === '已生成').length), helper: '需核对后发布公示', tone: 'orange' },
    ],
    fallbackRows: api.getResults() as unknown as Record<string, unknown>[],
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
  const fallbackRows = useMemo(() => api.getContracts() as unknown as Record<string, unknown>[], []);
  const [rows, setRows] = useState<Record<string, unknown>[]>(fallbackRows);
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown>>(fallbackRows[0] ?? {});
  const [notice, setNotice] = useState('正在尝试读取后台合同真实接口。');
  const [listState, setListState] = useState<'loading' | 'ready' | 'error'>('loading');

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

      if (error instanceof Error && error.message.includes('验收模式下真实 API 请求失败')) {
        throw error;
      }

      setRows(fallbackRows);
      setSelectedRow(fallbackRows[0] ?? {});
      setNotice('后台合同真实接口暂不可用，已回退 mock 数据。');
      setListState('ready');
    }
  }, [fallbackRows]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadRows();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadRows]);

  const runAction = async (label: string, row: Record<string, unknown>) => {
    const id = getRowId(row);

    if (!id) {
      window.alert('当前合同缺少 ID，无法调用后台接口。');
      return;
    }

    if (label === '确认尾款已线下支付并完成') {
      const ok = window.confirm('系统不处理线上资金，仅记录管理员已核验线下尾款支付凭证，请确认是否继续？');

      if (!ok) {
        return;
      }
    }

    const action = label === '标记已签约'
      ? api.markContractSigned
      : label === '确认尾款已线下支付并完成'
        ? api.markContractCompleted
        : api.markContractDefaulted;

    try {
      await action(id);
      await loadRows();
      window.alert(`${label}已提交。`);
    } catch (error) {
      window.alert(`${label}调用后台接口失败：${getErrorMessage(error)}。页面数据已保持不变。`);
    }
  };

  return (
    <AdminLayout active="交易管理" subActive="合同状态管理">
      <PageHead title="合同状态管理页" subtitle="管理全平台线下签约、尾款确认等流程状态。" />
      <p className="admin-api-notice">{notice}</p>
      <AdminSummaryStrip cards={[
        { label: '待签约', value: String(rows.filter((row) => getStringValue(row, 'status') === '待签约').length), helper: '需跟进线下合同', tone: 'orange' },
        { label: '已签约', value: String(rows.filter((row) => getStringValue(row, 'status') === '已签约').length), helper: '等待尾款核验', tone: 'blue' },
        { label: '已完成', value: String(rows.filter((row) => getStringValue(row, 'status') === '已完成').length), helper: '计入成交额看板', tone: 'green' },
      ]} />
      <section className="admin-workspace">
        <div className="admin-workspace-main">
          <FilterBar fields={['拍品名称', '企业名称', '合同状态']} />
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
                        <button className={label.includes('违约') ? 'danger-link' : 'link-btn'} key={label} onClick={() => void runAction(label, row)} type="button">{label}</button>
                      ))}
                    </div>
                  ),
                },
              ]}
              rows={rows}
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
    summaryCards: [
      { label: '未退款', value: String(api.getRefunds().filter((row) => row.status === '未退款').length), helper: '待线下处理', tone: 'orange' },
      { label: '审核中', value: String(api.getRefunds().filter((row) => row.status === '审核中').length), helper: '财务复核中', tone: 'blue' },
      { label: '已退款', value: String(api.getRefunds().filter((row) => row.status === '已退款').length), helper: '仅记录状态', tone: 'green' },
    ],
    fallbackRows: api.getRefunds() as unknown as Record<string, unknown>[],
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
  const [lots, setLots] = useState<Lot[]>(api.getLots());
  const [results, setResults] = useState<ResultWorkflowRecord[]>(api.getResults() as ResultWorkflowRecord[]);
  const [contracts, setContracts] = useState<ContractWorkflowRecord[]>(api.getContracts() as ContractWorkflowRecord[]);
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

      setNotice('后台真实接口暂不可用，已回退 mock 数据；节点仍为根据当前业务状态生成。');
    });
  }, []);

  const selectedLot = selectProgressLot(lots, results, contracts, queryId);
  const selectedResult = results.find((result) => result.lotId === selectedLot?.id);
  const selectedContract = contracts.find((contract) => contract.lotId === selectedLot?.id);
  const nodes = buildProgressNodes(selectedLot, selectedResult, selectedContract);

  return (
    <AdminLayout active="拍品管理" subActive="全流程操作进度">
      <PageHead
        title="全流程操作进度"
        subtitle="节点根据当前 lot/result/contract 数据生成，不代表独立操作记录接口。"
        actions={[{ label: '返回拍品列表', to: '/admin/lots' }]}
      />
      <p className="admin-api-notice">{notice}</p>
      {selectedLot ? (
        <div className="lot-progress-page">
          <section className="lot-progress-summary">
            <div>
              <StatusTag value={selectedContract?.status ?? selectedLot.status} />
              <h2>{selectedLot.title}</h2>
              <p>项目编号：{selectedLot.id}</p>
            </div>
            <dl>
              <div><dt>起拍价</dt><dd>{selectedLot.startPrice}</dd></div>
              <div><dt>数量</dt><dd>{selectedLot.quantity}</dd></div>
              <div><dt>供应商</dt><dd>{selectedLot.supplier}</dd></div>
              <div><dt>成交价</dt><dd>{selectedResult?.finalPrice ?? '-'}</dd></div>
            </dl>
          </section>
          <section className="flow-node-board" aria-label="全流程节点">
            {nodes.map((node, index) => (
              <article className={`flow-node ${node.state}`} key={node.label}>
                <span>{node.state === 'done' ? '✓' : index + 1}</span>
                <strong>{node.label}</strong>
                <small>{node.time}</small>
                <em>{node.operator}</em>
              </article>
            ))}
          </section>
          <section className="flow-record-panel">
            <h2>当前推导记录</h2>
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
        summaryCards: [
          { label: '已拉黑企业', value: String(api.getBlacklist().filter((row) => row.status === '已拉黑').length), helper: '禁止继续参与竞拍', tone: 'red' },
          { label: '解除入口', value: '行内', helper: '保留既有解除拉黑操作', tone: 'blue' },
          { label: '人工拉黑', value: '真实接口', helper: '提交企业 ID、拍品 ID 与原因', tone: 'orange' },
        ],
        fallbackRows: api.getBlacklist() as unknown as Record<string, unknown>[],
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
  const fallbackRows = useMemo(() => api.getContents() as unknown as Record<string, unknown>[], []);
  const [rows, setRows] = useState(fallbackRows);
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | undefined>();
  const [notice, setNotice] = useState('正在尝试读取后台内容真实接口，失败时保留 mock 数据。');

  const loadRows = useCallback(async () => {
    try {
      const nextRows = await api.fetchAdminContents() as unknown as Record<string, unknown>[];
      setRows(nextRows);
      setNotice('已加载后台内容列表；保存会调用真实内容接口。');
    } catch (error) {
      setRows(fallbackRows);
      setNotice(`后台内容真实接口不可用：${getErrorMessage(error)}`);
    }
  }, [fallbackRows]);

  const handleAction = useAdminRowAction({
    发布: (id) => api.publishContent(id),
    下架: (id) => api.unpublishContent(id),
  });

  const handleContentAction: RowActionHandler = useCallback(async (label, row) => {
    if (label === '编辑') {
      setEditingRow(row);
      setNotice(`正在编辑内容：${String(row.title ?? '')}`);
      return;
    }

    await handleAction(label, row);
  }, [handleAction]);

  const submitContent = async () => {
    const form = document.querySelector<HTMLFormElement>('#admin-content-form');

    if (!form) {
      return;
    }

    const payload = buildContentPayload(new FormData(form));
    const editingId = String(editingRow?.id ?? '');

    try {
      if (editingId) {
        await api.updateContent(editingId, payload);
        setNotice('内容已通过真实接口更新。');
      } else {
        const saved = await api.createContent(payload);
        setEditingRow(saved as unknown as Record<string, unknown>);
        setNotice('内容草稿已通过真实接口新建。');
      }

      await loadRows();
    } catch (error) {
      setNotice(`内容保存失败：${getErrorMessage(error)}`);
    }
  };

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
        actions={[{ label: '新建内容', tone: 'primary', onClick: () => setEditingRow(undefined) }]}
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
                <button className={rows.some((row) => row.category === item) ? 'active' : ''} key={item} type="button">
                  {item}
                </button>
              ))}
            </div>
          ))}
        </aside>
        <div className="admin-workspace-main">
          <FilterBar fields={['分类', '状态', '关键词']} />
          <DataTable
            columns={[
              { key: 'title', label: '标题', width: '34%', render: renderContentTitleCell },
              { key: 'category', label: '分类' },
              { key: 'status', label: '状态', render: (row) => <StatusTag value={String(row.status)} /> },
              { key: 'publishedAt', label: '发布时间' },
              { key: 'updatedBy', label: '更新人' },
              rowActions(handleContentAction, ['编辑', '发布', '下架']),
            ]}
            rows={rows}
          />
        </div>
        <aside className="drawer-preview content-editor-drawer">
          <div className="drawer-preview-head">
            <span aria-hidden="true">编</span>
            <div>
              <h3>{editingRow ? '编辑内容' : '新建内容草稿'}</h3>
              <p>发布后将在前台信息资讯或公开说明中展示；下架后前台不可见。</p>
            </div>
          </div>
          <form className="long-form admin-form" id="admin-content-form" key={String(editingRow?.id ?? 'new')}>
            <div className="form-grid">
              <label className="field">
                <span>标题</span>
                <input defaultValue={String(editingRow?.title ?? 'T21A-内容草稿')} name="title" placeholder="请输入标题" />
              </label>
              <label className="field">
                <span>分类</span>
                <select defaultValue={getContentCategoryCode(editingRow)} name="category">
                  {CONTENT_CATEGORY_OPTIONS.map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>摘要</span>
                <input defaultValue={String(editingRow?.summary ?? '后台内容真实接口验收摘要')} name="summary" placeholder="请输入摘要" />
              </label>
            </div>
            <label className="field">
              <span>正文</span>
              <textarea defaultValue={String(editingRow?.body ?? editingRow?.summary ?? '后台内容真实接口验收正文')} name="body" placeholder="请输入正文" rows={8} />
            </label>
            <div className="button-row">
              <button className="btn primary" onClick={() => void submitContent()} type="button">保存内容</button>
              <button className="btn secondary" onClick={() => setEditingRow(undefined)} type="button">新建内容</button>
            </div>
          </form>
        </aside>
      </section>
    </AdminLayout>
  );
}

export function NotificationManagementPage() {
  return <AdminListPage config={{
    title: '通知管理页',
    active: '内容运营',
    subActive: '通知管理',
    filters: ['通知类型', '通知渠道', '接收企业', '发送状态', '发送时间'],
    summaryCards: [
      { label: '发送成功', value: String(api.getNotifications().filter((row) => row.status === '发送成功').length), helper: '网关/站内投递成功', tone: 'green' },
      { label: '发送失败', value: String(api.getNotifications().filter((row) => row.status === '发送失败').length), helper: '需人工关注业务结果', tone: 'red' },
      { label: '通知类型', value: '2', helper: '成交通知与失败通知', tone: 'blue' },
    ],
    fallbackRows: api.getNotifications() as unknown as Record<string, unknown>[],
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
    summaryCards: [
      { label: '文件记录', value: String(api.getFiles().length), helper: '平台上传文件引用', tone: 'blue' },
      { label: '权限控制', value: '敏感附件', helper: '检测报告/凭证按权限查看', tone: 'orange' },
      { label: '只读盘点', value: '无删除', helper: '本页仅查看与引用追踪', tone: 'green' },
    ],
    fallbackRows: api.getFiles() as unknown as Record<string, unknown>[],
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
    summaryCards: [
      { label: '审计记录', value: String(api.getLogs().length), helper: '关键操作留痕', tone: 'blue' },
      { label: '成功操作', value: String(api.getLogs().filter((row) => row.result === '成功').length), helper: '按后端日志结果展示', tone: 'green' },
      { label: '删除按钮', value: '0', helper: '操作日志不可删除', tone: 'red' },
    ],
    fallbackRows: api.getLogs() as unknown as Record<string, unknown>[],
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
  const [rows, setRows] = useState(config.fallbackRows);
  const [notice, setNotice] = useState('正在尝试读取后台真实接口，失败时保留 mock 数据。');
  const [listState, setListState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [feedback, setFeedback] = useState<AdminActionFeedback | null>(null);

  const loadRows = useCallback(async () => {
    if (!config.loadRows) {
      setRows(config.fallbackRows);
      setNotice('当前页面暂未纳入本阶段真实接口接入。');
      setListState('ready');
      return;
    }

    try {
      const nextRows = await config.loadRows();
      setRows(nextRows);
      setNotice('已加载后台列表；真实接口不可用时页面会保留 mock 数据。');
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

      if (error instanceof Error && error.message.includes('验收模式下真实 API 请求失败')) {
        throw error;
      }

      setRows(config.fallbackRows);
      setNotice('后台真实接口暂不可用，已回退 mock 数据。');
      setListState('ready');
    }
  }, [config]);

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

  return (
    <AdminLayout active={config.active} subActive={config.subActive}>
      <PageHead title={config.title} subtitle="真实接口优先加载；接口不可用时保留 mock 数据，状态操作失败不改变当前页面。" actions={config.topActions} />
      <p className="admin-api-notice">{notice}</p>
      {feedback ? <AdminActionFeedbackPanel feedback={feedback} onClose={() => setFeedback(null)} /> : null}
      {extraContent}
      {config.summaryCards ? <AdminSummaryStrip cards={config.summaryCards} /> : null}
      <section className="admin-workspace">
        <div className="admin-workspace-main">
          <FilterBar fields={config.filters} />
          {listState === 'loading' ? <TableSkeleton columns={config.columns.length} rows={6} /> : null}
          {listState === 'error' ? (
            <ErrorState
              description={notice}
              primaryAction={{ label: '重试', onClick: () => void loadRows() }}
              secondaryAction={{ label: '返回后台首页', to: '/admin/dashboard' }}
            />
          ) : null}
          {listState === 'ready' ? <DataTable columns={config.columns} rows={rows} /> : null}
        </div>
        <AdminDetailDrawer
          confirmPanel={config.confirmPanel}
          detailItems={config.detailItems?.(rows[0] ?? {})}
          sections={config.drawerSections}
          title={config.drawerTitle}
        >
          {config.drawerContent?.(rows[0] ?? {})}
        </AdminDetailDrawer>
      </section>
    </AdminLayout>
  );
}

function DepositReviewWorkspace({ handleAction }: { handleAction: RowActionHandler }) {
  const [rows, setRows] = useState<Record<string, unknown>[]>(api.getDeposits() as unknown as Record<string, unknown>[]);
  const [notice, setNotice] = useState('正在加载意向金凭证审核列表。');
  const [listState, setListState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState('待审核');
  const [feedback, setFeedback] = useState<AdminActionFeedback | null>(null);

  const loadRows = useCallback(async () => {
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

      if (error instanceof Error && error.message.includes('验收模式下真实 API 请求失败')) {
        throw error;
      }

      setRows(api.getDeposits() as unknown as Record<string, unknown>[]);
      setNotice('意向金审核真实接口暂不可用，已回退 mock 数据。');
      setListState('ready');
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
      <section className="admin-workspace">
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
            <DataTable
              columns={[
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
        </div>
        <AdminDetailDrawer
          detailItems={getDepositReviewDetailItems(filteredRows[0] ?? {})}
          sections={['企业信息', '拍品信息', '应缴/实缴金额', '付款凭证预览', '审核记录', '驳回原因']}
          title="凭证审核详情"
        />
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
                  <dd>{item.value || '-'}</dd>
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
      <div className="button-row">
        <button className="btn secondary" type="button">取消</button>
        <button className={panel.tone === 'red' ? 'btn danger' : 'btn primary'} type="button">确认</button>
      </div>
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
  handlers: Record<string, (id: string) => Promise<unknown>>,
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

      await action(id);
      window.dispatchEvent(new Event(ADMIN_LIST_REFRESH_EVENT));
      const feedback = feedbackByLabel[label]?.(row);

      if (feedback) {
        window.dispatchEvent(new CustomEvent<AdminActionFeedback>(ADMIN_ACTION_FEEDBACK_EVENT, { detail: feedback }));
      } else {
        window.alert(`${label}已提交。`);
      }
    } catch (error) {
      window.alert(`${label}调用后台接口失败：${getErrorMessage(error)}。页面数据已保持不变。`);
    }
  }, [handlers, feedbackByLabel]);
}

function getDepositReviewDetailItems(row: Record<string, unknown>): AdminDetailItem[] {
  return [
    { label: '企业名称', value: getStringValue(row, 'enterprise') || getStringValue(row, 'enterpriseName') },
    { label: '拍品名称', value: getStringValue(row, 'lotTitle') },
    { label: '项目编号/拍品 ID', value: getStringValue(row, 'lotId') },
    { label: '应缴金额', value: getStringValue(row, 'requiredAmount') || getStringValue(row, 'amount') },
    { label: '实缴金额', value: getStringValue(row, 'paidAmount') || getStringValue(row, 'amount') },
    { label: '凭证文件', value: getStringValue(row, 'voucherFileName') || getStringValue(row, 'voucher') },
    { label: '提交时间', value: getStringValue(row, 'submittedAt') },
    { label: '审核状态', value: getStringValue(row, 'status') },
    { label: '驳回原因', value: getStringValue(row, 'rejectReason') },
  ];
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
    { label: '意向金提交', state: completed(3), time: '-', operator: '凭证审核', note: '当前页面未读取完整凭证记录，仅按竞价后阶段推导。' },
    { label: '意向金审核', state: completed(4), time: '-', operator: '凭证审核', note: '达到竞价中或后续状态时视为业务已放行。' },
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

function getLotManagementTarget(label: string, row: Record<string, unknown>) {
  const id = getRowId(row);

  if (label === '查看') {
    return id ? `/announcements/upcoming/detail?id=${id}` : '/announcements/upcoming/detail';
  }

  if (label === '编辑') {
    return id ? `/admin/lots/edit?id=${id}` : '/admin/lots/edit';
  }

  return undefined;
}

function getLotReviewTarget(label: string, row: Record<string, unknown>) {
  const id = getRowId(row);

  if (label === '查看') {
    return id ? `/announcements/upcoming/detail?id=${id}` : '/announcements/upcoming/detail';
  }

  return undefined;
}

function getDepositReviewTarget(label: string, row: Record<string, unknown>) {
  if (label !== '查看凭证') {
    return undefined;
  }

  const fileUrl = getStringValue(row, 'voucherFileUrl');

  if (fileUrl) {
    window.open(fileUrl, '_blank', 'noopener,noreferrer');
    return undefined;
  }

  return getLotDetailTarget(row, false);
}

function getLotAdminTarget(row: Record<string, unknown>) {
  const lotId = getStringValue(row, 'lotId') || getLotIdByTitle(row);

  return lotId ? `/admin/lots/edit?id=${lotId}` : '/admin/lots';
}

function getBidTarget(label: string, row: Record<string, unknown>) {
  if (label === '查看拍品') {
    return getLotDetailTarget(row, false);
  }

  if (label === '查看企业') {
    return '/admin/reviews/enterprises';
  }

  return undefined;
}

function getResultTarget(label: string, row: Record<string, unknown>) {
  const id = getRowId(row);

  if (label === '查看') {
    return id ? `/results/detail?id=${id}` : '/results/detail';
  }

  return undefined;
}

function getLotDetailTarget(row: Record<string, unknown>, allowRowId = true) {
  const lotId = getStringValue(row, 'lotId') || getLotIdByTitle(row) || (allowRowId ? getStringValue(row, 'id') : '');

  return lotId ? `/announcements/upcoming/detail?id=${lotId}` : '/announcements/upcoming/detail';
}

function getLotIdByTitle(row: Record<string, unknown>) {
  const lotTitle = getStringValue(row, 'lotTitle');

  return api.getLots().find((lot) => lot.title === lotTitle)?.id ?? '';
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

function buildLotPayload(formData: FormData): LotMutationPayload {
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
    productInfo: getFormValue(formData, 'productInfo'),
    productDetail: getFormValue(formData, 'productDetail'),
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
