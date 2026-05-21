import { useEffect, useState } from 'react';

import { ButtonRow } from '../components/Button';
import { DataTable } from '../components/DataTable';
import { AccountLayout } from '../components/Layouts';
import { StatusTag } from '../components/StatusTag';
import { CardSkeleton, EmptyState, ErrorState, PendingReviewState, TableSkeleton } from '../components/StatusViews';
import { navigateTo } from '../navigation';
import { ApiError, api, type AccountCertificationRecord, type ResultWorkflowRecord } from '../services/api';
import type { AccountProfile, BidRecord, DepositRecord, NotificationRecord, StatusTone } from '../types';

type DepositRecordWithVoucher = DepositRecord & {
  requiredAmount?: string;
  paidAmount?: string;
  attachmentId?: string;
  voucherFileName?: string;
  voucherFileUrl?: string;
};
type AccountRequestState = 'loading' | 'ready' | 'error' | 'unauthorized' | 'forbidden';

const defaultProfile: AccountProfile = {
  id: '',
  username: '-',
  enterpriseName: '未加载企业信息',
  certificationStatus: '未提交',
  isBlacklisted: false,
};

const defaultCertification: AccountCertificationRecord = {
  id: '',
  name: '-',
  contactPerson: '-',
  contactPhone: '-',
  mainCategory: '-',
  legalRepresentative: '-',
  legalRepresentativeIdNo: '-',
  email: '-',
  userCategory: '-',
  userType: '-',
  registeredCapital: '-',
  region: '-',
  address: '-',
  unifiedSocialCreditCode: '-',
  companyProfile: '-',
  businessScope: '-',
  paymentBankAccount: '-',
  paymentAccountName: '-',
  paymentBankName: '-',
  paymentBankLineNo: '-',
  receivingBankAccount: '-',
  receivingAccountName: '-',
  receivingBankName: '-',
  receivingBankLineNo: '-',
  status: '未提交',
  submittedAt: '-',
  reviewedAt: '-',
};

export function AccountHome() {
  const [profile, setProfile] = useState<AccountProfile>(defaultProfile);
  const [deposits, setDeposits] = useState<DepositRecord[]>(api.getDeposits());
  const [bids, setBids] = useState<BidRecord[]>(api.getBids());
  const [messages, setMessages] = useState<NotificationRecord[]>(api.getNotifications());
  const [notice, setNotice] = useState('');
  const [requestState, setRequestState] = useState<AccountRequestState>('loading');
  const pendingDeposits = deposits.filter((item) => item.status === '待审核' || item.status === '审核驳回' || item.status === '未提交').length;
  const activeBids = bids.filter((item) => item.auctionStatus !== '已结束').length;
  const unreadMessages = messages.filter((item) => !item.read).length;
  const completedBids = bids.filter((item) => item.auctionStatus === '已结束' && item.isHighest).length;

  useEffect(() => {
    void Promise.all([
      api.fetchAccountProfile(),
      api.fetchAccountDeposits(),
      api.fetchAccountBids(),
      api.fetchAccountMessages(),
    ]).then(([nextProfile, nextDeposits, nextBids, nextMessages]) => {
      setProfile(nextProfile);
      setDeposits(nextDeposits);
      setBids(nextBids);
      setMessages(nextMessages);
      setRequestState('ready');
    }).catch((error) => {
      setProfile(defaultProfile);
      setDeposits([]);
      setBids([]);
      setMessages([]);
      setNotice(getAccountErrorMessage(error));
      setRequestState(getAccountRequestState(error));
    });
  }, []);

  return (
    <AccountLayout active="中心首页">
      <AccountPageHead title="企业用户中心" subtitle="查看企业资质、意向金、竞价和站内通知的最新状态。" />
      {notice ? <p className="admin-api-notice">{notice}</p> : null}
      {renderAccountRequestState(requestState, notice, '企业中心数据加载失败')}
      {requestState === 'loading' ? <CardSkeleton count={3} /> : null}
      {requestState === 'ready' ? (
        <>
      <section className={`account-status-card ${profile.isBlacklisted ? 'danger' : certificationTone(profile.certificationStatus)}`}>
        <div className="account-status-icon">{profile.isBlacklisted ? '!' : '✓'}</div>
        <div>
          <span className="eyebrow">企业状态</span>
          <h1>{certificationTitle(profile.certificationStatus)}</h1>
          <p>{getCertificationMessage(profile)}</p>
        </div>
        <div className="account-status-actions">
          <StatusTag value={profile.isBlacklisted ? '已拉黑' : profile.certificationStatus} />
          <button onClick={() => navigateTo('/account/certification')} type="button">查看资料</button>
        </div>
      </section>
      <section className="account-kpi-grid">
        <AccountKpi icon="⏳" label="待处理意向金" value={String(pendingDeposits)} unit="笔" helper={`${deposits.length} 条意向金记录`} />
        <AccountKpi icon="槌" label="进行中竞价" value={String(activeBids)} unit="个标的" helper={`${bids.length} 条历史出价`} tone="orange" />
        <AccountKpi icon="信" label="未读通知" value={String(unreadMessages)} unit="条" helper="成交通知 / 失败通知" tone="blue" />
        <AccountKpi icon="✓" label="已成交标的" value={String(completedBids)} unit="个标的" helper={profile.isBlacklisted ? '账号已被限制' : profile.enterpriseName} tone={profile.certificationStatus === '审核通过' ? 'green' : 'gray'} />
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
            {messages.length === 0 ? <EmptyState compact description="平台暂未发送通知消息，请稍后再试。" title="暂无相关数据" /> : null}
          </div>
        </AccountPanel>
      </section>
        </>
      ) : null}
    </AccountLayout>
  );
}

