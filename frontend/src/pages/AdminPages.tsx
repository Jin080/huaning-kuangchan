import { ButtonRow } from '../components/Button';
import { SectionHeader, StatCards } from '../components/Cards';
import { DataTable } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { AdminLayout } from '../components/Layouts';
import { StatusTag } from '../components/StatusTag';
import { api } from '../services/api';
import type { Action, TableColumn } from '../types';

type AdminListConfig = {
  title: string;
  active: string;
  subActive: string;
  filters: string[];
  rows: Record<string, unknown>[];
  columns: TableColumn<Record<string, unknown>>[];
  topActions?: Action[];
  drawerTitle: string;
  drawerSections: string[];
};

const rowActions = (...labels: string[]) => ({
  key: 'actions',
  label: '操作',
  render: () => <div className="inline-actions">{labels.map((label) => <button className={label.includes('驳回') || label.includes('违约') || label.includes('拉黑') ? 'danger-link' : 'link-btn'} key={label} type="button">{label}</button>)}</div>,
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
  return <AdminListPage config={{
    title: '拍品管理列表页',
    active: '拍品管理',
    subActive: '拍品管理',
    filters: ['关键词', '拍品状态', '竞拍时间', '供应商'],
    rows: api.getLots() as unknown as Record<string, unknown>[],
    columns: [
      { key: 'title', label: '拍品标题', width: '25%' },
      { key: 'startPrice', label: '起拍价' },
      { key: 'quantity', label: '数量' },
      { key: 'supplier', label: '供应商' },
      { key: 'status', label: '状态', render: (row) => <StatusTag value={String(row.status)} /> },
      { key: 'auctionTime', label: '竞拍期' },
      { key: 'updatedAt', label: '更新时间' },
      rowActions('查看', '编辑', '提交复核', '关闭/取消'),
    ],
    topActions: [{ label: '新建拍品', tone: 'primary' }],
    drawerTitle: '拍品详情',
    drawerSections: ['基础信息', '竞价规则', '保证金规则', '时间规则', '附件与检测报告'],
  }} />;
}

export function LotEditPage() {
  const formGroups: Array<[string, string[]]> = [
    ['基础信息', ['图一', '图二', '拍品标题', '单价/起拍价', '数量', '供应商', '产地', '截止日期', '发货方式', '电子邮箱', '联系电话预留']],
    ['商品与附件', ['商品信息/商品详情', '检测报告']],
    ['竞价业务配置', ['评估价', '保证金比例', '保证金金额', '加价幅度']],
    ['时间规则', ['公示开始时间', '公示结束时间', '竞拍开始时间', '竞拍结束时间']],
    ['客户须知与延时竞价', ['客户须知', '是否启用延时竞价', '延时竞价规则说明']],
  ];

  return (
    <AdminLayout active="拍品管理" subActive="新建/编辑拍品">
      <PageHead title="新建/编辑拍品页" subtitle="填写拍品信息并保存草稿或提交发布复核。" />
      <form className="long-form admin-form">
        {formGroups.map(([title, fields]) => (
          <fieldset key={title}>
            <legend>{title}</legend>
            <div className="form-grid">
              {fields.map((field) => <label className="field" key={field}><span>{field}</span><input placeholder={`请输入${field}`} /></label>)}
            </div>
          </fieldset>
        ))}
        <div className="sticky-actions"><ButtonRow actions={[{ label: '保存草稿' }, { label: '提交复核', tone: 'primary' }, { label: '取消' }]} /></div>
      </form>
    </AdminLayout>
  );
}

export function LotReviewPage() {
  return <AdminListPage config={{
    title: '标的发布复核页',
    active: '审核管理',
    subActive: '标的发布复核',
    filters: ['关键词', '审核状态', '提交时间'],
    rows: api.getLots().filter((x) => ['待发布复核', '公示中', '发布驳回'].includes(x.status)) as unknown as Record<string, unknown>[],
    columns: [
      { key: 'title', label: '拍品标题', width: '26%' },
      { key: 'supplier', label: '提交人' },
      { key: 'startPrice', label: '起拍价' },
      { key: 'deposit', label: '保证金金额' },
      { key: 'auctionTime', label: '竞拍时间' },
      { key: 'status', label: '状态', render: (row) => <StatusTag value={String(row.status)} /> },
      rowActions('查看', '审核通过', '审核驳回'),
    ],
    drawerTitle: '标的复核详情',
    drawerSections: ['商品基础信息', '竞价规则', '保证金规则', '客户须知', '附件与检测报告', '驳回原因'],
  }} />;
}

export function EnterpriseReviewPage() {
  return <AdminListPage config={{
    title: '企业认证审核页',
    active: '审核管理',
    subActive: '企业认证审核',
    filters: ['企业名称', '审核状态', '提交时间'],
    rows: api.getEnterprises() as unknown as Record<string, unknown>[],
    columns: [
      { key: 'name', label: '企业名', width: '25%' },
      { key: 'contact', label: '联系人' },
      { key: 'phone', label: '联系电话' },
      { key: 'category', label: '用户类别' },
      { key: 'type', label: '用户类型' },
      { key: 'status', label: '审核状态', render: (row) => <StatusTag value={String(row.status)} /> },
      { key: 'submittedAt', label: '提交时间' },
      rowActions('查看', '审核通过', '审核驳回'),
    ],
    drawerTitle: '企业资料详情',
    drawerSections: ['企业基础信息', '法人及联系人', '经营信息', '付款银行账户', '收款银行账户', '企业资质与营业执照', '重新提交记录'],
  }} />;
}

export function DepositReviewPage() {
  return <AdminListPage config={{
    title: '意向金凭证审核页',
    active: '审核管理',
    subActive: '意向金凭证审核',
    filters: ['企业名称', '拍品名称', '审核状态', '提交时间'],
    rows: api.getDeposits() as unknown as Record<string, unknown>[],
    columns: [
      { key: 'enterprise', label: '企业名称', width: '24%' },
      { key: 'lotTitle', label: '拍品名称', width: '28%' },
      { key: 'amount', label: '应缴保证金金额' },
      { key: 'voucher', label: '凭证' },
      { key: 'status', label: '审核状态', render: (row) => <StatusTag value={String(row.status)} /> },
      { key: 'submittedAt', label: '提交时间' },
      rowActions('查看凭证', '审核通过', '审核驳回'),
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
    rows: api.getBids() as unknown as Record<string, unknown>[],
    columns: [
      { key: 'id', label: '出价序号' },
      { key: 'lotTitle', label: '拍品名称', width: '26%' },
      { key: 'enterprise', label: '企业名称' },
      { key: 'maskedEnterprise', label: '脱敏企业名称' },
      { key: 'amount', label: '出价金额' },
      { key: 'incrementTimes', label: '加价次数' },
      { key: 'bidTime', label: '出价时间' },
      rowActions('查看拍品', '查看企业'),
    ],
    drawerTitle: '出价详情',
    drawerSections: ['拍品信息', '企业信息', '出价金额', '服务器接收时间'],
  }} />;
}

export function ResultManagementPage() {
  return <AdminListPage config={{
    title: '成交结果管理页',
    active: '交易管理',
    subActive: '成交结果管理',
    filters: ['拍品名称', '中标企业', '成交时间', '公示状态'],
    rows: api.getResults() as unknown as Record<string, unknown>[],
    columns: [
      { key: 'lotTitle', label: '成交拍品', width: '34%' },
      { key: 'winner', label: '中标企业名称' },
      { key: 'finalPrice', label: '最终成交价' },
      { key: 'publicTime', label: '生成时间' },
      { key: 'status', label: '公示状态', render: (row) => <StatusTag value={String(row.status)} /> },
      rowActions('查看', '发布公示'),
    ],
    drawerTitle: '成交详情',
    drawerSections: ['拍品摘要', '中标企业', '最终成交价', '竞拍结束时间', '公示状态'],
  }} />;
}

export function ContractManagementPage() {
  return <AdminListPage config={{
    title: '合同状态管理页',
    active: '交易管理',
    subActive: '合同状态管理',
    filters: ['拍品名称', '企业名称', '合同状态'],
    rows: api.getContracts() as unknown as Record<string, unknown>[],
    columns: [
      { key: 'lotTitle', label: '拍品名称', width: '32%' },
      { key: 'enterprise', label: '中标企业' },
      { key: 'amount', label: '成交价' },
      { key: 'status', label: '合同状态', render: (row) => <StatusTag value={String(row.status)} /> },
      { key: 'updatedAt', label: '更新时间' },
      { key: 'operator', label: '操作人' },
      rowActions('标记已签约', '标记已完成', '标记违约'),
    ],
    drawerTitle: '合同状态详情',
    drawerSections: ['成交信息', '合同状态流转', '备注', '违约原因'],
  }} />;
}

export function RefundManagementPage() {
  return <AdminListPage config={{
    title: '退款状态管理页',
    active: '交易管理',
    subActive: '退款状态管理',
    filters: ['拍品名称', '企业名称', '退款状态'],
    rows: api.getRefunds() as unknown as Record<string, unknown>[],
    columns: [
      { key: 'enterprise', label: '企业名称' },
      { key: 'lotTitle', label: '拍品名称', width: '34%' },
      { key: 'amount', label: '保证金金额' },
      { key: 'status', label: '退款状态', render: (row) => <StatusTag value={String(row.status)} /> },
      { key: 'updatedAt', label: '更新时间' },
      { key: 'operator', label: '操作人' },
      rowActions('标记审核中', '标记已退款'),
    ],
    drawerTitle: '退款状态详情',
    drawerSections: ['企业信息', '拍品信息', '保证金金额', '状态备注'],
  }} />;
}

export function BlacklistManagementPage() {
  return <AdminListPage config={{
    title: '黑名单管理页',
    active: '企业管理',
    subActive: '黑名单管理',
    filters: ['企业名称', '黑名单状态', '操作时间'],
    rows: api.getBlacklist() as unknown as Record<string, unknown>[],
    columns: [
      { key: 'enterprise', label: '企业名称' },
      { key: 'contact', label: '联系人' },
      { key: 'phone', label: '联系电话' },
      { key: 'status', label: '黑名单状态', render: (row) => <StatusTag value={String(row.status)} /> },
      { key: 'reason', label: '拉黑原因', width: '25%' },
      { key: 'operator', label: '操作人' },
      { key: 'operatedAt', label: '操作时间' },
      rowActions('查看', '解除拉黑'),
    ],
    topActions: [{ label: '手动拉黑', tone: 'danger' }],
    drawerTitle: '黑名单企业详情',
    drawerSections: ['企业信息', '违约记录', '拉黑原因', '解除原因'],
  }} />;
}

export function ContentManagementPage() {
  return <AdminListPage config={{
    title: '内容管理页',
    active: '内容运营',
    subActive: '内容管理',
    filters: ['分类', '状态', '关键词'],
    rows: api.getContents() as unknown as Record<string, unknown>[],
    columns: [
      { key: 'title', label: '标题', width: '34%' },
      { key: 'category', label: '分类' },
      { key: 'status', label: '状态', render: (row) => <StatusTag value={String(row.status)} /> },
      { key: 'publishedAt', label: '发布时间' },
      { key: 'updatedBy', label: '更新人' },
      rowActions('编辑', '发布', '下架'),
    ],
    topActions: [{ label: '新建内容', tone: 'primary' }],
    drawerTitle: '内容编辑',
    drawerSections: ['标题', '分类', '正文', '状态'],
  }} />;
}

export function NotificationManagementPage() {
  return <AdminListPage config={{
    title: '通知管理页',
    active: '内容运营',
    subActive: '通知管理',
    filters: ['通知类型', '通知渠道', '接收企业', '发送状态', '发送时间'],
    rows: api.getNotifications() as unknown as Record<string, unknown>[],
    columns: [
      { key: 'type', label: '通知类型' },
      { key: 'channel', label: '通知渠道' },
      { key: 'enterprise', label: '接收企业' },
      { key: 'lotTitle', label: '拍品名称', width: '24%' },
      { key: 'status', label: '发送状态', render: (row) => <StatusTag value={String(row.status)} /> },
      { key: 'sentAt', label: '发送时间' },
      rowActions('查看内容'),
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
    rows: api.getFiles() as unknown as Record<string, unknown>[],
    columns: [
      { key: 'name', label: '文件名', width: '28%' },
      { key: 'type', label: '文件类型' },
      { key: 'source', label: '来源业务' },
      { key: 'uploader', label: '上传人' },
      { key: 'uploadedAt', label: '上传时间' },
      { key: 'ref', label: '关联对象', width: '24%' },
      rowActions('预览', '下载', '查看引用'),
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
    rows: api.getLogs() as unknown as Record<string, unknown>[],
    columns: [
      { key: 'operator', label: '操作人' },
      { key: 'action', label: '操作动作' },
      { key: 'objectType', label: '对象类型' },
      { key: 'objectName', label: '对象名称', width: '30%' },
      { key: 'result', label: '操作结果' },
      { key: 'operatedAt', label: '操作时间' },
      rowActions('查看详情'),
    ],
    drawerTitle: '日志详情',
    drawerSections: ['操作人', '操作时间', '操作动作', '对象信息', '操作结果', '备注'],
  }} />;
}

function AdminListPage({ config }: { config: AdminListConfig }) {
  return (
    <AdminLayout active={config.active} subActive={config.subActive}>
      <PageHead title={config.title} subtitle="筛选、表格、详情抽屉和状态流转均已按 PRD 预留，等待后端接口接入。" actions={config.topActions} />
      <FilterBar fields={config.filters} />
      <DataTable columns={config.columns} rows={config.rows} />
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
