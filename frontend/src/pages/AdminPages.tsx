import { type FormEvent, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import { ButtonRow } from '../components/Button';
import { SectionHeader, StatCards } from '../components/Cards';
import { DataTable } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { AdminLayout } from '../components/Layouts';
import { StatusTag } from '../components/StatusTag';
import { api, type BlacklistMutationPayload, type ContentMutationPayload, type LotMutationPayload } from '../services/api';
import type { Action, TableColumn } from '../types';

type AdminListConfig = {
  title: string;
  active: string;
  subActive: string;
  filters: string[];
  fallbackRows: Record<string, unknown>[];
  loadRows?: () => Promise<Record<string, unknown>[]>;
  columns: TableColumn<Record<string, unknown>>[];
  topActions?: Action[];
  drawerTitle: string;
  drawerSections: string[];
};

type RowActionHandler = (label: string, row: Record<string, unknown>) => Promise<void>;

const REVIEW_REJECT_REASON = '后台页面快速驳回，请补充或修正资料。';
const BLACKLIST_RELEASE_REASON = '后台页面手动解除黑名单。';
const ADMIN_LIST_REFRESH_EVENT = 'admin-list-refresh';
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

const rowActions = (onAction?: RowActionHandler, ...labels: string[]): TableColumn<Record<string, unknown>> => ({
  key: 'actions',
  label: '操作',
  render: (row) => (
    <div className="inline-actions">
      {labels.map((label) => (
        <button className={label.includes('驳回') || label.includes('违约') || label.includes('拉黑') ? 'danger-link' : 'link-btn'} key={label} onClick={() => void onAction?.(label, row)} type="button">
          {label}
        </button>
      ))}
    </div>
  ),
});

export function AdminDashboard() {
  return (
    <AdminLayout active="首页看板">
      <PageHead title="后台首页/数据看板" subtitle="查看成交统计、审核待办与最近操作。" />
      <StatCards stats={api.getStats()} />
      <section className="two-column">
        <div>
          <SectionHeader title="待办事项" />
          <div className="todo-grid">
            {['待发布复核 8', '待企业认证 12', '待意向金审核 21', '待合同登记 5'].map((item) => <button key={item} type="button">{item}</button>)}
          </div>
        </div>
        <div>
          <SectionHeader title="最近操作日志" />
          <DataTable
            columns={[
              { key: 'operator', label: '操作人' },
              { key: 'action', label: '动作' },
              { key: 'objectName', label: '对象' },
              { key: 'operatedAt', label: '时间' },
            ]}
            rows={api.getLogs() as unknown as Record<string, unknown>[]}
          />
        </div>
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
      { key: 'title', label: '拍品标题', width: '25%' },
      { key: 'startPrice', label: '起拍价' },
      { key: 'quantity', label: '数量' },
      { key: 'supplier', label: '供应商' },
      { key: 'status', label: '状态', render: (row) => <StatusTag value={String(row.status)} /> },
      { key: 'auctionTime', label: '竞拍期' },
      { key: 'updatedAt', label: '更新时间' },
      rowActions(handleAction, '查看', '编辑', '提交复核', '进入竞拍', '关闭/取消'),
    ],
    topActions: [{ label: '新建拍品', tone: 'primary' }],
    drawerTitle: '拍品详情',
    drawerSections: ['基础信息', '竞价规则', '保证金规则', '时间规则', '附件与检测报告'],
  }} />;
}

