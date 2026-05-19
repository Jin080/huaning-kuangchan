import { useEffect, useState } from 'react';

import { ButtonRow } from '../components/Button';
import { DataTable } from '../components/DataTable';
import { AccountLayout } from '../components/Layouts';
import { StatusTag } from '../components/StatusTag';
import { navigateTo } from '../navigation';
import { api } from '../services/api';
import type { AccountProfile, BidRecord, DepositRecord, NotificationRecord, StatusTone } from '../types';

const defaultProfile: AccountProfile = {
  id: 'mock-account',
  username: 'mock',
  enterpriseName: '中核华原钛白股份有限公司',
  certificationStatus: '待审核',
  isBlacklisted: false,
};

export function AccountHome() {
  const [profile, setProfile] = useState<AccountProfile>(defaultProfile);
  const [deposits, setDeposits] = useState<DepositRecord[]>(api.getDeposits());
  const [bids, setBids] = useState<BidRecord[]>(api.getBids());
  const [messages, setMessages] = useState<NotificationRecord[]>(api.getNotifications());
  const pendingDeposits = deposits.filter((item) => item.status === '待审核').length;
  const highestBids = bids.filter((item) => item.isHighest).length;
  const unreadMessages = messages.filter((item) => !item.read).length;

  useEffect(() => {
    void api.fetchAccountProfile().then(setProfile);
    void api.fetchAccountDeposits().then(setDeposits);
    void api.fetchAccountBids().then(setBids);
    void api.fetchAccountMessages().then(setMessages);
  }, []);

  return (
    <AccountLayout active="中心首页">
      <AccountPageHead title="企业用户中心" subtitle="查看企业资质、意向金、竞价和站内通知的最新状态。" />
      <section className={`account-status-card ${profile.isBlacklisted ? 'danger' : certificationTone(profile.certificationStatus)}`}>
        <div className="account-status-icon">{profile.isBlacklisted ? '!' : '✓'}</div>
        <div>
          <span className="eyebrow">企业状态</span>
          <h1>{profile.enterpriseName}</h1>
          <p>{getCertificationMessage(profile)}</p>
        </div>
        <div className="account-status-actions">
          <StatusTag value={profile.isBlacklisted ? '已拉黑' : profile.certificationStatus} />
          <button onClick={() => navigateTo('/account/certification')} type="button">查看资料</button>
        </div>
      </section>
      <section className="account-kpi-grid">
        <AccountKpi icon="⏳" label="待处理意向金" value={String(pendingDeposits)} unit="笔" helper={`${deposits.length} 条意向金记录`} />
        <AccountKpi icon="槌" label="当前领先出价" value={String(highestBids)} unit="个标的" helper={`${bids.length} 条历史出价`} tone="orange" />
        <AccountKpi icon="信" label="未读通知" value={String(unreadMessages)} unit="条" helper="成交通知 / 失败通知" tone="blue" />
        <AccountKpi icon="✓" label="认证状态" value={profile.certificationStatus} helper={profile.isBlacklisted ? '账号已被限制' : '企业参与资格'} tone={profile.certificationStatus === '审核通过' ? 'green' : 'gray'} />
      </section>
      <section className="account-dashboard-grid">
        <AccountPanel title="近期意向金" icon="￥" action="查看全部" actionTo="/account/deposits">
          <CompactList
            emptyText="暂无意向金记录"
            items={deposits.slice(0, 3).map((item) => ({
              id: item.id,
              title: item.lotTitle,
              meta: item.amount,
              status: item.status,
              target: getLotFallbackTarget(item),
            }))}
          />
        </AccountPanel>
        <AccountPanel title="近期出价" icon="槌" action="查看全部" actionTo="/account/bids">
          <CompactList
            emptyText="暂无出价记录"
            items={bids.slice(0, 3).map((item) => ({
              id: item.id,
              title: item.lotTitle,
              meta: `${item.amount} · ${item.bidTime}`,
              status: item.isHighest ? '当前领先' : '已出价',
              tone: item.isHighest ? 'green' : 'gray',
              target: getLotFallbackTarget(item, '/auctions/live/detail'),
            }))}
          />
        </AccountPanel>
        <AccountPanel title="最新通知" icon="告" action="消息中心" actionTo="/account/messages" wide>
          <div className="account-message-preview">
            {messages.slice(0, 2).map((message) => (
              <button className={message.read ? 'read' : ''} key={message.id} onClick={() => navigateTo('/account/messages')} type="button">
                <span aria-hidden="true" />
                <div>
                  <strong>{message.lotTitle || message.type}</strong>
                  <p>{message.content}</p>
                </div>
                <time>{message.sentAt}</time>
              </button>
            ))}
            {messages.length === 0 ? <div className="empty-state">暂无通知消息</div> : null}
          </div>
        </AccountPanel>
      </section>
    </AccountLayout>
  );
}

