import { ButtonRow } from '../components/Button';
import { SectionHeader, StatCards } from '../components/Cards';
import { DataTable } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { AccountLayout } from '../components/Layouts';
import { StatusTag } from '../components/StatusTag';
import { api } from '../services/api';

export function AccountHome() {
  return (
    <AccountLayout active="中心首页">
      <section className="account-banner">
        <div>
          <span className="eyebrow">企业状态</span>
          <h1>中核华原钛白股份有限公司</h1>
          <p>当前认证状态：待审核。企业通过认证后，可提交意向金付款凭证并参与对应拍品竞价。</p>
        </div>
        <StatusTag value="待审核" />
      </section>
      <StatCards stats={[
        { label: '认证状态', value: '待审核', helper: '等待平台复核', tone: 'orange' },
        { label: '意向金记录', value: '3 条', helper: '1 条待审核', tone: 'blue' },
        { label: '出价记录', value: '8 条', helper: '当前最高价 1 条', tone: 'green' },
        { label: '未读通知', value: '2 条', helper: '成交通知/失败通知', tone: 'orange' },
      ]} />
      <section className="two-column">
        <div>
          <SectionHeader title="近期意向金状态" />
          <DataTable columns={[
            { key: 'lotTitle', label: '拍品名称' },
            { key: 'amount', label: '保证金金额' },
            { key: 'status', label: '状态', render: (row) => <StatusTag value={String(row.status)} /> },
          ]} rows={api.getDeposits() as unknown as Record<string, unknown>[]} />
        </div>
        <div>
          <SectionHeader title="最新通知" />
          <DataTable columns={[
            { key: 'type', label: '类型' },
            { key: 'lotTitle', label: '拍品名称' },
            { key: 'sentAt', label: '发送时间' },
          ]} rows={api.getNotifications() as unknown as Record<string, unknown>[]} />
        </div>
      </section>
    </AccountLayout>
  );
}

export function MyCertificationPage() {
  return (
    <AccountLayout active="我的企业认证">
      <PageHead title="我的企业认证页" subtitle="查看本企业认证资料、认证状态、驳回原因，并在驳回后重新提交。" />
      <section className="status-panel">
        <StatusTag value="审核驳回" />
        <p>驳回原因：营业执照附件不清晰，请重新上传。</p>
        <ButtonRow actions={[{ label: '编辑资料' }, { label: '重新提交', tone: 'primary' }, { label: '返回中心' }]} />
      </section>
      <ReadOnlyGroups groups={[
        ['账号信息', ['用户名', '头像']],
        ['企业基础信息', ['企业名', '主营分类', '注册资本', '所属区域', '详细地址', '统一社会信用代码']],
        ['法人及联系人', ['联系人', '联系电话', '法人代表', '身份证号', '电子邮件']],
        ['经营信息', ['公司简介', '经营范围', '企业资质', '营业执照']],
        ['银行账户', ['付款账户', '收款账户']],
      ]} />
    </AccountLayout>
  );
}

export function MyDepositsPage() {
  return (
    <AccountLayout active="我的意向金">
      <PageHead title="我的意向金页" subtitle="查看本企业针对各拍品提交的意向金付款凭证审核状态。" />
      <FilterBar fields={['拍品名称', '意向金状态', '提交时间']} />
      <DataTable columns={[
        { key: 'lotTitle', label: '拍品名称', width: '30%' },
        { key: 'amount', label: '保证金金额' },
        { key: 'status', label: '凭证状态', render: (row) => <StatusTag value={String(row.status)} /> },
        { key: 'submittedAt', label: '提交时间' },
        { key: 'reviewedAt', label: '审核时间' },
        { key: 'rejectReason', label: '驳回原因' },
        { key: 'actions', label: '操作', render: () => <div className="inline-actions"><button className="link-btn" type="button">查看凭证</button><button className="link-btn" type="button">重新上传</button><button className="link-btn" type="button">查看公告</button></div> },
      ]} rows={api.getDeposits() as unknown as Record<string, unknown>[]} />
    </AccountLayout>
  );
}

export function MyBidsPage() {
  return (
    <AccountLayout active="我的出价记录">
      <PageHead title="我的出价记录页" subtitle="查看本企业在竞价中的出价记录。" />
      <FilterBar fields={['拍品名称', '出价时间', '是否当前最高价']} />
      <DataTable columns={[
        { key: 'lotTitle', label: '拍品名称', width: '34%' },
        { key: 'amount', label: '出价金额' },
        { key: 'incrementTimes', label: '加价次数' },
        { key: 'bidTime', label: '出价时间' },
        { key: 'isHighest', label: '是否当前最高价', render: (row) => <StatusTag value={row.isHighest ? '是' : '否'} tone={row.isHighest ? 'green' : 'gray'} /> },
        { key: 'auctionStatus', label: '竞价状态' },
        { key: 'actions', label: '操作', render: () => <button className="link-btn" type="button">查看竞价详情</button> },
      ]} rows={api.getBids() as unknown as Record<string, unknown>[]} />
    </AccountLayout>
  );
}

export function MyMessagesPage() {
  return (
    <AccountLayout active="我的通知">
      <PageHead title="我的通知页" subtitle="查看站内消息，包括成交通知和失败通知。" />
      <FilterBar fields={['通知类型', '已读状态', '发送时间']} />
      <DataTable columns={[
        { key: 'type', label: '通知类型' },
        { key: 'lotTitle', label: '拍品名称', width: '32%' },
        { key: 'content', label: '通知内容摘要', width: '34%' },
        { key: 'sentAt', label: '发送时间' },
        { key: 'read', label: '已读状态', render: (row) => <StatusTag value={row.read ? '已读' : '未读'} tone={row.read ? 'gray' : 'orange'} /> },
        { key: 'actions', label: '操作', render: () => <div className="inline-actions"><button className="link-btn" type="button">查看详情</button><button className="link-btn" type="button">标记已读</button></div> },
      ]} rows={api.getNotifications() as unknown as Record<string, unknown>[]} />
    </AccountLayout>
  );
}

function PageHead({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <section className="page-title compact">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </section>
  );
}

function ReadOnlyGroups({ groups }: { groups: Array<[string, string[]]> }) {
  return (
    <div className="readonly-groups">
      {groups.map(([title, fields]) => (
        <section className="readonly-card" key={title}>
          <h3>{title}</h3>
          <dl className="meta-grid">
            {fields.map((field) => <div key={field}><dt>{field}</dt><dd>示例{field}</dd></div>)}
          </dl>
        </section>
      ))}
    </div>
  );
}