export function MyCertificationPage() {
  const [profile, setProfile] = useState<AccountProfile>(defaultProfile);
  const [certification, setCertification] = useState<AccountCertificationRecord>(defaultCertification);
  const [notice, setNotice] = useState('');
  const [requestState, setRequestState] = useState<AccountRequestState>('loading');

  useEffect(() => {
    void Promise.all([
      api.fetchAccountProfile(),
      api.fetchAccountCertification(),
    ]).then(([nextProfile, nextCertification]) => {
      setProfile(nextProfile);
      setCertification(nextCertification);
      setRequestState('ready');
    }).catch((error) => {
      setProfile(defaultProfile);
      setCertification(defaultCertification);
      setNotice(getAccountErrorMessage(error));
      setRequestState(getAccountRequestState(error));
    });
  }, []);

  const certificationStatus = certification.status || profile.certificationStatus;
  const rejectReason = certification.rejectReason || '后台暂未返回驳回原因。';

  return (
    <AccountLayout active="我的企业认证">
      <AccountPageHead
        title="我的企业认证"
        subtitle="查看本企业认证资料及审核状态，确保信息准确无误以便参与竞拍。"
        action={certificationStatus === '审核驳回' || certificationStatus === '未提交' ? <button className="btn primary" onClick={() => navigateTo('/enterprise/register')} type="button">修改后重新提交</button> : undefined}
      />
      {notice ? <p className="admin-api-notice">{notice}</p> : null}
      {renderAccountRequestState(requestState, notice, '企业认证资料加载失败')}
      {requestState === 'loading' ? <CardSkeleton count={2} /> : null}
      {requestState === 'ready' && certificationStatus === '待审核' ? (
        <PendingReviewState
          description={`${getCertificationMessage({ ...profile, certificationStatus })} 提交时间：${certification.submittedAt}，平台管理员将在 1-3 个工作日内完成核验。`}
          primaryAction={{ label: '查看进度', to: '/account/certification' }}
          secondaryAction={{ label: '返回个人中心', to: '/account' }}
        />
      ) : null}
      {requestState === 'ready' && certificationStatus !== '待审核' ? (
        <section className={`account-cert-status ${certificationTone(certificationStatus)}`}>
          <div className="account-status-icon">{certificationStatus === '审核通过' ? '✓' : '!'}</div>
          <div>
            <h2>{certificationTitle(certificationStatus)}</h2>
            <p>{certificationStatus === '审核驳回' ? `驳回原因：${rejectReason}` : getCertificationMessage({ ...profile, certificationStatus })}</p>
            <div className="account-cert-meta">
              <span>提交时间：{certification.submittedAt}</span>
              <span>审核时间：{certification.reviewedAt}</span>
            </div>
          </div>
          <StatusTag value={certificationStatus} />
        </section>
      ) : null}
      {requestState === 'ready' ? <ReadOnlyGroups
        groups={[
          { title: '账号信息', icon: '人', fields: [['用户名', profile.username], ['设置密码', '********'], ['头像', certification.name.slice(0, 1)]] },
          { title: '企业基础信息', icon: '企', fields: [['企业名', certification.name], ['统一社会信用代码', certification.unifiedSocialCreditCode], ['用户类别', certification.userCategory], ['用户类型', certification.userType], ['注册资本', certification.registeredCapital], ['所属区域', certification.region], ['详细地址', certification.address]] },
          { title: '法人及联系人', icon: '证', fields: [['法人代表', certification.legalRepresentative], ['身份证号', certification.legalRepresentativeIdNo], ['联系人', certification.contactPerson], ['联系电话', certification.contactPhone], ['电子邮件', certification.email]] },
          { title: '经营信息', icon: '文', fields: [['主营类别', certification.mainCategory], ['公司简介', certification.companyProfile], ['经营范围', certification.businessScope], ['企业资质附件', '已随企业认证资料提交'], ['营业执照', '已随企业认证资料提交']] },
          { title: '银行账户', icon: '￥', fields: [['付款户名', certification.paymentAccountName], ['付款账户', certification.paymentBankAccount], ['付款开户行', certification.paymentBankName], ['付款联行号', certification.paymentBankLineNo], ['收款户名', certification.receivingAccountName], ['收款账户', certification.receivingBankAccount], ['收款开户行', certification.receivingBankName], ['收款联行号', certification.receivingBankLineNo]] },
        ]}
      /> : null}
      {requestState === 'ready' ? <div className="account-bottom-actions">
        <ButtonRow actions={[{ label: '返回中心', to: '/account' }, { label: '去修改并重新提交', tone: 'primary', to: '/enterprise/register' }]} />
      </div> : null}
    </AccountLayout>
  );
}