export function MyCertificationPage() {
  const [profile, setProfile] = useState<AccountProfile>({
    ...defaultProfile,
    certificationStatus: '审核驳回',
  });

  useEffect(() => {
    void api.fetchAccountProfile().then(setProfile);
  }, []);

  return (
    <AccountLayout active="我的企业认证">
      <AccountPageHead
        title="我的企业认证"
        subtitle="查看本企业认证资料及审核状态，确保信息准确无误以便参与竞拍。"
        action={<button className="btn primary" onClick={() => navigateTo('/enterprise/register')} type="button">修改后重新提交</button>}
      />
      <section className={`account-cert-status ${certificationTone(profile.certificationStatus)}`}>
        <div className="account-status-icon">{profile.certificationStatus === '审核通过' ? '✓' : '!'}</div>
        <div>
          <h2>{certificationTitle(profile.certificationStatus)}</h2>
          <p>{profile.certificationStatus === '审核驳回' ? '驳回原因：上传的营业执照扫描件或企业资质材料不清晰，请重新上传清晰文件后提交审核。' : getCertificationMessage(profile)}</p>
        </div>
        <StatusTag value={profile.certificationStatus} />
      </section>
      <ReadOnlyGroups
        groups={[
          { title: '账号信息', icon: '人', fields: [['用户名', profile.username], ['设置密码', '********'], ['头像', profile.enterpriseName.slice(0, 1)]] },
          { title: '企业基础信息', icon: '企', fields: [['企业名', profile.enterpriseName], ['统一社会信用代码', '91110000X123456789'], ['用户类别', '企业法人'], ['用户类型', '内资企业'], ['注册资本', '5000 万人民币'], ['所属区域', '云南省 玉溪市 华宁县'], ['详细地址', '华宁县宁州街道矿业服务中心']] },
          { title: '法人及联系人', icon: '证', fields: [['法人代表', '张建国'], ['身份证号', '530102********1234'], ['联系人', '李明华'], ['联系电话', '138****5678'], ['电子邮件', 'contact@example.com']] },
          { title: '经营信息', icon: '文', fields: [['公司简介', '专注于有色金属、非金属矿产资源开发与投资。'], ['经营范围', '矿产资源开发、矿产品销售、供应链服务'], ['企业资质', '矿产开采许可证复印件.pdf'], ['营业执照', '营业执照扫描件.pdf']] },
          { title: '银行账户', icon: '￥', fields: [['付款账户', '中国银行 6222 **** 8899'], ['收款账户', '中国银行 6222 **** 7788'], ['开户行', '中国银行华宁支行']] },
        ]}
      />
      <div className="account-bottom-actions">
        <ButtonRow actions={[{ label: '返回中心', to: '/account' }, { label: '去修改并重新提交', tone: 'primary', to: '/enterprise/register' }]} />
      </div>
    </AccountLayout>
  );
}

export function MyDepositsPage() {
  const [deposits, setDeposits] = useState<DepositRecord[]>(api.getDeposits());

  useEffect(() => {
    void api.fetchAccountDeposits().then(setDeposits);
  }, []);

  return (
    <AccountLayout active="我的意向金">
      <AccountPageHead title="我的意向金" subtitle="管理和查看您提交的意向金付款凭证审核状态。" />
      <AccountFilter fields={['拍品名称', '意向金状态', '提交时间']} />
      <DataTable columns={[
        { key: 'lotTitle', label: '拍品名称', width: '28%', render: (row) => <TitleCell title={row.lotTitle} sub={`编号：${shortId(row.lotId)}`} /> },
        { key: 'amount', label: '保证金金额' },
        { key: 'status', label: '凭证状态', render: (row) => <StatusTag value={row.status} /> },
        { key: 'submittedAt', label: '提交时间' },
        { key: 'reviewedAt', label: '审核时间' },
        { key: 'rejectReason', label: '驳回原因', render: (row) => row.rejectReason ? <span className="account-reject-reason">{row.rejectReason}</span> : '-' },
        {
          key: 'actions',
          label: '操作',
          render: (row) => (
            <div className="inline-actions">
              <button className="link-btn" onClick={() => navigateTo('/account/deposits')} type="button">查看凭证</button>
              {row.status === '审核驳回' || row.status === '未提交' ? <button className="link-btn" onClick={() => navigateTo(getLotFallbackTarget(row))} type="button">重新上传</button> : null}
              <button className="link-btn" onClick={() => navigateTo(getLotFallbackTarget(row))} type="button">查看公告</button>
            </div>
          ),
        },
      ]} rows={deposits} />
    </AccountLayout>
  );
}