export function LotEditPage() {
  const [notice, setNotice] = useState('请保存草稿或填写 URL 参数 id 后编辑拍品。');
  const formGroups: Array<[string, Array<[keyof LotMutationPayload, string, string]>]> = [
    ['基础信息', LOT_FORM_FIELDS.slice(0, 11)],
    ['商品与附件', LOT_FORM_FIELDS.slice(11, 13)],
    ['竞价业务配置', LOT_FORM_FIELDS.slice(13, 17)],
    ['时间规则', LOT_FORM_FIELDS.slice(17, 21)],
    ['客户须知与延时竞价', LOT_FORM_FIELDS.slice(21)],
  ];
  const lotId = new URLSearchParams(window.location.search).get('id') ?? undefined;

  const submitLot = async (submitReview: boolean) => {
    const form = document.querySelector<HTMLFormElement>('#admin-lot-form');

    if (!form) {
      return;
    }

    const formData = new FormData(form);
    const payload = buildLotPayload(formData);

    try {
      const saved = lotId ? await api.updateLot(lotId, payload) : await api.createLot(payload);

      if (submitReview) {
        await api.submitLotReview(saved.id);
      }

      setNotice(submitReview ? '拍品已保存并提交发布复核。' : '拍品草稿已通过真实接口保存。');
    } catch (error) {
      setNotice(`拍品保存失败：${getErrorMessage(error)}`);
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
            <div className="form-grid">
              {fields.map(([name, label, value]) => (
                <label className="field" key={name}>
                  <span>{label}</span>
                  <input defaultValue={value} name={name} placeholder={`请输入${label}`} />
                </label>
              ))}
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
            <button className="btn secondary" onClick={() => void submitLot(false)} type="button">保存草稿</button>
            <button className="btn primary" onClick={() => void submitLot(true)} type="button">提交复核</button>
            <button className="btn secondary" type="button">取消</button>
          </div>
        </div>
      </form>
    </AdminLayout>
  );
}

export function LotReviewPage() {
  const handleAction = useAdminRowAction({
    审核通过: (id) => api.approveLotReview(id),
    审核驳回: (id) => api.rejectLotReview(id, REVIEW_REJECT_REASON),
  });

  return <AdminListPage config={{
    title: '标的发布复核页',
    active: '审核管理',
    subActive: '标的发布复核',
    filters: ['关键词', '审核状态', '提交时间'],
    fallbackRows: api.getLots().filter((x) => ['待发布复核', '公示中', '发布驳回'].includes(x.status)) as unknown as Record<string, unknown>[],
    loadRows: () => api.fetchAdminLotReviews() as Promise<unknown> as Promise<Record<string, unknown>[]>,
    columns: [
      { key: 'title', label: '拍品标题', width: '26%' },
      { key: 'supplier', label: '提交人' },
      { key: 'startPrice', label: '起拍价' },
      { key: 'deposit', label: '保证金金额' },
      { key: 'auctionTime', label: '竞拍时间' },
      { key: 'status', label: '状态', render: (row) => <StatusTag value={String(row.status)} /> },
      rowActions(handleAction, '查看', '审核通过', '审核驳回'),
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
      { key: 'name', label: '企业名', width: '25%' },
      { key: 'contact', label: '联系人' },
      { key: 'phone', label: '联系电话' },
      { key: 'category', label: '用户类别' },
      { key: 'type', label: '用户类型' },
      { key: 'status', label: '审核状态', render: (row) => <StatusTag value={String(row.status)} /> },
      { key: 'submittedAt', label: '提交时间' },
      rowActions(handleAction, '查看', '审核通过', '审核驳回'),
    ],
    drawerTitle: '企业资料详情',
    drawerSections: ['企业基础信息', '法人及联系人', '经营信息', '付款银行账户', '收款银行账户', '企业资质与营业执照', '重新提交记录'],
  }} />;
}

export function DepositReviewPage() {
  const handleAction = useAdminRowAction({
    审核通过: (id) => api.approveDepositReview(id),
    审核驳回: (id) => api.rejectDepositReview(id, REVIEW_REJECT_REASON),
  });

  return <AdminListPage config={{
    title: '意向金凭证审核页',
    active: '审核管理',
    subActive: '意向金凭证审核',
    filters: ['企业名称', '拍品名称', '审核状态', '提交时间'],
    fallbackRows: api.getDeposits() as unknown as Record<string, unknown>[],
    loadRows: () => api.fetchAdminDepositReviews() as Promise<unknown> as Promise<Record<string, unknown>[]>,
    columns: [
      { key: 'enterprise', label: '企业名称', width: '24%' },
      { key: 'lotTitle', label: '拍品名称', width: '28%' },
      { key: 'amount', label: '应缴保证金金额' },
      { key: 'voucher', label: '凭证' },
      { key: 'status', label: '审核状态', render: (row) => <StatusTag value={String(row.status)} /> },
      { key: 'submittedAt', label: '提交时间' },
      rowActions(handleAction, '查看凭证', '审核通过', '审核驳回'),
    ],
    drawerTitle: '凭证审核详情',
    drawerSections: ['企业信息', '拍品信息', '应缴保证金金额', '付款凭证预览', '审核记录', '驳回原因'],
  }} />;
}

export function BidManagementPage() {
  return <AdminListPage config={{
    title: '竞价记录管理页',
    active: '交易管理',
    subActive: '竞价记录管理',
    filters: ['拍品名称', '企业名称', '出价时间', '是否当前最高价'],
    fallbackRows: api.getBids() as unknown as Record<string, unknown>[],
    loadRows: () => api.fetchAdminBids() as Promise<unknown> as Promise<Record<string, unknown>[]>,
    columns: [
      { key: 'id', label: '出价序号' },
      { key: 'lotTitle', label: '拍品名称', width: '26%' },
      { key: 'enterprise', label: '企业名称' },
      { key: 'maskedEnterprise', label: '脱敏企业名称' },
      { key: 'amount', label: '出价金额' },
      { key: 'incrementTimes', label: '加价次数' },
      { key: 'bidTime', label: '出价时间' },
      rowActions(undefined, '查看拍品', '查看企业'),
    ],
    drawerTitle: '出价详情',
    drawerSections: ['拍品信息', '企业信息', '出价金额', '服务器接收时间'],
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
    fallbackRows: api.getResults() as unknown as Record<string, unknown>[],
    loadRows: () => api.fetchAdminResults() as Promise<unknown> as Promise<Record<string, unknown>[]>,
    columns: [
      { key: 'lotTitle', label: '成交拍品', width: '34%' },
      { key: 'winner', label: '中标企业名称' },
      { key: 'finalPrice', label: '最终成交价' },
      { key: 'publicTime', label: '生成时间' },
      { key: 'status', label: '公示状态', render: (row) => <StatusTag value={String(row.status)} /> },
      rowActions(handleAction, '查看', '发布公示'),
    ],
    drawerTitle: '成交详情',
    drawerSections: ['拍品摘要', '中标企业', '最终成交价', '竞拍结束时间', '公示状态'],
  }} />;
}

export function ContractManagementPage() {
  const handleAction = useAdminRowAction({
    标记已签约: (id) => api.markContractSigned(id),
    标记已完成: (id) => api.markContractCompleted(id),
    标记违约: (id) => api.markContractDefaulted(id),
  });

  return <AdminListPage config={{
    title: '合同状态管理页',
    active: '交易管理',
    subActive: '合同状态管理',
    filters: ['拍品名称', '企业名称', '合同状态'],
    fallbackRows: api.getContracts() as unknown as Record<string, unknown>[],
    loadRows: () => api.fetchAdminContracts() as Promise<unknown> as Promise<Record<string, unknown>[]>,
    columns: [
      { key: 'lotTitle', label: '拍品名称', width: '32%' },
      { key: 'enterprise', label: '中标企业' },
      { key: 'amount', label: '成交价' },
      { key: 'status', label: '合同状态', render: (row) => <StatusTag value={String(row.status)} /> },
      { key: 'updatedAt', label: '更新时间' },
      { key: 'operator', label: '操作人' },
      rowActions(handleAction, '标记已签约', '标记已完成', '标记违约'),
    ],
    drawerTitle: '合同状态详情',
    drawerSections: ['成交信息', '合同状态流转', '备注', '违约原因'],
  }} />;
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
    fallbackRows: api.getRefunds() as unknown as Record<string, unknown>[],
    loadRows: () => api.fetchAdminRefunds() as Promise<unknown> as Promise<Record<string, unknown>[]>,
    columns: [
      { key: 'enterprise', label: '企业名称' },
      { key: 'lotTitle', label: '拍品名称', width: '34%' },
      { key: 'amount', label: '保证金金额' },
      { key: 'status', label: '退款状态', render: (row) => <StatusTag value={String(row.status)} /> },
      { key: 'updatedAt', label: '更新时间' },
      { key: 'operator', label: '操作人' },
      rowActions(handleAction, '标记审核中', '标记已退款'),
    ],
    drawerTitle: '退款状态详情',
    drawerSections: ['企业信息', '拍品信息', '保证金金额', '状态备注'],
  }} />;
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
          rowActions(handleAction, '查看', '解除拉黑'),
        ],
        drawerTitle: '黑名单企业详情',
        drawerSections: ['企业信息', '违约记录', '拉黑原因', '解除原因'],
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
      />
      <p className="admin-api-notice">{notice}</p>
      <FilterBar fields={['分类', '状态', '关键词']} />
      <DataTable
        columns={[
          { key: 'title', label: '标题', width: '34%' },
          { key: 'category', label: '分类' },
          { key: 'status', label: '状态', render: (row) => <StatusTag value={String(row.status)} /> },
          { key: 'publishedAt', label: '发布时间' },
          { key: 'updatedBy', label: '更新人' },
          rowActions(handleContentAction, '编辑', '发布', '下架'),
        ]}
        rows={rows}
      />
      <aside className="drawer-preview">
        <h3>{editingRow ? '编辑内容' : '新建内容草稿'}</h3>
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
    </AdminLayout>
  );
}