export function MyDepositsPage() {
  const [deposits, setDeposits] = useState<DepositRecord[]>(api.getDeposits());
  const [notice, setNotice] = useState('');
  const [requestState, setRequestState] = useState<AccountRequestState>('loading');
  const latestPending = deposits.find((item) => item.status === '待审核');
  const needsAction = deposits.filter((item) => item.status === '未提交' || item.status === '审核驳回').length;

  useEffect(() => {
    void api.fetchAccountDeposits().then((items) => {
      setDeposits(items);
      setRequestState('ready');
    }).catch((error) => {
      setDeposits([]);
      setNotice(getAccountErrorMessage(error));
      setRequestState(getAccountRequestState(error));
    });
  }, []);

  return (
    <AccountLayout active="我的意向金">
      <AccountPageHead title="我的意向金" subtitle="管理和查看您提交的意向金付款凭证审核状态。" />
      {notice ? <p className="admin-api-notice">{notice}</p> : null}
      {renderAccountRequestState(requestState, notice, '意向金记录加载失败')}
      {requestState === 'loading' ? <TableSkeleton columns={8} rows={4} /> : null}
      {requestState === 'ready' && latestPending ? (
        <section className="account-next-step-card">
          <div>
            <strong>凭证已提交，等待管理员审核</strong>
            <span>{latestPending.lotTitle} 已进入“后台管理 &gt; 审核管理 &gt; 意向金凭证审核”。</span>
          </div>
          <button className="btn primary" onClick={() => navigateTo(getLotFallbackTarget(latestPending))} type="button">返回拍品详情</button>
        </section>
      ) : null}
      {requestState === 'ready' ? <section className="account-summary-strip">
        <AccountSummary label="待审核凭证" value={`${deposits.filter((item) => item.status === '待审核').length} 笔`} />
        <AccountSummary label="已通过凭证" value={`${deposits.filter((item) => item.status === '审核通过').length} 笔`} tone="green" />
        <AccountSummary label="需处理凭证" value={`${needsAction} 笔`} tone={needsAction > 0 ? 'red' : 'gray'} />
      </section> : null}
      {requestState === 'ready' ? <AccountFilter fields={['拍品名称', '意向金状态', '提交时间']} /> : null}
      {requestState === 'ready' ? <DataTable columns={[
        { key: 'lotTitle', label: '拍品名称', width: '28%', render: (row) => <TitleCell title={row.lotTitle} sub={`编号：${shortId(row.lotId)}`} /> },
        { key: 'amount', label: '保证金金额', render: (row) => {
          const deposit = row as DepositRecordWithVoucher;

          return <TitleCell title={deposit.paidAmount || deposit.amount} sub={`应缴：${deposit.requiredAmount || deposit.amount}`} />;
        } },
        { key: 'status', label: '凭证状态', render: (row) => <StatusTag value={row.status} /> },
        { key: 'voucher', label: '凭证文件', render: (row) => {
          const deposit = row as DepositRecordWithVoucher;

          if (deposit.voucherFileUrl) {
            return <a className="account-voucher-link" href={deposit.voucherFileUrl} rel="noreferrer" target="_blank">{deposit.voucherFileName || deposit.voucher}</a>;
          }

          return (
            <span className="account-voucher-missing">
              {deposit.voucherFileName || deposit.voucher || '凭证已提交'}
              <small>待后端返回附件链接</small>
            </span>
          );
        } },
        { key: 'submittedAt', label: '提交时间' },
        { key: 'reviewedAt', label: '审核时间' },
        { key: 'rejectReason', label: '驳回原因', render: (row) => row.rejectReason ? <span className="account-reject-reason">{row.rejectReason}</span> : '-' },
        {
          key: 'actions',
          label: '操作',
          render: (row) => (
            <div className="inline-actions">
              {(row as DepositRecordWithVoucher).voucherFileUrl ? <button className="link-btn" onClick={() => window.open((row as DepositRecordWithVoucher).voucherFileUrl, '_blank', 'noopener,noreferrer')} type="button">查看凭证</button> : null}
              {row.status === '审核驳回' || row.status === '未提交' ? <button className="link-btn" onClick={() => navigateTo(getLotFallbackTarget(row))} type="button">重新上传</button> : null}
              <button className="link-btn" onClick={() => navigateTo(getLotFallbackTarget(row))} type="button">查看公告</button>
            </div>
          ),
        },
      ]} rows={deposits} emptyDescription="当前企业暂无意向金记录，请从拍卖公告详情页提交真实付款凭证。" emptyText="暂无意向金记录" /> : null}
    </AccountLayout>
  );
}