export function MyBidsPage() {
  const [bids, setBids] = useState<BidRecord[]>(api.getBids());

  useEffect(() => {
    void api.fetchAccountBids().then(setBids);
  }, []);

  return (
    <AccountLayout active="我的出价记录">
      <AccountPageHead title="我的出价记录" subtitle="查看本企业在竞价中的全部出价记录与当前领先状态。" />
      <AccountFilter fields={['拍品名称', '出价时间', '当前最高价']} />
      <DataTable columns={[
        { key: 'lotTitle', label: '拍品名称', width: '30%', render: (row) => <TitleCell title={row.lotTitle} sub={`编号：${shortId(row.lotId)}`} /> },
        { key: 'amount', label: '出价金额' },
        { key: 'incrementTimes', label: '加价次数' },
        { key: 'bidTime', label: '出价时间' },
        { key: 'isHighest', label: '当前最高价', render: (row) => <StatusTag value={row.isHighest ? '是' : '否'} tone={row.isHighest ? 'green' : 'gray'} /> },
        { key: 'auctionStatus', label: '竞价状态', render: (row) => <StatusTag value={row.auctionStatus || '竞拍中'} tone={row.auctionStatus === '已结束' ? 'gray' : 'blue'} /> },
        { key: 'actions', label: '操作', render: (row) => <button className="link-btn" onClick={() => navigateTo(getLotFallbackTarget(row, '/auctions/live/detail'))} type="button">查看详情</button> },
      ]} rows={bids} />
    </AccountLayout>
  );
}

export function MyMessagesPage() {
  const [messages, setMessages] = useState<NotificationRecord[]>(api.getNotifications());

  useEffect(() => {
    void api.fetchAccountMessages().then(setMessages);
  }, []);

  const markRead = (id: string) => {
    void api.markMessageRead(id).then((message) => {
      setMessages((items) => items.map((item) => (item.id === id ? { ...item, read: message.read } : item)));
    });
  };

  return (
    <AccountLayout active="我的通知">
      <AccountPageHead
        title="我的通知"
        subtitle="查看站内业务消息，包括成交通知和失败通知。"
        action={<button className="btn" onClick={() => messages.filter((item) => !item.read).forEach((item) => markRead(item.id))} type="button">全部标记已读</button>}
      />
      <AccountFilter fields={['通知类型', '已读状态', '发送时间']} />
      <section className="account-message-list">
        <div className="account-list-summary">共 {messages.length} 条通知</div>
        {messages.map((message) => (
          <article className={message.read ? 'read' : 'unread'} key={message.id}>
            <span className="account-unread-dot" aria-hidden="true" />
            <div className="account-message-body">
              <header>
                <div>
                  <StatusTag value={message.type} tone={message.type === '成交通知' ? 'green' : 'gray'} />
                  <h3>{message.lotTitle || message.type}</h3>
                </div>
                <time>{message.sentAt}</time>
              </header>
              <p>{message.content}</p>
              <div className="inline-actions">
                <button className="link-btn" onClick={() => navigateTo(message.lotId ? `/results/detail?id=${message.lotId}` : '/account/messages')} type="button">查看详情</button>
                {!message.read ? <button className="link-btn" onClick={() => markRead(message.id)} type="button">标记已读</button> : null}
              </div>
            </div>
          </article>
        ))}
        {messages.length === 0 ? <div className="empty-state">暂无通知消息</div> : null}
      </section>
    </AccountLayout>
  );
}

function AccountPageHead({ title, subtitle, action }: { title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <section className="account-page-head">
      <div>
        <span className="account-breadcrumb">首页 / 企业中心</span>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {action}
    </section>
  );
}