export function NotificationManagementPage() {
  return <AdminListPage config={{
    title: '通知管理页',
    active: '内容运营',
    subActive: '通知管理',
    filters: ['通知类型', '通知渠道', '接收企业', '发送状态', '发送时间'],
    fallbackRows: api.getNotifications() as unknown as Record<string, unknown>[],
    loadRows: () => api.fetchAdminNotifications() as Promise<unknown> as Promise<Record<string, unknown>[]>,
    columns: [
      { key: 'type', label: '通知类型' },
      { key: 'channel', label: '通知渠道' },
      { key: 'enterprise', label: '接收企业' },
      { key: 'lotTitle', label: '拍品名称', width: '24%' },
      { key: 'status', label: '发送状态', render: (row) => <StatusTag value={String(row.status)} /> },
      { key: 'sentAt', label: '发送时间' },
      rowActions(undefined, '查看内容'),
    ],
    drawerTitle: '通知内容详情',
    drawerSections: ['通知类型', '通知渠道', '接收企业', '通知内容', '发送状态'],
  }} />;
}

export function FileManagementPage() {
  return <AdminListPage config={{
    title: '文件管理页',
    active: '内容运营',
    subActive: '文件管理',
    filters: ['文件类型', '来源业务', '上传人', '上传时间'],
    fallbackRows: api.getFiles() as unknown as Record<string, unknown>[],
    loadRows: () => api.fetchAdminFiles() as Promise<unknown> as Promise<Record<string, unknown>[]>,
    columns: [
      { key: 'name', label: '文件名', width: '28%' },
      { key: 'type', label: '文件类型' },
      { key: 'source', label: '来源业务' },
      { key: 'uploader', label: '上传人' },
      { key: 'uploadedAt', label: '上传时间' },
      { key: 'ref', label: '关联对象', width: '24%' },
      rowActions(undefined, '预览', '下载', '查看引用'),
    ],
    drawerTitle: '文件预览',
    drawerSections: ['文件预览', '关联业务', '权限控制提示'],
  }} />;
}