export function MyBidsPage() {
  const [bids, setBids] = useState<BidRecord[]>(api.getBids());
  const [notice, setNotice] = useState('');
  const [requestState, setRequestState] = useState<AccountRequestState>('loading');
  const highestCount = bids.filter((item) => item.isHighest).length;

  useEffect(() => {
    void api.fetchAccountBids().then((items) => {
      setBids(items);
      setRequestState('ready');
    }).catch((error) => {
      setBids([]);
      setNotice(getAccountErrorMessage(error));
      setRequestState(getAccountRequestState(error));
    });
  }, []);

  return (
    <AccountLayout active="我的出价记录">
      <AccountPageHead title="我的出价记录" subtitle="查看本企业在竞价中的全部出价记录与当前领先状态。" />
      {notice ? <p className="admin-api-notice">{notice}</p> : null}
      {renderAccountRequestState(requestState, notice, '出价记录加载失败')}
      {requestState === 'loading' ? <TableSkeleton columns={7} rows={4} /> : null}
      {requestState === 'ready' ? <section className="account-summary-strip">
        <AccountSummary label="出价记录" value={`${bids.length} 条`} />
        <AccountSummary label="当前最高价" value={`${highestCount} 个`} tone="green" />
        <AccountSummary label="进行中竞价" value={`${bids.filter((item) => item.auctionStatus !== '已结束').length} 个`} tone="orange" />
      </section> : null}
      {requestState === 'ready' ? <AccountFilter fields={['拍品名称', '出价时间', '当前最高价']} /> : null}
      {requestState === 'ready' ? <DataTable columns={[
        { key: 'lotTitle', label: '拍品名称', width: '30%', render: (row) => <TitleCell title={row.lotTitle} sub={`编号：${shortId(row.lotId)}`} /> },
        { key: 'amount', label: '出价金额' },
        { key: 'incrementTimes', label: '加价次数' },
        { key: 'bidTime', label: '出价时间' },
        { key: 'isHighest', label: '当前最高价', render: (row) => <StatusTag value={row.isHighest ? '是' : '否'} tone={row.isHighest ? 'green' : 'gray'} /> },
        { key: 'auctionStatus', label: '竞价状态', render: (row) => <StatusTag value={row.auctionStatus || '竞拍中'} tone={row.auctionStatus === '已结束' ? 'gray' : 'blue'} /> },
        { key: 'actions', label: '操作', render: (row) => <button className="link-btn" onClick={() => navigateTo(getLotFallbackTarget(row, '/auctions/live/detail'))} type="button">查看详情</button> },
      ]} rows={bids} emptyDescription="当前企业暂无真实出价记录。通过竞价详情页提交报价后会在这里展示。" emptyText="暂无出价记录" /> : null}
    </AccountLayout>
  );
}