function AccountKpi({ icon, label, value, unit, helper, tone = 'green' }: { icon: string; label: string; value: string; unit?: string; helper: string; tone?: StatusTone }) {
  return (
    <article className={`account-kpi-card ${tone}`}>
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}{unit ? <em>{unit}</em> : null}</strong>
      <p>{helper}</p>
    </article>
  );
}

function AccountPanel({ title, icon, action, actionTo, wide, children }: { title: string; icon: string; action?: string; actionTo?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <section className={`account-panel ${wide ? 'wide' : ''}`}>
      <header>
        <h2><span>{icon}</span>{title}</h2>
        {action ? <button onClick={() => actionTo ? navigateTo(actionTo) : undefined} type="button">{action}</button> : null}
      </header>
      {children}
    </section>
  );
}

function CompactList({ items, emptyText }: { items: Array<{ id: string; title: string; meta: string; status: string; tone?: StatusTone; target: string }>; emptyText: string }) {
  if (items.length === 0) {
    return <div className="empty-state">{emptyText}</div>;
  }

  return (
    <div className="account-compact-list">
      {items.map((item) => (
        <button key={item.id} onClick={() => navigateTo(item.target)} type="button">
          <div>
            <strong>{item.title}</strong>
            <span>{item.meta}</span>
          </div>
          <StatusTag value={item.status} tone={item.tone} />
        </button>
      ))}
    </div>
  );
}

function AccountFilter({ fields }: { fields: string[] }) {
  return (
    <section className="account-filter-panel">
      <div className="account-filter-grid">
        {fields.map((field, index) => (
          <label className="field" key={field}>
            <span>{field}</span>
            <input placeholder={index === 0 ? '请输入关键词' : `请选择${field}`} type={field.includes('时间') ? 'date' : 'text'} />
          </label>
        ))}
        <div className="account-filter-actions">
          <button type="button">重置</button>
          <button className="primary" type="button">搜索</button>
        </div>
      </div>
    </section>
  );
}

function ReadOnlyGroups({ groups }: { groups: Array<{ title: string; icon: string; fields: Array<[string, string]> }> }) {
  return (
    <div className="readonly-groups account-readonly-groups">
      {groups.map((group) => (
        <section className="readonly-card" key={group.title}>
          <h3><span>{group.icon}</span>{group.title}</h3>
          <dl className="meta-grid">
            {group.fields.map(([field, value]) => <div key={field}><dt>{field}</dt><dd>{value}</dd></div>)}
          </dl>
        </section>
      ))}
    </div>
  );
}

function TitleCell({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="account-title-cell">
      <strong>{title}</strong>
      <small>{sub}</small>
    </div>
  );
}

function getCertificationMessage(profile: AccountProfile) {
  if (profile.isBlacklisted) {
    return '账号已被限制，请联系平台客服处理后再参与矿产竞价。';
  }

  if (profile.certificationStatus === '审核通过') {
    return '企业资质已通过审核，可提交意向金付款凭证并参与对应拍品竞价。';
  }

  if (profile.certificationStatus === '审核驳回') {
    return '企业资质认证未通过，请查看驳回原因并重新提交资料。';
  }

  if (profile.certificationStatus === '未提交') {
    return '企业尚未提交资质认证，请先完成企业入驻资料后参与竞拍。';
  }

  return '您提交的企业认证资料正在由后台管理员审核，期间暂时无法参与矿产竞价。';
}

function certificationTitle(status: AccountProfile['certificationStatus']) {
  if (status === '审核通过') {
    return '认证审核已通过';
  }

  if (status === '审核驳回') {
    return '认证审核未通过';
  }

  if (status === '未提交') {
    return '企业资质待提交';
  }

  return '企业资质认证待审核';
}

function certificationTone(status: AccountProfile['certificationStatus']) {
  if (status === '审核通过') {
    return 'success';
  }

  if (status === '审核驳回') {
    return 'danger';
  }

  return 'pending';
}

function shortId(id: string) {
  return id ? id.slice(0, 8) : '-';
}

function getLotFallbackTarget(row: { lotId?: string | null; lotTitle?: string }, path = '/announcements/upcoming/detail') {
  const lotId = String(row.lotId ?? '') || getLotIdByTitle(row);

  return lotId ? `${path}?id=${lotId}` : path;
}

function getLotIdByTitle(row: { lotTitle?: string }) {
  const lotTitle = String(row.lotTitle ?? '');

  return api.getLots().find((lot) => lot.title === lotTitle)?.id ?? '';
}