export function OperationLogPage() {
  return <AdminListPage config={{
    title: '操作日志页',
    active: '系统审计',
    subActive: '操作日志',
    filters: ['操作人', '操作动作', '对象类型', '操作时间'],
    fallbackRows: api.getLogs() as unknown as Record<string, unknown>[],
    loadRows: () => api.fetchAdminLogs() as Promise<unknown> as Promise<Record<string, unknown>[]>,
    columns: [
      { key: 'operator', label: '操作人' },
      { key: 'action', label: '操作动作' },
      { key: 'objectType', label: '对象类型' },
      { key: 'objectName', label: '对象名称', width: '30%' },
      { key: 'result', label: '操作结果' },
      { key: 'operatedAt', label: '操作时间' },
      rowActions(undefined, '查看详情'),
    ],
    drawerTitle: '日志详情',
    drawerSections: ['操作人', '操作时间', '操作动作', '对象信息', '操作结果', '备注'],
  }} />;
}

function AdminListPage({ config, extraContent }: { config: AdminListConfig; extraContent?: ReactNode }) {
  const [rows, setRows] = useState(config.fallbackRows);
  const [notice, setNotice] = useState('正在尝试读取后台真实接口，失败时保留 mock 数据。');

  const loadRows = useCallback(async () => {
    if (!config.loadRows) {
      setRows(config.fallbackRows);
      setNotice('当前页面暂未纳入本阶段真实接口接入。');
      return;
    }

    try {
      const nextRows = await config.loadRows();
      setRows(nextRows);
      setNotice('已加载后台列表；真实接口不可用时页面会保留 mock 数据。');
    } catch (error) {
      if (error instanceof Error && error.message.includes('验收模式下真实 API 请求失败')) {
        throw error;
      }

      setRows(config.fallbackRows);
      setNotice('后台真实接口暂不可用，已回退 mock 数据。');
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

  return (
    <AdminLayout active={config.active} subActive={config.subActive}>
      <PageHead title={config.title} subtitle="真实接口优先加载；接口不可用时保留 mock 数据，状态操作失败不改变当前页面。" actions={config.topActions} />
      <p className="admin-api-notice">{notice}</p>
      {extraContent}
      <FilterBar fields={config.filters} />
      <DataTable columns={config.columns} rows={rows} />
      <aside className="drawer-preview">
        <h3>{config.drawerTitle}</h3>
        {config.drawerSections.map((section) => (
          <div className="drawer-section" key={section}>
            <strong>{section}</strong>
            <p>展示 {section} 信息，后续由后端接口返回。</p>
          </div>
        ))}
      </aside>
    </AdminLayout>
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
      await action(id);
      window.dispatchEvent(new Event(ADMIN_LIST_REFRESH_EVENT));
      window.alert(`${label}已提交。`);
    } catch {
      window.alert(`${label}调用后台接口失败，页面数据已保持不变。`);
    }
  }, [handlers]);
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
    deadlineAt: getFormValue(formData, 'deadlineAt'),
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
    announcementStartAt: getFormValue(formData, 'announcementStartAt'),
    announcementEndAt: getFormValue(formData, 'announcementEndAt'),
    biddingStartAt: getFormValue(formData, 'biddingStartAt'),
    biddingEndAt: getFormValue(formData, 'biddingEndAt'),
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

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '未知错误';
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