export function MyMessagesPage() {
  const [messages, setMessages] = useState<NotificationRecord[]>(api.getNotifications());
  const [notice, setNotice] = useState('');
  const [requestState, setRequestState] = useState<AccountRequestState>('loading');
  const [readFilter, setReadFilter] = useState<'全部' | '未读' | '已读'>('全部');

  useEffect(() => {
    void api.fetchAccountMessages().then((items) => {
      setMessages(items);
      setRequestState('ready');
    }).catch((error) => {
      setMessages([]);
      setNotice(getAccountErrorMessage(error));
      setRequestState(getAccountRequestState(error));
    });
  }, []);

  const markRead = (id: string) => {
    void api.markMessageRead(id).then((message) => {
      setMessages((items) => items.map((item) => (item.id === id ? { ...item, read: message.read } : item)));
    });
  };

  const visibleMessages = messages.filter((message) => {
    if (readFilter === '未读') {
      return !message.read;
    }

    if (readFilter === '已读') {
      return Boolean(message.read);
    }

    return true;
  });

  return (
    <AccountLayout active="我的通知">
      <AccountPageHead
        title="我的通知"
        subtitle="查看站内业务消息，包括成交通知和失败通知。"
        action={<button className="btn" onClick={() => messages.filter((item) => !item.read).forEach((item) => markRead(item.id))} type="button">全部标记已读</button>}
      />
      {notice ? <p className="admin-api-notice">{notice}</p> : null}
      {renderAccountRequestState(requestState, notice, '通知消息加载失败')}
      {requestState === 'loading' ? <CardSkeleton count={3} /> : null}
      {requestState === 'ready' ? <section className="account-message-filters">
        <div>
          <span>通知类型：</span>
          <button className="active" type="button">全部</button>
          <button type="button">成交通知</button>
          <button type="button">失败通知</button>
          <button type="button">系统通知</button>
        </div>
        <div>
          <span>已读状态：</span>
          {(['全部', '未读', '已读'] as const).map((filter) => (
            <button className={readFilter === filter ? 'active' : ''} key={filter} onClick={() => setReadFilter(filter)} type="button">{filter}</button>
          ))}
        </div>
      </section> : null}
      {requestState === 'ready' ? <section className="account-message-list">
        <div className="account-list-summary">共 {visibleMessages.length} 条通知，未读 {messages.filter((item) => !item.read).length} 条</div>
        {visibleMessages.map((message) => (
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
                {message.type === '成交通知' || message.content.includes('成交') || message.content.includes('中标') ? (
                  <button className="link-btn" onClick={() => navigateTo(message.lotId ? `/account/winning-detail?id=${message.lotId}` : '/account/winning-detail')} type="button">查看办理详情</button>
                ) : null}
                {!message.read ? <button className="link-btn" onClick={() => markRead(message.id)} type="button">标记已读</button> : null}
              </div>
            </div>
          </article>
        ))}
        {visibleMessages.length === 0 ? <EmptyState compact description="当前筛选条件下没有通知消息。" title="暂无相关数据" /> : null}
      </section> : null}
    </AccountLayout>
  );
}

export function WinningDetailPage() {
  const [results, setResults] = useState<ResultWorkflowRecord[]>(api.getResults() as ResultWorkflowRecord[]);
  const [bids, setBids] = useState<BidRecord[]>(api.getBids());
  const [profile, setProfile] = useState<AccountProfile>(defaultProfile);
  const [notice, setNotice] = useState('');
  const [requestState, setRequestState] = useState<AccountRequestState>('loading');
  const queryId = getQueryId();

  useEffect(() => {
    void Promise.all([
      api.fetchResults(),
      api.fetchAccountBids(),
      api.fetchAccountProfile(),
    ]).then(([nextResults, nextBids, nextProfile]) => {
      setResults(nextResults as ResultWorkflowRecord[]);
      setBids(nextBids);
      setProfile(nextProfile);
      setRequestState('ready');
    }).catch((error) => {
      setResults([]);
      setBids([]);
      setProfile(defaultProfile);
      setNotice(getAccountErrorMessage(error));
      setRequestState(getAccountRequestState(error));
    });
  }, []);

  const selectedResult = selectWinningResult(results, bids, queryId);
  const selectedBid = bids.find((bid) => bid.lotId === selectedResult?.lotId);
  const contractStatus = getContractStatusFromResult(selectedResult);
  const tailAmount = selectedResult?.finalPrice ?? selectedBid?.amount ?? '-';
  const statusSummary = getWinningStatusSummary(contractStatus);

  return (
    <AccountLayout active="中标后办理">
      <AccountPageHead
        title="中标后办理详情"
        subtitle="查看线下签约、尾款支付说明及完成确认进度。系统不做线上金钱交易。"
        action={<button className="btn" onClick={() => navigateTo('/results')} type="button">返回成交公示</button>}
      />
      {notice ? <p className="admin-api-notice">{notice}</p> : null}
      {renderAccountRequestState(requestState, notice, '中标办理详情加载失败')}
      {requestState === 'loading' ? <CardSkeleton count={2} /> : null}
      {requestState === 'ready' && !selectedResult ? (
        <EmptyState
          description="暂未找到可展示的成交记录。可从成交通知、成交公示详情或我的出价记录进入。"
          primaryAction={{ label: '查看成交公示', to: '/results' }}
          secondaryAction={{ label: '返回企业中心', to: '/account' }}
          title="暂无中标办理记录"
        />
      ) : null}
      {requestState === 'ready' && selectedResult ? (
        <div className="winning-detail-page">
          <WinningFlowStepper status={contractStatus} />
          <section className={`winning-status-hero ${statusSummary.tone}`}>
            <div>
              <span className="eyebrow">当前办理状态</span>
              <h2>{statusSummary.title}</h2>
              <p>{statusSummary.description}</p>
            </div>
            <StatusTag value={contractStatus} tone={statusSummary.tone} />
          </section>
          <section className="winning-detail-grid">
            <article className="winning-card winning-summary-card">
              <header>
                <span>拍</span>
                <div>
                  <h2>中标拍品摘要</h2>
                  <p>成交信息来自公开成交公示与当前企业出价记录。</p>
                </div>
              </header>
              <dl className="winning-info-grid">
                <div><dt>拍品名称</dt><dd>{selectedResult.lotTitle}</dd></div>
                <div><dt>项目编号</dt><dd>{selectedResult.lotId}</dd></div>
                <div><dt>成交价</dt><dd className="money">{selectedResult.finalPrice}</dd></div>
                <div><dt>中标企业</dt><dd>{selectedResult.winner}</dd></div>
                <div><dt>成交时间</dt><dd>{selectedResult.publicTime}</dd></div>
                <div><dt>合同状态</dt><dd><StatusTag value={contractStatus} /></dd></div>
              </dl>
            </article>
            <article className="winning-card">
              <header>
                <span>签</span>
                <div>
                  <h2>线下签约</h2>
                  <p>请按平台通知到指定地点办理。</p>
                </div>
              </header>
              <dl className="winning-info-grid single">
                <div><dt>签约地址</dt><dd>华宁县宁州街道矿产资源交易服务中心二楼合同办理窗口</dd></div>
                <div><dt>办理时间</dt><dd>工作日 09:00-12:00，14:00-17:30</dd></div>
                <div><dt>联系人</dt><dd>交易服务窗口</dd></div>
                <div><dt>联系电话</dt><dd>0877-5012345</dd></div>
              </dl>
              <ul className="winning-material-list">
                {['营业执照复印件并加盖公章', '法定代表人身份证明或授权委托书', '经办人身份证原件及复印件', '平台成交通知或成交公示打印件'].map((item) => <li key={item}>{item}</li>)}
              </ul>
            </article>
            <article className="winning-card">
              <header>
                <span>款</span>
                <div>
                  <h2>尾款支付说明</h2>
                  <p>企业线下转账，管理员核验凭证后记录完成。</p>
                </div>
              </header>
              <dl className="winning-info-grid single">
                <div><dt>尾款金额</dt><dd className="money">{tailAmount}</dd></div>
                <div><dt>收款账户</dt><dd>华宁矿产资源交易中心 5300 0000 0000 1234</dd></div>
                <div><dt>开户行</dt><dd>中国银行华宁支行</dd></div>
                <div><dt>付款说明</dt><dd>备注“{selectedResult.lotId} {profile.enterpriseName} 尾款”，转账后保留银行回单供管理员线下核验。</dd></div>
              </dl>
            </article>
          </section>
        </div>
      ) : null}
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

function AccountSummary({ label, value, tone = 'blue' }: { label: string; value: string; tone?: StatusTone }) {
  return (
    <article className={`account-summary-card ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
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
    return <EmptyState compact description={emptyText} title="暂无相关数据" />;
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

function WinningFlowStepper({ status }: { status: string }) {
  const activeIndex = status === '已完成' ? 7 : status === '已签约' ? 6 : 5;
  const steps = ['浏览公告', '参与报名', '缴纳保证金', '出价竞拍', '竞拍成功', '线下签约', '支付尾款', '完成确认'];

  return (
    <section className="winning-flow-stepper" aria-label="成交后办理流程">
      {steps.map((step, index) => (
        <div className={index < activeIndex ? 'done' : index === activeIndex ? 'active' : ''} key={step}>
          <span>{index < activeIndex ? '✓' : index + 1}</span>
          <strong>{step}</strong>
        </div>
      ))}
    </section>
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

function getQueryId() {
  return new URLSearchParams(window.location.search).get('id') ?? undefined;
}

function selectWinningResult(results: ResultWorkflowRecord[], bids: BidRecord[], queryId?: string): ResultWorkflowRecord | undefined {
  if (queryId) {
    const matched = results.find((result) => result.id === queryId || result.lotId === queryId);

    if (matched) {
      return matched;
    }
  }

  const winningLotIds = new Set(bids.filter((bid) => bid.isHighest).map((bid) => bid.lotId));
  return results.find((result) => winningLotIds.has(result.lotId)) ?? results[0];
}

function getContractStatusFromResult(result?: ResultWorkflowRecord): '待签约' | '已签约' | '已完成' {
  if (result?.lotStatusCode === 'COMPLETED' || result?.lotStatusCode === '已完成') {
    return '已完成';
  }

  if (result?.lotStatusCode === 'SIGNED' || result?.lotStatusCode === '已签约') {
    return '已签约';
  }

  return '待签约';
}

function getWinningStatusSummary(status: string): { title: string; description: string; tone: StatusTone } {
  if (status === '已完成') {
    return {
      title: '已完成确认',
      description: '管理员已核验线下尾款支付凭证并完成合同状态确认。',
      tone: 'green',
    };
  }

  if (status === '已签约') {
    return {
      title: '已签约，待尾款确认',
      description: '线下合同已签署，请按付款说明完成尾款转账并保留银行回单。',
      tone: 'blue',
    };
  }

  return {
    title: '待线下签约',
    description: '请携带所需材料前往指定地点办理线下签约，签约后再按说明支付尾款。',
    tone: 'orange',
  };
}

function getLotIdByTitle(row: { lotTitle?: string }) {
  const lotTitle = String(row.lotTitle ?? '');

  return api.getLots().find((lot) => lot.title === lotTitle)?.id ?? '';
}

function getAccountRequestState(error: unknown): AccountRequestState {
  if (error instanceof ApiError && error.status === 401) {
    return 'unauthorized';
  }

  if (error instanceof ApiError && error.status === 403) {
    return 'forbidden';
  }

  return 'error';
}

function renderAccountRequestState(state: AccountRequestState, notice: string, title: string) {
  if (state === 'loading' || state === 'ready') {
    return null;
  }

  if (state === 'unauthorized') {
    return (
      <ErrorState
        compact
        description={notice}
        primaryAction={{ label: '重新登录', to: '/login' }}
        secondaryAction={{ label: '返回首页', to: '/' }}
        title="登录状态已失效"
      />
    );
  }

  if (state === 'forbidden') {
    return (
      <ErrorState
        compact
        description={notice}
        primaryAction={{ label: '切换账号', to: '/login' }}
        secondaryAction={{ label: '返回企业中心', to: '/account' }}
        title="无权限访问"
      />
    );
  }

  return (
    <ErrorState
      compact
      description={notice}
      primaryAction={{ label: '刷新页面', onClick: () => window.location.reload() }}
      secondaryAction={{ label: '返回企业中心', to: '/account' }}
      title={title}
    />
  );
}

function getAccountErrorMessage(error: unknown) {
  if (error instanceof ApiError && error.status === 403) {
    return `无权限访问企业接口：${error.message}`;
  }

  if (error instanceof ApiError && error.status === 401) {
    return `登录状态已失效：${error.message}。请重新登录。`;
  }

  return `企业接口读取失败：${error instanceof Error ? error.message : '未知错误'}`;
}
