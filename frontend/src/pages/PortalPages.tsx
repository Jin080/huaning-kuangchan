import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';

import { ButtonRow } from '../components/Button';
import { SectionHeader } from '../components/Cards';
import { DataTable } from '../components/DataTable';
import { FilterBar, type FilterValues } from '../components/FilterBar';
import { PortalLayout } from '../components/Layouts';
import { StatusTag } from '../components/StatusTag';
import { CardSkeleton, EmptyState, ErrorState } from '../components/StatusViews';
import { navigateTo } from '../navigation';
import { api, type DepositVoucherPayload, type EnterpriseCertificationPayload, type EnterpriseRegisterPayload, type RegisterMaterialUploadCategory } from '../services/api';
import { AUTH_SESSION_EVENT, getAuthProfile } from '../services/auth';
import type { BidRecord, ContentRecord, DepositRecord, Lot, ResultRecord, Stat, TableColumn } from '../types';

type LotWithBiddingEnd = Lot & { biddingEndAt?: string };
type DepositSubmission = {
  attachmentId?: string;
  amount: string;
  paidAmount?: string;
  requiredAmount?: string;
  submittedAt: string;
  voucherFileName?: string;
  voucherFileUrl?: string;
  status: DepositRecord['status'];
};
type DepositRecordWithVoucher = DepositRecord & {
  attachmentId?: string;
  paidAmount?: string;
  requiredAmount?: string;
  voucherFileName?: string;
  voucherFileUrl?: string;
};
type EnterpriseUploadKey = 'businessLicenseFileUrl' | 'qualificationFileUrl' | 'authorizationMaterialUrl';
type EnterpriseUploadState = 'empty' | 'uploading' | 'success' | 'error';
type EnterpriseUploadItem = {
  key: EnterpriseUploadKey;
  label: string;
  required: boolean;
  helper: string;
  category: RegisterMaterialUploadCategory;
};
type EnterpriseUploadStatus = {
  state: EnterpriseUploadState;
  fileName: string;
  fileUrl: string;
  message: string;
  progress: number;
};
type LoadState = 'loading' | 'ready' | 'empty' | 'error';
type BidEligibility = 'unknown' | 'approved' | 'pending' | 'rejected' | 'missing' | 'error';

const lotColumns: TableColumn<Lot>[] = [
  { key: 'title', label: '拍品标题', width: '28%' },
  { key: 'startPrice', label: '起拍价' },
  { key: 'quantity', label: '数量' },
  { key: 'category', label: '品种/品位' },
  { key: 'publicityPeriod', label: '公示期' },
  { key: 'auctionTime', label: '竞拍时间' },
  { key: 'deposit', label: '保证金金额' },
  { key: 'status', label: '状态', render: (row) => <StatusTag value={row.status} /> },
  { key: 'actions', label: '操作', render: (row) => <button className="link-btn" onClick={() => navigateTo(`/announcements/upcoming/detail?id=${row.id}`)} type="button">查看公告</button> },
];

const resultColumns: TableColumn<ResultRecord>[] = [
  { key: 'lotTitle', label: '成交拍品', width: '40%' },
  { key: 'winner', label: '中标企业名称' },
  { key: 'finalPrice', label: '最终成交价' },
  { key: 'publicTime', label: '公示时间' },
  { key: 'actions', label: '操作', render: (row) => <button className="link-btn" onClick={() => navigateTo(`/results/detail?id=${row.id}`)} type="button">查看详情</button> },
];

export function PortalHome() {
  const [stats, setStats] = useState<Stat[]>(api.getStats());
  const [lots, setLots] = useState<Lot[]>(api.getLots());
  const [results, setResults] = useState<ResultRecord[]>(api.getResults());
  const [contents, setContents] = useState<ContentRecord[]>(api.getContents());
  const [notice, setNotice] = useState('');
  const liveLots = sortLotsByBiddingEnd(lots.filter((lot) => lot.status === '竞拍中'));
  const upcomingLots = lots.filter((lot) => lot.status === '公示中');
  const homeLiveLots = liveLots;
  const resourceLots = lots.slice(0, 4);
  const displayUpcomingLots = upcomingLots.length > 0 ? upcomingLots.slice(0, 3) : lots.slice(0, 3);
  const visibleStats = stats.slice(0, 4);
  const liveScrollerRef = useRef<HTMLDivElement>(null);
  const scrollLiveLots = (direction: -1 | 1) => {
    const scroller = liveScrollerRef.current;

    if (!scroller) {
      return;
    }

    scroller.scrollBy({ left: direction * scroller.clientWidth, behavior: 'smooth' });
  };

  useEffect(() => {
    document.title = '华宁矿产资源公共交易与数字服务平台';
    void api.fetchStats().then(setStats).catch((error) => {
      setStats([]);
      setNotice(`真实接口读取失败：${getErrorMessage(error)}`);
    });
    void api.fetchLots().then(setLots).catch((error) => {
      setLots([]);
      setNotice(`真实接口读取失败：${getErrorMessage(error)}`);
    });
    void api.fetchResults().then(setResults).catch((error) => {
      setResults([]);
      setNotice(`真实接口读取失败：${getErrorMessage(error)}`);
    });
    void api.fetchContents().then(setContents).catch((error) => {
      setContents([]);
      setNotice(`真实接口读取失败：${getErrorMessage(error)}`);
    });
  }, []);

  return (
    <PortalLayout active="首页">
      {notice ? (
        <ErrorState
          compact
          description={notice}
          primaryAction={{ label: '刷新页面', onClick: () => window.location.reload() }}
          title="部分数据加载失败"
        />
      ) : null}
      <section className="latest-home-hero">
        <div className="latest-home-hero-inner">
          <span className="latest-home-kicker">智能交互门户</span>
          <h1>华宁矿产资源公共交易与数字服务平台</h1>
          <p>整合拍品公示、在线竞价、成交公示与企业服务，帮助竞买企业快速定位可参与资源。</p>
          <form className="latest-home-search" onSubmit={(event) => event.preventDefault()}>
            <span aria-hidden="true" />
            <input aria-label="搜索矿产资源、拍卖公告或政策资讯" placeholder="输入矿种、地区、公告编号或企业服务事项..." />
            <button type="button" onClick={() => navigateTo('/resources')}>搜索</button>
          </form>
          <div className="latest-home-stats" aria-label="平台数据概览">
            {visibleStats.map((stat) => (
              <article className={`latest-home-stat ${stat.tone ?? 'blue'}`} key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="latest-home-auctions">
        <div className="latest-home-section-head">
          <div>
            <span />
            <h2>正在竞价</h2>
          </div>
          <div className="latest-home-section-actions">
            {homeLiveLots.length > 3 ? (
              <div className="latest-home-auction-controls" aria-label="正在竞价拍品翻页">
                <button aria-label="查看上一组正在竞价拍品" onClick={() => scrollLiveLots(-1)} type="button">‹</button>
                <button aria-label="查看下一组正在竞价拍品" onClick={() => scrollLiveLots(1)} type="button">›</button>
              </div>
            ) : null}
            <button className="text-link" onClick={() => navigateTo('/auctions/live')} type="button">查看全部</button>
          </div>
        </div>
        <div className="latest-home-auction-shell">
          <div className="latest-home-auction-grid" ref={liveScrollerRef}>
            {homeLiveLots.length > 0 ? homeLiveLots.map((lot) => (
              <article className="latest-home-lot-card" key={lot.id}>
                <button className="latest-home-lot-media" onClick={() => navigateTo(`/auctions/live/detail?id=${lot.id}`)} type="button">
                  <LotImage imageUrl={getLotImageUrls(lot)[0]} label={lot.category} />
                  <span>{lot.status}</span>
                  <strong>{lot.category}</strong>
                </button>
                <div className="latest-home-lot-body">
                  <div>
                    <h3>{lot.title}</h3>
                    <p>{lot.productInfo || lot.origin}</p>
                  </div>
                  <dl>
                    <div><dt>当前价</dt><dd>{lot.currentPrice}</dd></div>
                    <div><dt>资源量</dt><dd>{lot.quantity}</dd></div>
                  </dl>
                  <button className="btn primary" onClick={() => navigateTo(`/auctions/live/detail?id=${lot.id}`)} type="button">参与竞价</button>
                </div>
              </article>
            )) : (
              <EmptyState compact description="当前没有正在竞价的真实拍品。" primaryAction={{ label: '查看公告', to: '/announcements/upcoming' }} title="暂无正在竞价" />
            )}
          </div>
        </div>
      </section>

      <section className="latest-home-resources">
        <div className="latest-home-section-head">
          <div>
            <span />
            <h2>矿产资源</h2>
          </div>
          <button className="text-link" onClick={() => navigateTo('/resources')} type="button">查看全部</button>
        </div>
        <div className="resource-table-card">
          <table>
            <thead>
              <tr>
                <th>资源名称</th>
                <th>品种/品位</th>
                <th>资源量</th>
                <th>所在地</th>
                <th>状态</th>
                <th>起拍价</th>
              </tr>
            </thead>
            <tbody>
              {resourceLots.map((lot) => (
                <tr key={lot.id} onClick={() => navigateTo(`/resources/detail?id=${lot.id}`)}>
                  <td>{lot.title}</td>
                  <td>{lot.category}</td>
                  <td>{lot.quantity}</td>
                  <td>{lot.origin}</td>
                  <td><StatusTag value={lot.status} /></td>
                  <td>{lot.startPrice}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {resourceLots.length === 0 ? (
            <EmptyState
              compact
              description="平台暂未发布矿产资源信息，请稍后再试。"
              primaryAction={{ label: '刷新页面', onClick: () => window.location.reload() }}
              secondaryAction={{ label: '返回首页', to: '/' }}
              title="暂无相关数据"
            />
          ) : null}
        </div>
      </section>

      <section className="latest-home-services">
        <div className="latest-home-section-head compact">
          <div>
            <span />
            <h2>服务与公示</h2>
          </div>
        </div>
        <div className="latest-home-service-grid">
          <article className="latest-home-service-card">
            <span className="latest-home-kicker">公共交易服务</span>
            <h2>华宁矿产数字交易服务平台</h2>
            <p>集中办理企业入驻、保证金资格、竞价报名和成交后续事项，关键流程保留审核记录。</p>
            <div className="latest-home-service-actions">
              <button onClick={() => navigateTo('/announcements/upcoming')} type="button"><span>01</span><strong>拍品公告</strong></button>
              <button onClick={() => navigateTo('/auctions/live')} type="button"><span>02</span><strong>在线竞价</strong></button>
              <button onClick={() => navigateTo('/account')} type="button"><span>03</span><strong>企业中心</strong></button>
            </div>
          </article>
          <div className="latest-home-side-lists">
            <article className="latest-home-news-panel">
              <header>
                <h3>即将拍卖</h3>
                <button onClick={() => navigateTo('/announcements/upcoming')} type="button">更多</button>
              </header>
              {displayUpcomingLots.map((lot) => (
                <button className="latest-home-list-row" key={lot.id} onClick={() => navigateTo(`/announcements/upcoming/detail?id=${lot.id}`)} type="button">
                  <span>{getPublicityEnd(lot.publicityPeriod)}</span>
                  <strong>{lot.title}</strong>
                </button>
              ))}
              {displayUpcomingLots.length === 0 ? <EmptyState compact description="平台暂未发布即将拍卖公告。" title="暂无拍卖公告" /> : null}
            </article>
            <article className="latest-home-news-panel">
              <header>
                <h3>政策资讯</h3>
                <button onClick={() => navigateTo('/news')} type="button">更多</button>
              </header>
              {contents.slice(0, 3).map((content) => (
                <button className="latest-home-list-row news" key={content.id} onClick={() => navigateTo(`/news/detail?id=${content.id}`)} type="button">
                  <span>{content.category}</span>
                  <strong>{content.title}</strong>
                </button>
              ))}
              {contents.length === 0 ? <EmptyState compact description="平台暂未发布政策资讯。" title="暂无政策资讯" /> : null}
            </article>
            <article className="latest-home-news-panel">
              <header>
                <h3>成交公示</h3>
                <button onClick={() => navigateTo('/results')} type="button">更多</button>
              </header>
              {results.slice(0, 2).map((result) => (
                <button className="latest-home-list-row result" key={result.id} onClick={() => navigateTo(`/results/detail?id=${result.id}`)} type="button">
                  <span>{result.finalPrice}</span>
                  <strong>{result.lotTitle}</strong>
                </button>
              ))}
              {results.length === 0 ? <EmptyState compact description="平台暂未发布成交公示。" title="暂无成交公示" /> : null}
            </article>
          </div>
        </div>
      </section>
    </PortalLayout>
  );
}

export function ResourceList() {
  const [lots, setLots] = useState<Lot[]>(api.getLots());
  const [filters, setFilters] = useState<FilterValues>({});
  const [notice, setNotice] = useState('');
  const filteredLots = filterLots(lots, filters);

  useEffect(() => {
    document.title = '矿产资源 - 华宁矿产竞拍平台';
    void api.fetchLots().then(setLots).catch((error) => {
      setLots([]);
      setNotice(`矿产资源接口读取失败：${getErrorMessage(error)}`);
    });
  }, []);

  return (
    <PortalLayout active="矿产资源">
      <PortalPageTitle
        breadcrumb={['首页', '矿产资源']}
        meta={`${lots.length} 条资源`}
        subtitle="汇总平台已发布的矿产资源与拍品，便于按矿种、所在地、状态和交易阶段快速查找。"
        title="矿产资源"
      />
      {notice ? (
        <ErrorState
          compact
          description={notice}
          primaryAction={{ label: '刷新页面', onClick: () => window.location.reload() }}
          title="资源列表加载失败"
        />
      ) : null}
      <FilterBar fields={['关键词', '品种/品位', '所在地', '交易状态']} onSearch={setFilters} />
      <section className="resource-list-layout">
        <aside className="resource-category-panel">
          <h2>资源分类</h2>
          {['全部资源', '金属矿产', '非金属矿产', '能源矿产', '建筑材料'].map((item, index) => (
            <span className={index === 0 ? 'active' : ''} key={item}>{item}</span>
          ))}
        </aside>
        <div className="resource-card-stack">
          {filteredLots.map((lot) => (
            <article className="resource-list-card" key={lot.id}>
              <button className="resource-thumb" onClick={() => navigateTo(`/resources/detail?id=${lot.id}`)} type="button">
                <LotImage imageUrl={getLotImageUrls(lot)[0]} label={lot.category} />
                <span>{lot.category}</span>
              </button>
              <div className="resource-list-main">
                <div className="resource-list-title">
                  <StatusTag value={lot.status} />
                  <h2>{lot.title}</h2>
                </div>
                <p>{lot.productInfo || lot.productDetail || '平台公开发布的矿产资源拍品，详情以公告、竞拍规则和检测报告为准。'}</p>
                <dl className="portal-key-grid compact">
                  <div><dt>资源量</dt><dd>{lot.quantity}</dd></div>
                  <div><dt>所在地</dt><dd>{lot.origin}</dd></div>
                  <div><dt>公示期</dt><dd>{lot.publicityPeriod}</dd></div>
                  <div><dt>竞拍时间</dt><dd>{lot.auctionTime}</dd></div>
                </dl>
              </div>
              <aside className="resource-list-side">
                <span>起拍价</span>
                <strong>{lot.startPrice}</strong>
                <small>保证金：{lot.deposit}</small>
                <button className="btn primary" onClick={() => navigateTo(`/resources/detail?id=${lot.id}`)} type="button">查看详情</button>
              </aside>
            </article>
          ))}
          {filteredLots.length === 0 ? (
            <EmptyState
              description="平台暂未发布矿产资源信息，请稍后再试。"
              primaryAction={{ label: '刷新页面', onClick: () => window.location.reload() }}
              secondaryAction={{ label: '返回首页', to: '/' }}
              title="暂无相关数据"
            />
          ) : null}
        </div>
      </section>
    </PortalLayout>
  );
}

export function ResourceDetail() {
  const [lot, setLot] = useState<Lot | undefined>(() => getInitialLot(getQueryId()));
  const [notice, setNotice] = useState('');
  const [loadState, setLoadState] = useState<LoadState>('loading');

  useEffect(() => {
    document.title = '资源详情 - 华宁矿产竞拍平台';
    const queryId = getQueryId();
    const localMockLot = queryId ? api.getLots().find((mockLot) => mockLot.id === queryId) : undefined;
    const loadLot = localMockLot
      ? Promise.resolve(localMockLot)
      : queryId
        ? api.fetchLot(queryId)
        : api.fetchLots().then((items) => items[0]);

    void loadLot.then((nextLot) => {
      setLot(nextLot);
      setLoadState(nextLot?.id ? 'ready' : 'empty');
    }).catch((error) => {
      setLot(undefined);
      setLoadState('error');
      setNotice(`资源详情接口读取失败：${getErrorMessage(error)}`);
    });
  }, []);

  return (
    <PortalLayout active="矿产资源">
      <PortalBreadcrumb items={['首页', '矿产资源', '资源详情']} />
      {notice ? <ErrorState compact description={notice} primaryAction={{ label: '返回列表', to: '/resources' }} title="资源详情加载失败" /> : null}
      {loadState === 'loading' ? <CardSkeleton count={2} /> : null}
      {loadState === 'empty' ? (
        <EmptyState
          description={getQueryId() ? '未找到对应的矿产资源，可能已下架或链接参数有误。' : '平台暂未发布矿产资源详情。'}
          primaryAction={{ label: '返回列表', to: '/resources' }}
          title="暂无资源详情"
        />
      ) : null}
      {lot ? <div className="resource-detail-layout">
        <article className="resource-detail-main">
          <header className="resource-detail-head">
            <StatusTag value={lot.status} />
            <h1>{lot.title}</h1>
            <p>项目编号：{lot.id} · 发布主体：{lot.supplier}</p>
          </header>
          <LotImageGallery className="resource-gallery" lot={lot} />
          <dl className="portal-key-grid">
            <div><dt>品种/品位</dt><dd>{lot.category}</dd></div>
            <div><dt>资源数量</dt><dd>{lot.quantity}</dd></div>
            <div><dt>所在地</dt><dd>{lot.origin}</dd></div>
            <div><dt>供应商</dt><dd>{lot.supplier}</dd></div>
            <div><dt>公示期</dt><dd>{lot.publicityPeriod}</dd></div>
            <div><dt>竞拍时间</dt><dd>{lot.auctionTime}</dd></div>
          </dl>
          <section className="portal-article-block">
            <h2>矿区基本情况</h2>
            <p>{lot.productDetail || lot.productInfo || '该资源由平台公开发布，竞买企业需结合公告、检测报告与现场踏勘情况进行判断。'}</p>
            <h2>交易安排</h2>
            <p>{lot.auctionRule || '平台按公告公示、意向金审核、公开竞价、成交公示和线下履约流程组织交易。'}</p>
            <h2>竞买须知</h2>
            <p>{lot.customerNotice || '企业需完成认证并按公告提交意向金凭证，审核通过后方可参与对应拍品竞价。'}</p>
          </section>
          <section className="attachment-list notice-attachments">
            {['矿产资源勘查报告.pdf', '开发利用方案.pdf', '竞买申请书模板.docx'].map((item) => (
              <div className="attachment-row static" key={item}>
                <span>{item}</span>
                <strong>待公告提供</strong>
              </div>
            ))}
          </section>
        </article>
        <aside className="resource-action-card">
          <h2>交易信息</h2>
          <div className="resource-price-box">
            <span>起拍价</span>
            <strong>{lot.startPrice}</strong>
          </div>
          <dl>
            <div><dt>当前价</dt><dd>{lot.currentPrice}</dd></div>
            <div><dt>保证金</dt><dd>{lot.deposit}</dd></div>
            <div><dt>状态</dt><dd>{lot.status}</dd></div>
            <div><dt>倒计时</dt><dd>{lot.countdown}</dd></div>
          </dl>
          <button className="btn primary" onClick={() => navigateTo(lot.status === '竞拍中' ? `/auctions/live/detail?id=${lot.id}` : `/announcements/upcoming/detail?id=${lot.id}`)} type="button">
            {lot.status === '竞拍中' ? '进入竞价' : '查看拍卖公告'}
          </button>
          <button className="btn secondary" onClick={() => navigateTo('/resources')} type="button">返回资源列表</button>
        </aside>
      </div> : null}
    </PortalLayout>
  );
}

export function UpcomingList() {
  const [lots, setLots] = useState<Lot[]>(api.getLots());
  const [filters, setFilters] = useState<FilterValues>({});
  const [notice, setNotice] = useState('');
  const upcomingLots = lots.filter((lot) => lot.status === '公示中');
  const filteredLots = filterLots(upcomingLots, filters);

  useEffect(() => {
    void api.fetchLots().then(setLots).catch((error) => {
      setLots([]);
      setNotice(`拍卖公告接口读取失败：${getErrorMessage(error)}`);
    });
  }, []);

  return (
    <PortalLayout active="即将拍卖">
      <PortalPageTitle
        breadcrumb={['首页', '即将拍卖']}
        meta={`${filteredLots.length} 条公示中公告`}
        subtitle="平台发布的矿产拍品公示信息，公示期内可查看拍品详情并提交意向金凭证。"
        title="即将拍卖公告"
      />
      {notice ? <ErrorState compact description={notice} primaryAction={{ label: '刷新页面', onClick: () => window.location.reload() }} title="公告列表加载失败" /> : null}
      <FilterBar fields={['关键词', '品种/品位', '竞拍时间', '公示状态']} onSearch={setFilters} />
      <DataTable columns={lotColumns} rows={filteredLots} />
    </PortalLayout>
  );
}

export function UpcomingDetail() {
  const [lot, setLot] = useState<Lot | undefined>(() => getInitialLot(getQueryId()));
  const [notice, setNotice] = useState('企业认证通过后，可上传意向金付款凭证。');
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [voucherStatus, setVoucherStatus] = useState<'idle' | 'uploading' | 'submitted'>('idle');
  const [submittedDeposit, setSubmittedDeposit] = useState<DepositSubmission | null>(null);
  const [profile, setProfile] = useState(() => getAuthProfile('ENTERPRISE'));
  const voucherInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const queryId = getQueryId();
    const localMockLot = queryId
      ? api.getLots().find((mockLot) => mockLot.id === queryId)
      : undefined;
    const loadLot = queryId
      ? localMockLot
        ? Promise.resolve(localMockLot)
        : api.fetchLot(queryId)
      : api.fetchLots().then((items) => items.find((item) => item.status === '公示中') ?? items[0]);

    void loadLot.then((nextLot) => {
      setLot(nextLot);
      setLoadState(nextLot?.id ? 'ready' : 'empty');
    }).catch((error) => {
      setLot(undefined);
      setLoadState('error');
      setNotice(`公告详情接口读取失败：${getErrorMessage(error)}`);
    });
  }, []);

  useEffect(() => {
    const syncProfile = () => setProfile(getAuthProfile('ENTERPRISE'));

    window.addEventListener(AUTH_SESSION_EVENT, syncProfile);
    window.addEventListener('storage', syncProfile);
    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, syncProfile);
      window.removeEventListener('storage', syncProfile);
    };
  }, []);

  useEffect(() => {
    const currentLot = lot;

    if (!currentLot?.id || isLocalMockLot(currentLot) || profile?.roleCode !== 'ENTERPRISE') {
      return;
    }

    void api.fetchAccountDeposits().then((items) => {
      const deposit = items.find((item) => item.lotId === currentLot.id);

      if (!deposit) {
        return;
      }

      const mappedDeposit = deposit as DepositRecordWithVoucher;

      setSubmittedDeposit({
        attachmentId: mappedDeposit.attachmentId,
        amount: mappedDeposit.amount,
        paidAmount: mappedDeposit.paidAmount,
        requiredAmount: mappedDeposit.requiredAmount,
        submittedAt: deposit.submittedAt,
        voucherFileName: mappedDeposit.voucherFileName || mappedDeposit.voucher,
        voucherFileUrl: mappedDeposit.voucherFileUrl,
        status: deposit.status,
      });
      setVoucherStatus('submitted');

      if (deposit.status === '审核通过') {
        setNotice('竞价资格已获得，可在竞拍开始后进入正在竞价。');
        return;
      }

      if (deposit.status === '审核驳回') {
        setNotice(`意向金凭证审核驳回：${deposit.rejectReason || '请重新上传凭证。'}`);
        return;
      }

      setNotice('凭证已提交，等待管理员审核。');
    }).catch(() => undefined);
  }, [lot, profile?.roleCode]);

  const selectDepositVoucher = () => {
    if (!lot?.id || loadState !== 'ready') {
      setNotice('未加载到真实公告详情，不能提交意向金付款凭证。');
      return;
    }

    if (isLocalMockLot(lot)) {
      setNotice('当前为本地演示拍品，不能提交真实意向金凭证，请从公告列表进入真实拍品。');
      return;
    }

    if (!profile) {
      setNotice('请先登录企业账号后上传意向金付款凭证。');
      return;
    }

    if (profile.roleCode !== 'ENTERPRISE') {
      setNotice('当前管理员账号不能提交企业意向金凭证，请切换企业账号。');
      return;
    }

    if (profile.enterprise?.certificationStatusCode !== 'APPROVED') {
      setNotice('企业认证通过后，才可上传意向金付款凭证。');
      return;
    }

    voucherInputRef.current?.click();
  };

  const uploadDepositVoucher = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';

    if (!file) {
      return;
    }

    if (!lot?.id) {
      setNotice('未加载到真实公告详情，不能提交意向金付款凭证。');
      return;
    }

    const payload: DepositVoucherPayload = {
      voucherFileName: file.name,
      voucherFileUrl: '',
      paidAmount: parseMoney(lot.deposit),
    };

    try {
      setVoucherStatus('uploading');
      setNotice(`正在上传意向金付款凭证：${file.name}`);
      const uploaded = await api.uploadFile(file, 'DEPOSIT_VOUCHER');
      payload.voucherFileName = uploaded.fileName;
      payload.voucherFileUrl = uploaded.fileUrl;
      const deposit = await api.submitDepositVoucher(lot.id, payload);
      setVoucherStatus('submitted');
      setSubmittedDeposit({
        attachmentId: (deposit as DepositRecordWithVoucher).attachmentId,
        amount: (deposit as DepositRecordWithVoucher).amount,
        paidAmount: (deposit as DepositRecordWithVoucher).paidAmount,
        requiredAmount: (deposit as DepositRecordWithVoucher).requiredAmount,
        submittedAt: deposit.submittedAt,
        voucherFileName: (deposit as DepositRecordWithVoucher).voucherFileName ?? payload.voucherFileName,
        voucherFileUrl: (deposit as DepositRecordWithVoucher).voucherFileUrl ?? payload.voucherFileUrl,
        status: deposit.status,
      });
      setNotice('凭证已提交，等待管理员审核。');
    } catch (error) {
      setVoucherStatus('idle');
      setNotice(`意向金凭证提交失败：${getErrorMessage(error)}`);
    }
  };

  return (
    <PortalLayout active="即将拍卖">
      {notice && loadState === 'error' ? <ErrorState compact description={notice} primaryAction={{ label: '返回列表', to: '/announcements/upcoming' }} title="公告详情加载失败" /> : null}
      {loadState === 'loading' ? <CardSkeleton count={2} /> : null}
      {loadState === 'empty' ? (
        <EmptyState
          description={getQueryId() ? '未找到对应的拍卖公告，可能已下架或链接参数有误。' : '平台暂未发布即将拍卖公告。'}
          primaryAction={{ label: '返回列表', to: '/announcements/upcoming' }}
          title="暂无公告详情"
        />
      ) : null}
      {lot ? (
        <NoticeDetailPage
          lot={lot}
          notice={notice}
          onDepositFileChange={uploadDepositVoucher}
          onDepositSelect={selectDepositVoucher}
          submittedDeposit={submittedDeposit}
          voucherInputRef={voucherInputRef}
          voucherStatus={voucherStatus}
        />
      ) : null}
    </PortalLayout>
  );
}

export function LiveAuctionList() {
  const [lots, setLots] = useState<Lot[]>(api.getLots());
  const [filters, setFilters] = useState<FilterValues>({});
  const [notice, setNotice] = useState('');
  const liveLots = lots.filter((lot) => lot.status === '竞拍中');
  const filteredLots = filterLots(liveLots, filters);

  useEffect(() => {
    void api.fetchLots().then(setLots).catch((error) => {
      setLots([]);
      setNotice(`正在竞价接口读取失败：${getErrorMessage(error)}`);
    });
  }, []);

  return (
    <PortalLayout active="正在竞价">
      <PortalPageTitle
        breadcrumb={['首页', '正在竞价']}
        meta={`${filteredLots.length} 个拍品竞价中`}
        subtitle="查看竞拍期拍品、当前最高价、竞价时间区间与倒计时。"
        title="正在竞价拍品"
      />
      {notice ? <ErrorState compact description={notice} primaryAction={{ label: '刷新页面', onClick: () => window.location.reload() }} title="竞价列表加载失败" /> : null}
      <FilterBar fields={['关键词', '品种/品位', '竞拍时间', '状态']} onSearch={setFilters} />
      <LiveAuctionCards lots={filteredLots} />
    </PortalLayout>
  );
}

export function AuctionDetail() {
  const [lot, setLot] = useState<Lot | undefined>(() => getInitialLot(getQueryId()));
  const [bidRecords, setBidRecords] = useState<BidRecord[]>([]);
  const [notice, setNotice] = useState('请选择出价加价次数，系统将自动计算报价金额。');
  const [incrementTimes, setIncrementTimes] = useState(1);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [isRealLot, setIsRealLot] = useState(false);
  const [bidEligibility, setBidEligibility] = useState<BidEligibility>('unknown');
  const [bidEligibilityLotId, setBidEligibilityLotId] = useState('');
  const [profile, setProfile] = useState(() => getAuthProfile('ENTERPRISE'));
  const [now, setNow] = useState(() => Date.now());
  const estimatedAmount = lot ? calculateBidAmount(lot, incrementTimes) : '0';

  useEffect(() => {
    const queryId = getQueryId();
    const localMockLot = queryId ? api.getLots().find((mockLot) => mockLot.id === queryId) : undefined;
    const loadLot = localMockLot
      ? Promise.resolve(localMockLot)
      : queryId
      ? api.fetchLot(queryId)
      : api.fetchLots().then((items) => items.find((item) => item.status === '竞拍中') ?? items[0]);

    void loadLot.then((nextLot) => {
      setLot(nextLot);
      const loadedRealLot = Boolean(nextLot?.id)
        && !isLocalMockLot(nextLot)
        && (!queryId || nextLot.id === queryId);
      setIsRealLot(loadedRealLot);
      setLoadState(nextLot?.id ? 'ready' : 'empty');

      if (loadedRealLot) {
        void api.fetchBidRecords(nextLot.id, nextLot.title).then(setBidRecords).catch((error) => {
          setBidRecords([]);
          setNotice(`出价记录读取失败：${getErrorMessage(error)}`);
        });
      } else {
        setBidRecords([]);
        setNotice(nextLot?.id ? '当前为本地演示数据，不能提交真实报价，请从正在竞价列表进入真实拍品。' : '未加载到真实竞价拍品，不能提交报价。');
      }
    }).catch((error) => {
      setLot(undefined);
      setBidRecords([]);
      setLoadState('error');
      setNotice(`竞价详情接口读取失败：${getErrorMessage(error)}`);
    });
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const syncProfile = () => setProfile(getAuthProfile('ENTERPRISE'));

    window.addEventListener(AUTH_SESSION_EVENT, syncProfile);
    window.addEventListener('storage', syncProfile);
    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, syncProfile);
      window.removeEventListener('storage', syncProfile);
    };
  }, []);
  const canCheckBidEligibility = Boolean(lot?.id && isRealLot && profile?.roleCode === 'ENTERPRISE' && profile.enterprise?.certificationStatusCode === 'APPROVED');
  useEffect(() => {
    if (!lot?.id || !isRealLot || profile?.roleCode !== 'ENTERPRISE' || profile.enterprise?.certificationStatusCode !== 'APPROVED') {
      return;
    }

    void api.fetchAccountDeposits().then((items) => {
      const deposit = items.find((item) => item.lotId === lot.id);

      if (!deposit) {
        setBidEligibilityLotId(lot.id);
        setBidEligibility('missing');
        return;
      }

      if (deposit.status === '审核通过') {
        setBidEligibilityLotId(lot.id);
        setBidEligibility('approved');
        return;
      }

      if (deposit.status === '审核驳回') {
        setBidEligibilityLotId(lot.id);
        setBidEligibility('rejected');
        return;
      }

      setBidEligibilityLotId(lot.id);
      setBidEligibility('pending');
    }).catch((error) => {
      setBidEligibilityLotId(lot.id);
      setBidEligibility('error');
      setNotice(`竞价资格读取失败：${getErrorMessage(error)}`);
    });
  }, [isRealLot, lot?.id, profile?.roleCode, profile?.enterprise?.certificationStatusCode]);
  const countdown = lot ? getAuctionCountdown(lot, now) : { text: '-', ended: true };
  const effectiveBidEligibility = canCheckBidEligibility && bidEligibilityLotId === lot?.id ? bidEligibility : 'unknown';
  const qualificationNotice = getBidQualificationNotice({ bidEligibility: effectiveBidEligibility, isRealLot, lot, notice, profile });
  const canBid = Boolean(isRealLot && profile?.roleCode === 'ENTERPRISE' && profile.enterprise?.certificationStatusCode === 'APPROVED' && !profile.enterprise?.isBlacklisted && effectiveBidEligibility === 'approved' && !countdown.ended);

  return (
    <PortalLayout active="正在竞价">
      {notice && loadState === 'error' ? <ErrorState compact description={notice} primaryAction={{ label: '返回列表', to: '/auctions/live' }} title="竞价详情加载失败" /> : null}
      {loadState === 'loading' ? <CardSkeleton count={2} /> : null}
      {loadState === 'empty' ? (
        <EmptyState
          description={getQueryId() ? '未找到对应的竞价拍品，可能已结束、下架或链接参数有误。' : '当前没有可展示的竞价拍品。'}
          primaryAction={{ label: '返回竞价列表', to: '/auctions/live' }}
          title="暂无竞价详情"
        />
      ) : null}
      {lot ? <AuctionDetailView
        bidRecords={bidRecords}
        estimatedAmount={estimatedAmount}
        incrementTimes={incrementTimes}
        lot={lot}
        countdownText={countdown.text}
        hasEnded={countdown.ended}
        notice={qualificationNotice}
        canSubmitDepositVoucher={isRealLot && !canBid}
        isRealLot={canBid}
        onBidSubmit={async () => {
          if (!isRealLot) {
            setNotice('当前为本地演示数据，不能提交真实报价，请从正在竞价列表进入真实拍品。');
            return;
          }

          if (profile?.roleCode !== 'ENTERPRISE') {
            setNotice(profile ? '当前管理员账号不能参与企业竞价，请切换企业账号。' : '请先登录企业账号后参与竞价。');
            return;
          }

          if (profile.enterprise?.certificationStatusCode !== 'APPROVED') {
            setNotice('企业认证通过后，才可提交报价。');
            return;
          }

          if (profile.enterprise?.isBlacklisted) {
            setNotice('当前企业账号已被限制，不能参与竞价。');
            return;
          }

          if (effectiveBidEligibility !== 'approved') {
            setNotice(getBidEligibilityMessage(effectiveBidEligibility));
            return;
          }

          if (countdown.ended) {
            setNotice('拍卖已结束或等待系统结拍，不能继续出价。');
            return;
          }

          try {
            await api.submitBid(lot.id, estimatedAmount);
            const nextRecords = await api.fetchBidRecords(lot.id, lot.title);
            setBidRecords(nextRecords);
            void api.fetchLot(lot.id).then(setLot);
            setNotice('报价已通过真实接口提交。可查看我的出价记录，或刷新当前价确认领先状态。');
          } catch (error) {
            setNotice(`报价提交失败：${getErrorMessage(error)}`);
          }
        }}
        onIncrementTimesChange={setIncrementTimes}
        onRefresh={() => {
          if (!isRealLot) {
            setNotice('当前为本地演示数据，不能刷新真实报价，请从正在竞价列表进入真实拍品。');
            return;
          }

          void api.fetchLot(lot.id).then(setLot).catch((error: unknown) => {
            setNotice(`刷新当前价失败：${getErrorMessage(error)}`);
          });
        }}
      /> : null}
    </PortalLayout>
  );
}

export function ResultList() {
  const [results, setResults] = useState<ResultRecord[]>(api.getResults());
  const [filters, setFilters] = useState<FilterValues>({});
  const [notice, setNotice] = useState('');
  const filteredResults = filterResults(results, filters);

  useEffect(() => {
    void api.fetchResults().then(setResults).catch((error) => {
      setResults([]);
      setNotice(`成交公示接口读取失败：${getErrorMessage(error)}`);
    });
  }, []);

  return (
    <PortalLayout active="成交公示">
      <PortalPageTitle
        breadcrumb={['首页', '成交公示']}
        meta={`${filteredResults.length} 条成交结果`}
        subtitle="公开展示平台已结束竞价并确认成交的拍品结果，接受社会各界监督。"
        title="成交公示"
      />
      {notice ? <ErrorState compact description={notice} primaryAction={{ label: '刷新页面', onClick: () => window.location.reload() }} title="成交公示加载失败" /> : null}
      <FilterBar fields={['关键词', '成交时间', '品种/品位']} onSearch={setFilters} />
      <DataTable columns={resultColumns} rows={filteredResults} />
    </PortalLayout>
  );
}

export function ResultDetail() {
  const [result, setResult] = useState<ResultRecord | undefined>(undefined);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    void api.fetchResults().then((items) => {
      const queryId = getQueryId();
      setResult(queryId ? items.find((item) => item.id === queryId || item.lotId === queryId) : items[0]);
    }).catch((error) => setNotice(`成交详情接口读取失败：${getErrorMessage(error)}`));
  }, []);

  return (
    <PortalLayout active="成交公示">
      <PortalBreadcrumb items={['首页', '成交公示', '公示详情']} />
      {notice ? <ErrorState compact description={notice} primaryAction={{ label: '返回列表', to: '/results' }} title="成交详情加载失败" /> : null}
      {!notice && !result ? (
        <EmptyState
          description="暂未找到可展示的成交公示详情。"
          primaryAction={{ label: '返回列表', to: '/results' }}
          title="暂无成交详情"
        />
      ) : null}
      {result ? <section className="result-detail-card">
        <div className="result-detail-head">
          <span className="status-tag green">已成交</span>
          <h1>{result.lotTitle}</h1>
        </div>
        <div className="result-price-panel">
          <span>最终成交价</span>
          <strong>{result.finalPrice}</strong>
        </div>
        <dl className="portal-key-grid">
          <div><dt>中标企业</dt><dd>{result.winner}</dd></div>
          <div><dt>公示时间</dt><dd>{result.publicTime}</dd></div>
          <div><dt>成交状态</dt><dd>{result.status}</dd></div>
          <div><dt>项目编号</dt><dd>{result.lotId}</dd></div>
        </dl>
        <section className="portal-article-block">
          <h2>拍品摘要信息</h2>
          <p>本成交结果由平台根据竞价结束后的最高有效报价生成，成交企业应按平台通知完成线下签约、尾款支付和后续履约手续。</p>
        </section>
        <ButtonRow actions={[
          { label: '返回列表', to: '/results' },
          { label: '查看办理详情', tone: 'primary', to: `/account/winning-detail?id=${result.id}` },
          { label: '查看拍品信息', to: `/announcements/upcoming/detail?id=${result.lotId}` },
        ]} />
      </section> : null}
    </PortalLayout>
  );
}

export function NewsList() {
  const [contents, setContents] = useState<ContentRecord[]>(api.getContents());
  const [filters, setFilters] = useState<FilterValues>({});
  const [notice, setNotice] = useState('');
  const filteredContents = filterContents(contents, filters);

  useEffect(() => {
    void api.fetchContents().then(setContents).catch((error) => {
      setContents([]);
      setNotice(`资讯接口读取失败：${getErrorMessage(error)}`);
    });
  }, []);

  return (
    <PortalLayout active="信息资讯">
      <PortalPageTitle
        breadcrumb={['首页', '信息资讯']}
        meta={`${filteredContents.length} 条已发布资讯`}
        subtitle="政策法规、交易公告、矿能动态集中公开，便于企业及时了解平台规则和行业动态。"
        title="信息资讯"
      />
      {notice ? <ErrorState compact description={notice} primaryAction={{ label: '刷新页面', onClick: () => window.location.reload() }} title="资讯列表加载失败" /> : null}
      <div className="content-layout portal-news-layout">
        <aside className="category-list news-category-list">
          <h2>分类导航</h2>
          {['政策法规', '交易公告', '矿能动态'].map((x, index) => <span className={index === 0 ? 'active' : ''} key={x}>{x}</span>)}
        </aside>
        <div className="news-list-panel">
          <FilterBar fields={['关键词']} onSearch={setFilters} />
          <div className="news-card-list">
            {filteredContents.map((content) => (
              <article className="news-list-item" key={content.id}>
                <div>
                  <span className="category-pill">{content.category}</span>
                  <h2>{content.title}</h2>
                  <p>{content.summary}</p>
                  <small>发布时间：{content.publishedAt}</small>
                </div>
                <button className="link-btn" onClick={() => navigateTo(`/news/detail?id=${content.id}`)} type="button">查看详情</button>
              </article>
            ))}
            {filteredContents.length === 0 ? (
              <EmptyState
                compact
                description="平台暂未发布政策资讯或交易动态，请稍后再试。"
                primaryAction={{ label: '刷新页面', onClick: () => window.location.reload() }}
                title="暂无资讯"
              />
            ) : null}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}

export function NewsDetail() {
  const [article, setArticle] = useState<ContentRecord | undefined>(undefined);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    void api.fetchContents().then((items) => {
      const queryId = getQueryId();
      setArticle(queryId ? items.find((item) => item.id === queryId) : items[0]);
    }).catch((error) => setNotice(`资讯详情接口读取失败：${getErrorMessage(error)}`));
  }, []);

  return (
    <PortalLayout active="信息资讯">
      <PortalBreadcrumb items={['首页', '信息资讯', '资讯详情']} />
      {notice ? <ErrorState compact description={notice} primaryAction={{ label: '返回列表', to: '/news' }} title="资讯详情加载失败" /> : null}
      {!notice && !article ? (
        <EmptyState
          description="暂未找到可展示的资讯详情。"
          primaryAction={{ label: '返回列表', to: '/news' }}
          title="暂无资讯详情"
        />
      ) : null}
      {article ? <article className="article-page portal-article-page">
        <header>
          <span className="category-pill">{article.category}</span>
          <h1>{article.title}</h1>
          <p>发布时间：{article.publishedAt} 发布单位：华宁矿产资源交易中心</p>
        </header>
        <div className="article-body">
          <p>{article.summary}</p>
          <h2>一、 严格矿产资源交易信息公开</h2>
          <p>{article.body || '平台对拍品公告、公示、竞价、成交结果等关键环节进行统一展示和状态留痕，保证交易过程公开、公平、公正。'}</p>
          <h2>二、 强化竞买企业资格管理</h2>
          <p>企业用户应根据公告要求完成认证、意向金缴纳和凭证上传，平台审核通过后方可参与对应拍品竞价。</p>
          <aside className="article-tip">
            <h3>重要提示</h3>
            <p>请以具体拍品公告和平台通知为准，按时完成资格办理、报价和线下签约流程。</p>
          </aside>
        </div>
        <ButtonRow actions={[{ label: '返回列表', to: '/news' }]} />
      </article> : null}
    </PortalLayout>
  );
}

export function DisclosurePage() {
  const [disclosures, setDisclosures] = useState<ContentRecord[]>(api.getContents());
  const [notice, setNotice] = useState('');

  useEffect(() => {
    void api.fetchContents().then(setDisclosures).catch((error) => {
      setDisclosures([]);
      setNotice(`公开说明接口读取失败：${getErrorMessage(error)}`);
    });
  }, []);
  const disclosure = disclosures[0];

  return (
    <PortalLayout active="公开说明">
      <PortalBreadcrumb items={['首页', '公开说明']} />
      {notice ? <ErrorState compact description={notice} primaryAction={{ label: '刷新页面', onClick: () => window.location.reload() }} title="公开说明加载失败" /> : null}
      {!notice && disclosures.length === 0 ? (
        <EmptyState
          compact
          description="平台暂未发布公开说明内容，请稍后再试。"
          primaryAction={{ label: '刷新页面', onClick: () => window.location.reload() }}
          title="暂无公开说明"
        />
      ) : null}
      {disclosure ? <div className="content-layout disclosure-layout">
        <aside className="category-list disclosure-directory">
          <h2>说明目录</h2>
          {['用户黑名单管理说明', '信息发布审核机制', '竞拍规则说明', '保证金缴纳与退还说明'].map((x, index) => <span className={index === 2 ? 'active' : ''} key={x}>{x}</span>)}
        </aside>
        <article className="article-card disclosure-article">
          <header>
            <span className="eyebrow">公开说明</span>
            <h1>{disclosure?.title ?? '竞拍规则说明'}</h1>
            <p>{disclosure?.summary ?? '竞拍期内，仅企业认证通过且对应拍品意向金审核通过的企业可报价。用户只能看到当前最高价，不显示最高价企业名称。'}</p>
          </header>
          <section>
            <h2>第一章 总则</h2>
            <p>为规范华宁矿产资源交易平台网络竞价行为，维护交易秩序，保障交易各方合法权益，制定本规则。</p>
            <p>凡在平台参与竞价的意向竞买人，均视同已仔细阅读并完全接受本规则及相关项目公告条款。</p>
          </section>
          <section>
            <h2>第二章 竞价原则</h2>
            <p>平台竞价活动遵循公开、公平、公正和诚实信用原则。竞买人应按平台要求完成企业认证、意向金缴纳和资格审核。</p>
          </section>
          <section>
            <h2>第三章 加价规则</h2>
            <p>报价需符合后台配置的加价幅度和加价次数规则，系统以服务器收到报价的时间作为报价顺序。</p>
          </section>
          <section>
            <h2>第四章 保证金缴纳与退还</h2>
            <p>未成交企业的保证金按平台公示流程退还；违约、失信或被列入黑名单的企业按相关规则处理。</p>
          </section>
        </article>
      </div> : null}
    </PortalLayout>
  );
}

export function LoginPage() {
  const [username, setUsername] = useState('enterprise_demo');
  const [password, setPassword] = useState('enterprise123456');
  const [captcha, setCaptcha] = useState(() => createCaptcha());
  const [captchaValue, setCaptchaValue] = useState('');
  const [notice, setNotice] = useState('请输入账号、密码和验证码后登录。');
  const [submitting, setSubmitting] = useState(false);

  const refreshCaptcha = () => {
    setCaptcha(createCaptcha());
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
      setNotice('验证码校验失败，请重新输入。');
      refreshCaptcha();
      return;
    }

    try {
      setSubmitting(true);
      setNotice('正在登录...');
      const result = await api.login(username.trim(), password, 'ENTERPRISE');
      if (result.profile.roleCode === 'ADMIN') {
        setNotice('管理员账号请从系统管理后台入口登录。');
        refreshCaptcha();
        return;
      }

      navigateTo('/account');
    } catch (error) {
      setNotice(`登录失败：${getErrorMessage(error)}`);
      refreshCaptcha();
    } finally {
      setSubmitting(false);
    }
  };
  const currentProfile = getAuthProfile('ENTERPRISE');

  return (
    <div className="login-page">
      <div className="login-shell">
        <div className="login-brand">
          <span>矿</span>
          <h1>华宁矿产竞拍平台</h1>
        </div>
        <section className="login-card">
          <h2>账号登录</h2>
          <div className={`login-alert ${notice.includes('失败') || notice.includes('不能为空') ? 'danger' : 'info'}`}>{notice}</div>
          {currentProfile ? <div className="login-current-session">当前已登录：{currentProfile.username}（{currentProfile.roleName}）</div> : null}
          <label className="field login-field">
            <span>账号</span>
            <input onChange={(event) => setUsername(event.currentTarget.value)} placeholder="请输入账号" value={username} />
          </label>
          <label className="field login-field">
            <span>密码</span>
            <input onChange={(event) => setPassword(event.currentTarget.value)} placeholder="请输入密码" type="password" value={password} />
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
          <button className="btn primary login-submit" disabled={submitting} onClick={() => void login()} type="button">{submitting ? '登录中...' : '立即登录'}</button>
          <div className="login-links">
            <button onClick={() => navigateTo('/')} type="button">返回首页</button>
            <button onClick={() => navigateTo('/enterprise/register')} type="button">企业入驻</button>
          </div>
        </section>
        <p className="login-support">本系统仅供已实名认证的企业用户参与矿产资源交易使用<br />遇到问题请联系交易中心技术支持</p>
      </div>
    </div>
  );
}

export function EnterpriseRegisterPage() {
  const currentProfile = getAuthProfile('ENTERPRISE');
  const isEnterpriseResubmission = currentProfile?.roleCode === 'ENTERPRISE';
  const [notice, setNotice] = useState(isEnterpriseResubmission ? '请重新填写企业认证资料后提交审核。' : '请填写企业资料后提交审核。');
  const [uploads, setUploads] = useState<Record<EnterpriseUploadKey, EnterpriseUploadStatus>>(() => createEnterpriseUploadStatuses());
  const uploadInputRefs = useRef<Record<EnterpriseUploadKey, HTMLInputElement | null>>({
    authorizationMaterialUrl: null,
    businessLicenseFileUrl: null,
    qualificationFileUrl: null,
  });

  const uploadEnterpriseMaterial = async (key: EnterpriseUploadKey, file?: File) => {
    if (!file) {
      return;
    }

    setUploads((current) => ({
      ...current,
      [key]: {
        ...current[key],
        fileName: file.name,
        message: '正在上传，请勿关闭页面。',
        progress: 55,
        state: 'uploading',
      },
    }));

    try {
      const target = ENTERPRISE_UPLOAD_ITEMS.find((item) => item.key === key);
      if (!target) {
        throw new Error('未找到对应的附件类型，请刷新页面后重试。');
      }

      const uploaded = isEnterpriseResubmission
        ? await api.uploadFile(file, target.category)
        : await api.uploadRegisterMaterialFile(file, target.category);

      setUploads((current) => ({
        ...current,
        [key]: {
          fileName: uploaded.fileName,
          fileUrl: uploaded.fileUrl,
          message: `${formatFileSize(uploaded.fileSize)}，上传成功。`,
          progress: 100,
          state: 'success',
        },
      }));
    } catch (error) {
      setUploads((current) => ({
        ...current,
        [key]: {
          ...current[key],
          message: getErrorMessage(error),
          progress: 0,
          state: 'error',
        },
      }));
    }
  };

  const submitRegister = async () => {
    const form = document.querySelector<HTMLFormElement>('#enterprise-register-form');

    if (!form) {
      return;
    }

    const formData = new FormData(form);
    const validation = validateEnterpriseRegisterForm(formData, isEnterpriseResubmission);

    if (!validation.valid) {
      setNotice(validation.message);
      focusEnterpriseRegisterField(form, validation.focusName);
      return;
    }

    const missingRequired = ENTERPRISE_UPLOAD_ITEMS
      .filter((item) => item.required)
      .filter((item) => !uploads[item.key].fileUrl);

    if (missingRequired.length > 0) {
      setNotice(`请先上传${missingRequired.map((item) => item.label).join('、')}。`);
      return;
    }

    try {
      if (isEnterpriseResubmission) {
        await api.submitAccountCertification(buildEnterpriseCertificationPayload(formData));
        setNotice('企业认证资料已通过登录接口重新提交，状态为待审核。');
        return;
      }

      await api.registerEnterprise(buildEnterprisePayload(formData));
      setNotice('企业入驻资料已通过真实接口提交，状态为待审核。');
    } catch (error) {
      setNotice(`${isEnterpriseResubmission ? '企业认证重提' : '企业入驻提交'}失败：${getEnterpriseSubmitErrorMessage(error)}`);
    }
  };

  return (
    <PortalLayout active="企业入驻">
      <div className="register-page">
        <header className="register-head">
          <span className="register-kicker">企业认证材料提交</span>
          <h1>{isEnterpriseResubmission ? '企业认证重提' : '企业入驻'}</h1>
          <p>请上传营业执照、企业资质和授权材料。系统会展示上传中、成功、失败和重新上传状态。</p>
          <RegisterSteps />
        </header>
        <p className="register-notice">{notice}</p>
        <div className="register-workspace">
          <LongForm
            formId="enterprise-register-form"
            groups={[
              ...(isEnterpriseResubmission ? [] : [['账号信息', [['username', '用户名'], ['password', '设置密码'], ['confirmPassword', '确认密码']]] as [string, Array<[string, string]>]]),
              ['企业基础信息', [['name', '企业名'], ['unifiedSocialCreditCode', '统一社会信用代码'], ['registeredCapital', '注册资本'], ['mainCategory', '主营分类'], ['userCategory', '用户类别'], ['userType', '用户类型'], ['region', '所属区域'], ['address', '详细地址']]],
              ['法人及联系人', [['contactPerson', '联系人'], ['contactPhone', '联系电话'], ['legalRepresentative', '法人代表'], ['legalRepresentativeIdNo', '身份证号'], ['email', '电子邮件']]],
              ['经营信息', [['companyProfile', '公司简介'], ['businessScope', '经营范围']]],
              ['付款银行账户', [['paymentBankAccount', '付款银行账户'], ['paymentAccountName', '付款账户名称'], ['paymentBankName', '付款账户开户行'], ['paymentBankLineNo', '付款人行行号']]],
              ['收款银行账户', [['receivingBankAccount', '收款银行账户'], ['receivingAccountName', '收款账户名称'], ['receivingBankName', '收款账户开户行'], ['receivingBankLineNo', '收款人行行号']]],
              ['协议确认', [['agreementAccepted', '入驻协议确认']]],
            ]}
            hiddenFields={{
              authorizationMaterialUrl: uploads.authorizationMaterialUrl.fileUrl,
              businessLicenseFileUrl: uploads.businessLicenseFileUrl.fileUrl,
              qualificationFileUrl: uploads.qualificationFileUrl.fileUrl,
            }}
            onSubmit={submitRegister}
            requiredFields={getEnterpriseRegisterRequiredFields(isEnterpriseResubmission)}
          />
          <aside className="register-upload-panel">
            <div>
              <h2>附件材料</h2>
              <p>营业执照和企业资质为必传材料，授权材料可根据办理情况选择上传。</p>
            </div>
            {ENTERPRISE_UPLOAD_ITEMS.map((item) => (
              <EnterpriseUploadCard
                inputRef={(node) => {
                  uploadInputRefs.current[item.key] = node;
                }}
                item={item}
                key={item.key}
                onSelect={() => uploadInputRefs.current[item.key]?.click()}
                onUpload={(file) => void uploadEnterpriseMaterial(item.key, file)}
                status={uploads[item.key]}
              />
            ))}
          </aside>
        </div>
      </div>
    </PortalLayout>
  );
}

function RegisterSteps() {
  return (
    <ol className="register-steps" aria-label="企业入驻流程">
      {['填写资料', '提交审核', '平台审核', '认证通过'].map((step, index) => (
        <li className={index === 0 ? 'active' : ''} key={step}>
          <span>{index + 1}</span>
          <strong>{step}</strong>
        </li>
      ))}
    </ol>
  );
}

function PortalBreadcrumb({ items }: { items: string[] }) {
  return (
    <nav className="breadcrumb-line portal-breadcrumb" aria-label="当前位置">
      {items.map((item, index) => (
        <span key={item}>
          {index > 0 ? <em>›</em> : null}
          {index === items.length - 1 ? <strong>{item}</strong> : item}
        </span>
      ))}
    </nav>
  );
}

function PortalPageTitle({
  breadcrumb,
  meta,
  subtitle,
  title,
}: {
  breadcrumb: string[];
  meta: string;
  subtitle: string;
  title: string;
}) {
  return (
    <>
      <PortalBreadcrumb items={breadcrumb} />
      <section className="page-title portal-page-title">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <span>{meta}</span>
      </section>
    </>
  );
}

function LiveAuctionCards({ lots }: { lots: Lot[] }) {
  return (
    <div className="live-list-stack">
      {lots.map((lot) => (
        <article className="live-auction-item" key={lot.id}>
          <button className="live-auction-thumb" onClick={() => navigateTo(`/auctions/live/detail?id=${lot.id}`)} type="button">
            <LotImage imageUrl={getLotImageUrls(lot)[0]} label={lot.category} />
            <span>{lot.category}</span>
          </button>
          <div className="live-auction-main">
            <StatusTag value={lot.status} />
            <h2>{lot.title}</h2>
            <p>{lot.productInfo || lot.productDetail || '竞价拍品正在公开报价，企业可进入详情页查看当前最高价和竞价规则。'}</p>
            <dl className="portal-key-grid compact">
              <div><dt>品种/品位</dt><dd>{lot.category}</dd></div>
              <div><dt>资源数量</dt><dd>{lot.quantity}</dd></div>
              <div><dt>竞价时间区间</dt><dd>{lot.auctionTime}</dd></div>
              <div><dt>保证金</dt><dd>{lot.deposit}</dd></div>
            </dl>
          </div>
          <aside className="live-auction-side">
            <span>当前最高价</span>
            <strong>{lot.currentPrice}</strong>
            <small>距结束：{lot.countdown}</small>
            <button className="btn primary" onClick={() => navigateTo(`/auctions/live/detail?id=${lot.id}`)} type="button">进入竞价</button>
          </aside>
        </article>
      ))}
      {lots.length === 0 ? (
        <EmptyState
          description="当前没有正在竞价的拍品，请关注即将拍卖公告。"
          primaryAction={{ label: '查看公告', to: '/announcements/upcoming' }}
          secondaryAction={{ label: '返回首页', to: '/' }}
          title="暂无相关数据"
        />
      ) : null}
    </div>
  );
}

function NoticeDetailPage({
  lot,
  notice,
  onDepositFileChange,
  onDepositSelect,
  submittedDeposit,
  voucherInputRef,
  voucherStatus,
}: {
  lot: Lot;
  notice: string;
  onDepositFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDepositSelect: () => void;
  submittedDeposit: DepositSubmission | null;
  voucherInputRef: React.RefObject<HTMLInputElement | null>;
  voucherStatus: 'idle' | 'uploading' | 'submitted';
}) {
  const isSubmitted = voucherStatus === 'submitted';
  const isApproved = submittedDeposit?.status === '审核通过';
  const buttonText = voucherStatus === 'uploading'
    ? '上传中...'
    : voucherStatus === 'submitted'
      ? '重新上传凭证'
      : '上传意向金付款凭证';
  const statusText = isApproved
    ? '竞价资格已获得'
    : isSubmitted
      ? '已提交，等待管理员审核'
      : '待上传意向金凭证';
  const statusTone = isApproved ? 'green' : isSubmitted ? 'orange' : 'blue';
  const depositTarget = `/account/deposits?lotId=${encodeURIComponent(lot.id)}`;
  const viewDepositVoucher = () => {
    if (submittedDeposit?.voucherFileUrl) {
      void api.openFileUrl(submittedDeposit.voucherFileUrl, submittedDeposit.attachmentId).catch(() => navigateTo(depositTarget));
      return;
    }

    navigateTo(depositTarget);
  };
  const qualificationSteps = [
    ['企业认证', '已通过'],
    ['缴纳意向金', isSubmitted ? '已上传' : '待上传'],
    ['平台审核', isApproved ? '审核通过' : isSubmitted ? '待审核' : '待提交'],
    ['竞价资格', isApproved ? '已获得' : '未获得'],
  ];

  return (
    <div className="notice-detail-page">
      <PortalBreadcrumb items={['首页', '即将拍卖', '公告详情']} />
      <div className="notice-detail-layout">
        <article className="notice-detail-main">
          <header className="notice-detail-head">
            <StatusTag value={lot.status} />
            <h1>{lot.title}</h1>
            <p>项目编号：{lot.id}</p>
          </header>
          <dl className="portal-key-grid">
            <div><dt>起拍价</dt><dd className="price">{lot.startPrice}</dd></div>
            <div><dt>保证金金额</dt><dd>{lot.deposit}</dd></div>
            <div><dt>公示期</dt><dd>{lot.publicityPeriod}</dd></div>
            <div><dt>竞拍时间</dt><dd>{lot.auctionTime}</dd></div>
            <div><dt>资源数量</dt><dd>{lot.quantity}</dd></div>
            <div><dt>产地</dt><dd>{lot.origin}</dd></div>
          </dl>
          <div className="portal-tabs sticky-tabs">
            {['商品信息', '客户须知', '竞拍规则', '保证金缴纳说明', '检测报告与附件'].map((section, index) => (
              <span className={index === 0 ? 'active' : ''} key={section}>{section}</span>
            ))}
          </div>
          <section className="portal-article-block">
            <h2>一、 矿区基本情况</h2>
            <p>{lot.productDetail || lot.productInfo || '该拍品由平台公开发布，竞买人需按公告、竞拍规则和保证金缴纳说明完成资格手续后参与报价。'}</p>
            <h2>二、 客户须知</h2>
            <p>{lot.customerNotice || '竞买企业需完成企业认证，并在拍品结束前提交意向金付款凭证。平台审核通过后，方可参与对应拍品竞价。'}</p>
            <h2>三、 竞拍规则</h2>
            <p>{lot.auctionRule || '竞价期内按后台配置的加价幅度和加价次数进行报价，系统以服务器收到报价的时间作为报价顺序。'}</p>
            <h2>四、 保证金缴纳说明</h2>
            <p>{lot.depositInstruction || '保证金需汇入平台指定账户，上传付款凭证后等待平台审核。未成交企业按平台退款流程办理。'}</p>
          </section>
          <section className="attachment-list notice-attachments">
            {['矿产资源勘查报告.pdf', '竞买申请书模板.docx', '保证金缴纳账户说明.pdf'].map((item) => (
              <div className="attachment-row static" key={item}>
                <span>{item}</span>
                <strong>待公告提供</strong>
              </div>
            ))}
          </section>
        </article>
        <aside className="qualification-card">
          <h2>意向金资格</h2>
          <span className={`status-tag ${statusTone}`}>{statusText}</span>
          <p>{notice}</p>
          <div className="qualification-flow" aria-label="意向金资格流程">
            {qualificationSteps.map(([label, value], index) => (
              <div className={index === 0 || (isSubmitted && index <= 1) || (isApproved && index <= 3) ? 'done' : ''} key={label}>
                <span>{index + 1}</span>
                <strong>{label}</strong>
                <small>{value}</small>
              </div>
            ))}
          </div>
          <div className="qualification-alert">
            {isSubmitted
              ? '凭证已进入后台审核队列。管理员将在“后台管理 > 审核管理 > 意向金凭证审核”处理。'
              : '请在拍品结束前完成保证金缴纳并上传付款凭证，审核通过后即可参与竞价。'}
          </div>
          <dl>
            <div><dt>保证金金额</dt><dd>{lot.deposit}</dd></div>
            <div><dt>缴纳账户</dt><dd>华宁矿产资源交易中心保证金专户</dd></div>
            {submittedDeposit ? (
              <>
                <div><dt>凭证文件</dt><dd>{submittedDeposit.voucherFileName || '已提交凭证'}</dd></div>
                <div><dt>提交时间</dt><dd>{submittedDeposit.submittedAt}</dd></div>
                <div><dt>实缴金额</dt><dd>{submittedDeposit.paidAmount || submittedDeposit.amount}</dd></div>
              </>
            ) : null}
          </dl>
          <input
            accept="image/jpeg,image/png,application/pdf"
            className="sr-only-file"
            onChange={onDepositFileChange}
            ref={voucherInputRef}
            type="file"
          />
          {isApproved ? (
            <button className="btn primary" onClick={() => navigateTo(lot.status === '竞拍中' ? `/auctions/live/detail?id=${lot.id}` : '/auctions/live')} type="button">
              {lot.status === '竞拍中' ? '进入正在竞价' : '等待竞拍开始'}
            </button>
          ) : null}
          {isSubmitted ? <button className="btn primary" onClick={viewDepositVoucher} type="button">{submittedDeposit?.voucherFileUrl ? '查看我的凭证' : '查看我的意向金'}</button> : null}
          <button className={isSubmitted ? 'btn secondary' : 'btn primary'} disabled={voucherStatus === 'uploading'} onClick={onDepositSelect} type="button">
            {buttonText}
          </button>
          <button className="btn secondary" onClick={() => navigateTo('/announcements/upcoming')} type="button">返回列表</button>
        </aside>
      </div>
      {isSubmitted ? (
        <section className="portal-success-next" role="status">
          <div>
            <strong>凭证已提交，等待管理员审核</strong>
            <span>可前往企业中心查看审核进度，也可以留在当前公告继续查看拍品信息。</span>
          </div>
          <div className="button-row">
            <button className="btn primary" onClick={viewDepositVoucher} type="button">{submittedDeposit?.voucherFileUrl ? '查看我的凭证' : '查看我的意向金'}</button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function AuctionDetailView({
  bidRecords,
  canSubmitDepositVoucher,
  estimatedAmount,
  countdownText,
  hasEnded,
  incrementTimes,
  isRealLot,
  lot,
  notice,
  onBidSubmit,
  onIncrementTimesChange,
  onRefresh,
}: {
  bidRecords: BidRecord[];
  canSubmitDepositVoucher: boolean;
  estimatedAmount: string;
  countdownText: string;
  hasEnded: boolean;
  incrementTimes: number;
  isRealLot: boolean;
  lot: Lot;
  notice: string;
  onBidSubmit: () => void;
  onIncrementTimesChange: (value: number) => void;
  onRefresh: () => void;
}) {
  const bidIncrement = getBidIncrement(lot);
  const changeIncrementTimes = (nextValue: number) => {
    onIncrementTimesChange(Math.max(1, nextValue));
  };

  return (
    <div className="auction-detail-page">
      <nav className="breadcrumb-line" aria-label="当前位置">
        <span>首页</span>
        <span>›</span>
        <span>正在竞价</span>
        <span>›</span>
        <strong>{lot.title}</strong>
      </nav>
      <AuctionProcessStepper />
      <section className="auction-detail-layout">
        <div className="auction-detail-main">
          <header className="auction-title-block">
            <h1>{lot.title}</h1>
            <div className="auction-meta-line">
              <span>项目编号：{lot.id}</span>
              <span>品种/品位：{lot.category}</span>
              <span>报名资格：企业认证 + 意向金审核</span>
            </div>
          </header>
          <AuctionGallery lot={lot} />
          <AuctionInfoPanel lot={lot} />
        </div>
        <aside className="bid-side-stack">
          <BiddingPanel
            bidIncrement={bidIncrement}
            bidRecordCount={bidRecords.length}
            canSubmitDepositVoucher={canSubmitDepositVoucher}
            countdownText={countdownText}
            estimatedAmount={estimatedAmount}
            hasEnded={hasEnded}
            incrementTimes={incrementTimes}
            isRealLot={isRealLot}
            lot={lot}
            notice={notice}
            onBidSubmit={onBidSubmit}
            onIncrementTimesChange={changeIncrementTimes}
            onRefresh={onRefresh}
          />
          <LiveBidFeed bidRecords={bidRecords} />
        </aside>
      </section>
      <AuctionBidHistory bidRecords={bidRecords} />
    </div>
  );
}

function AuctionProcessStepper() {
  const steps = ['浏览公告', '参与报名', '缴纳保证金', '出价竞拍', '竞拍成功', '线下签约', '支付尾款', '完成确认'];

  return (
    <div className="auction-stepper" aria-label="竞价流程">
      <div className="auction-stepper-track">
        {steps.map((step, index) => (
          <div className={index === 3 ? 'step active' : index < 3 ? 'step done' : 'step'} key={step}>
            <span>{index + 1}</span>
            <strong>{step}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function LotImageGallery({ className, lot }: { className: string; lot: Lot }) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const imageUrls = getLotImageUrls(lot);
  const displayUrls = imageUrls;
  const activePreviewIndex = previewIndex ?? 0;
  const previewImageUrl = previewIndex === null ? undefined : displayUrls[previewIndex];

  if (displayUrls.length === 0) {
    return (
      <div className={className} aria-label="拍品图片">
        <button className="gallery-main" type="button">
          <LotImage label={lot.category} />
          <span>{lot.category}</span>
          <strong>暂无拍品图片</strong>
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={className} aria-label="拍品图片">
        {displayUrls.map((imageUrl, index) => (
          <button
            className={index === 0 ? 'gallery-main' : 'gallery-thumb'}
            key={imageUrl}
            onClick={() => setPreviewIndex(index)}
            type="button"
          >
            <LotImage imageUrl={imageUrl} label={`${lot.title}图片${index + 1}`} />
            {index === 0 ? (
              <>
                <span>{lot.category}</span>
                <strong>{displayUrls.length > 1 ? `共 ${imageUrls.length} 张图片` : '查看大图'}</strong>
              </>
            ) : <span>{`图片 ${index + 1}`}</span>}
          </button>
        ))}
      </div>
      {previewImageUrl ? (
        <LotImagePreviewModal
          imageUrl={previewImageUrl}
          index={activePreviewIndex}
          label={lot.title || `图片 ${activePreviewIndex + 1}`}
          onClose={() => setPreviewIndex(null)}
          total={displayUrls.length}
        />
      ) : null}
    </>
  );
}

function LotImagePreviewModal({
  imageUrl,
  index,
  label,
  onClose,
  total,
}: {
  imageUrl: string;
  index: number;
  label: string;
  onClose: () => void;
  total: number;
}) {
  const title = label || `图片 ${index + 1}`;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="portal-image-modal-backdrop" onClick={onClose} role="presentation">
      <div
        aria-label={title}
        aria-modal="true"
        className="portal-image-modal-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="portal-image-modal-head">
          <div>
            <span>{index + 1} / {total}</span>
            <h2>{title}</h2>
          </div>
          <button aria-label="关闭图片预览" onClick={onClose} type="button">×</button>
        </header>
        <div className="portal-image-modal-body">
          <LotImage imageUrl={imageUrl} label={title} />
        </div>
      </div>
    </div>
  );
}

function LotImage({ imageUrl, label }: { imageUrl?: string; label: string }) {
  if (!imageUrl) {
    return <span className="lot-image-placeholder" aria-hidden="true" />;
  }

  return <LotImageWithFallback key={imageUrl} imageUrl={imageUrl} label={label} />;
}

function LotImageWithFallback({ imageUrl, label }: { imageUrl: string; label: string }) {
  const [currentSrc, setCurrentSrc] = useState(imageUrl);
  const [fallbackTried, setFallbackTried] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const objectUrlRef = useRef<string | undefined>(undefined);
  const fallbackRequestIdRef = useRef(0);

  useEffect(() => {
    return () => {
      fallbackRequestIdRef.current += 1;

      if (objectUrlRef.current) {
        window.URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = undefined;
      }
    };
  }, []);

  const handleImageError = () => {
    if (fallbackTried) {
      setLoadFailed(true);
      return;
    }

    const protectedUrl = getProtectedLotImageUrl(imageUrl);

    if (!protectedUrl) {
      setFallbackTried(true);
      setLoadFailed(true);
      return;
    }

    setFallbackTried(true);
    const fallbackRequestId = fallbackRequestIdRef.current;

    void api.createFileObjectUrl(protectedUrl, undefined, 'ENTERPRISE').then((objectUrl) => {
      if (fallbackRequestIdRef.current !== fallbackRequestId) {
        window.URL.revokeObjectURL(objectUrl);
        return;
      }

      if (objectUrlRef.current) {
        window.URL.revokeObjectURL(objectUrlRef.current);
      }

      objectUrlRef.current = objectUrl;
      setCurrentSrc(objectUrl);
      setLoadFailed(false);
    }).catch(() => {
      if (fallbackRequestIdRef.current === fallbackRequestId) {
        setLoadFailed(true);
      }
    });
  };

  if (loadFailed) {
    return <span className="lot-image-placeholder" aria-hidden="true" />;
  }

  return <img alt={label} className="lot-real-image" onError={handleImageError} src={currentSrc} />;
}

function getProtectedLotImageUrl(imageUrl?: string): string | undefined {
  const url = imageUrl?.trim();

  if (!url) {
    return undefined;
  }

  if (url.includes('/files/public/')) {
    return url.replace('/files/public/', '/files/content/');
  }

  if (url.includes('/files/content/')) {
    return url;
  }

  return undefined;
}

function getLotImageUrls(lot: Lot): string[] {
  return [
    ...(lot.imageUrls ?? []),
    lot.imageOneUrl,
    lot.imageTwoUrl,
    ...(lot.attachments ?? [])
      .filter((item) => item.category === 'LOT_IMAGE')
      .map((item) => item.fileUrl),
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .filter((value, index, values) => values.indexOf(value) === index);
}

function AuctionGallery({ lot }: { lot: Lot }) {
  return <LotImageGallery className="auction-gallery" lot={lot} />;
}

function AuctionInfoPanel({ lot }: { lot: Lot }) {
  const detailItems = [
    ['矿种', lot.category],
    ['数量', lot.quantity],
    ['产地', lot.origin],
    ['供应商', lot.supplier],
  ];
  const attachments = ['地质勘查储量核实报告.pdf', '矿产资源开发利用方案.pdf', '竞买申请书及承诺书模板.docx'];

  return (
    <section className="auction-tabs-card">
      <div className="auction-tabs">
        <span className="active">拍品详情</span>
        <span>相关附件 ({attachments.length})</span>
        <span>竞买须知</span>
      </div>
      <div className="auction-tab-body">
        <div className="auction-key-grid">
          {detailItems.map(([label, value]) => (
            <div className="auction-key-cell" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>
        <h3>矿区地理位置与开采条件</h3>
        <p>{lot.productDetail || lot.productInfo || '该拍品由平台公开发布，竞买人需按公告、竞拍规则和保证金缴纳说明完成资格手续后参与报价。'}</p>
        <h3 className="attachment-title">检测报告及附件下载</h3>
        <div className="attachment-list">
          {attachments.map((item) => (
            <div className="attachment-row static" key={item}>
              <span>{item}</span>
              <strong>待公告提供</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BiddingPanel({
  bidIncrement,
  bidRecordCount,
  canSubmitDepositVoucher,
  countdownText,
  estimatedAmount,
  hasEnded,
  incrementTimes,
  isRealLot,
  lot,
  notice,
  onBidSubmit,
  onIncrementTimesChange,
  onRefresh,
}: {
  bidIncrement: string;
  bidRecordCount: number;
  canSubmitDepositVoucher: boolean;
  countdownText: string;
  estimatedAmount: string;
  hasEnded: boolean;
  incrementTimes: number;
  isRealLot: boolean;
  lot: Lot;
  notice: string;
  onBidSubmit: () => void;
  onIncrementTimesChange: (value: number) => void;
  onRefresh: () => void;
}) {
  const [draftIncrementTimes, setDraftIncrementTimes] = useState(String(incrementTimes));
  const changeIncrementTimes = (value: number) => {
    const normalizedValue = Math.max(1, value);
    setDraftIncrementTimes(String(normalizedValue));
    onIncrementTimesChange(normalizedValue);
  };

  return (
    <section className="bid-panel">
      <div className="bid-panel-head">
        <StatusTag value={lot.status} />
        <div>
          <span>距结束仅剩</span>
          <strong>{countdownText}</strong>
        </div>
      </div>
      <div className="current-price-box">
        <span>当前最高价</span>
        <strong>{lot.currentPrice}</strong>
      </div>
      <dl className="bid-facts">
        <div><dt>起拍价</dt><dd>{lot.startPrice}</dd></div>
        <div><dt>加价幅度</dt><dd>{formatMoney(bidIncrement)}</dd></div>
        <div><dt>竞买保证金</dt><dd>{lot.deposit}</dd></div>
        <div><dt>出价记录</dt><dd>{bidRecordCount} 次</dd></div>
      </dl>
      <div className="bid-control">
        <label>出价加价次数</label>
        <div className="increment-control">
          <button disabled={incrementTimes <= 1} onClick={() => changeIncrementTimes(incrementTimes - 1)} type="button">−</button>
          <input
            aria-label="出价加价次数"
            inputMode="numeric"
            min={1}
            onBlur={(event) => {
              const nextValue = event.currentTarget.value;

              if (!isPositiveInteger(nextValue)) {
                changeIncrementTimes(1);
                setDraftIncrementTimes('1');
                return;
              }

              const normalizedValue = String(Number.parseInt(nextValue, 10));
              setDraftIncrementTimes(normalizedValue);
              onIncrementTimesChange(Number.parseInt(normalizedValue, 10));
            }}
            onChange={(event) => {
              const nextValue = event.currentTarget.value;

              if (/^\d*$/.test(nextValue)) {
                setDraftIncrementTimes(nextValue);

                if (isPositiveInteger(nextValue)) {
                  onIncrementTimesChange(Number.parseInt(nextValue, 10));
                }
              }
            }}
            pattern="[1-9][0-9]*"
            type="text"
            value={draftIncrementTimes}
          />
          <button onClick={() => changeIncrementTimes(incrementTimes + 1)} type="button">+</button>
        </div>
        <small className="increment-unit">次</small>
        <div className="bid-estimate">
          <span>按加价幅度倍数出价</span>
          <strong>预计总价：{formatMoney(estimatedAmount)}</strong>
        </div>
      </div>
      <div className="bid-actions">
        <button className="btn secondary" disabled={!isRealLot} onClick={onRefresh} type="button">刷新当前价</button>
        <button className="btn primary" disabled={!isRealLot || hasEnded} onClick={onBidSubmit} type="button">确认出价</button>
      </div>
      {notice.includes('报价已通过真实接口提交') ? (
        <div className="bid-next-actions">
          <button className="btn secondary" onClick={() => navigateTo('/account/bids')} type="button">查看我的出价记录</button>
          <button className="btn secondary" disabled={!isRealLot} onClick={onRefresh} type="button">刷新当前价</button>
        </div>
      ) : null}
      {canSubmitDepositVoucher && !hasEnded ? (
        <div className="bid-next-actions">
          <button className="btn secondary" onClick={() => navigateTo(`/announcements/upcoming/detail?id=${encodeURIComponent(lot.id)}`)} type="button">提交保证金凭证</button>
        </div>
      ) : null}
      <p className="bid-notice">{notice} 提交后不可撤销。</p>
    </section>
  );
}

function LiveBidFeed({ bidRecords }: { bidRecords: BidRecord[] }) {
  const rows = bidRecords.slice(0, 3);

  return (
    <section className="live-feed-card">
      <h3>实时动态</h3>
      {rows.length > 0 ? rows.map((record) => (
        <p key={record.id}><span />{record.maskedEnterprise} 出价 {record.amount}</p>
      )) : <p><span />暂无实时出价记录</p>}
    </section>
  );
}

function AuctionBidHistory({ bidRecords }: { bidRecords: BidRecord[] }) {
  return (
    <section className="auction-history">
      <SectionHeader title="出价记录" subtitle="全部出价记录企业名称脱敏展示" />
      <DataTable
        columns={[
          { key: 'isHighest', label: '状态', width: '110px', render: (row) => <StatusTag value={row.isHighest ? '领先' : '出局'} tone={row.isHighest ? 'orange' : 'gray'} /> },
          { key: 'maskedEnterprise', label: '竞买人' },
          { key: 'amount', label: '出价金额' },
          { key: 'incrementTimes', label: '加价次数' },
          { key: 'bidTime', label: '时间' },
        ]}
        rows={bidRecords as unknown as Record<string, unknown>[]}
      />
    </section>
  );
}

function getQueryId() {
  return new URLSearchParams(window.location.search).get('id') ?? undefined;
}

function getPublicityEnd(publicityPeriod: string) {
  const parts = publicityPeriod.split(' 至 ');

  return parts[1] ?? publicityPeriod;
}

function LongForm({
  formId,
  groups,
  hiddenFields,
  onSubmit,
  requiredFields = [],
}: {
  formId: string;
  groups: Array<[string, Array<[string, string]>]>;
  hiddenFields?: Record<string, string>;
  onSubmit: () => void;
  requiredFields?: Array<[string, string]>;
}) {
  const requiredFieldNames = useMemo(() => new Set(requiredFields.map(([name]) => name)), [requiredFields]);

  return (
    <form className="long-form" id={formId}>
      {hiddenFields ? Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} name={name} type="hidden" value={value} />
      )) : null}
      {groups.map(([title, fields]) => (
        <fieldset key={title}>
          <legend>{title}</legend>
          <div className="form-grid">
            {fields.map(([name, label]) => (
              <RegisterField key={name} label={label} name={name} required={requiredFieldNames.has(name)} />
            ))}
          </div>
        </fieldset>
      ))}
      <div className="sticky-actions">
        <div className="button-row">
          <button className="btn primary" onClick={onSubmit} type="button">提交审核</button>
          <button className="btn secondary" onClick={() => navigateTo('/login')} type="button">返回登录</button>
        </div>
      </div>
    </form>
  );
}

function RegisterField({ label, name, required }: { label: string; name: string; required: boolean }) {
  if (name === 'agreementAccepted') {
    return (
      <label className="field register-agreement">
        <input name={name} type="checkbox" value="是" />
        <span>{required ? <b aria-hidden="true">*</b> : null}我已阅读并同意《华宁矿产竞拍平台企业入驻协议》《隐私政策》及相关交易规则。</span>
      </label>
    );
  }

  const inputType = name.toLowerCase().includes('password') ? 'password' : 'text';

  return (
    <label className="field">
      <span>{label}{required ? <b aria-hidden="true">*</b> : null}</span>
      <input defaultValue="" name={name} placeholder={`请输入${label}`} type={inputType} />
    </label>
  );
}

const ENTERPRISE_UPLOAD_ITEMS: EnterpriseUploadItem[] = [
  {
    key: 'businessLicenseFileUrl',
    label: '营业执照',
    required: true,
    helper: '需上传清晰原件扫描件或加盖公章复印件，支持 JPG/PNG/PDF。',
    category: 'BUSINESS_LICENSE',
  },
  {
    key: 'qualificationFileUrl',
    label: '企业资质',
    required: true,
    helper: '上传采矿、贸易、供应链等相关资质证明材料。',
    category: 'ENTERPRISE_QUALIFICATION',
  },
  {
    key: 'authorizationMaterialUrl',
    label: '授权材料',
    required: false,
    helper: '法定代表人授权委托书或经办人授权说明，可选上传。',
    category: 'ENTERPRISE_AUTHORIZATION',
  },
];

const ENTERPRISE_ACCOUNT_REQUIRED_FIELDS: Array<[string, string]> = [
  ['username', '用户名'],
  ['password', '设置密码'],
  ['confirmPassword', '确认密码'],
];

const ENTERPRISE_CERTIFICATION_REQUIRED_FIELDS: Array<[string, string]> = [
  ['name', '企业名'],
  ['unifiedSocialCreditCode', '统一社会信用代码'],
  ['mainCategory', '主营分类'],
  ['userCategory', '用户类别'],
  ['userType', '用户类型'],
  ['region', '所属区域'],
  ['address', '详细地址'],
  ['contactPerson', '联系人'],
  ['contactPhone', '联系电话'],
  ['legalRepresentative', '法人代表'],
  ['legalRepresentativeIdNo', '身份证号'],
  ['email', '电子邮件'],
  ['companyProfile', '公司简介'],
  ['businessScope', '经营范围'],
  ['paymentBankAccount', '付款银行账户'],
  ['paymentAccountName', '付款账户名称'],
  ['paymentBankName', '付款账户开户行'],
  ['paymentBankLineNo', '付款人行行号'],
  ['receivingBankAccount', '收款银行账户'],
  ['receivingAccountName', '收款账户名称'],
  ['receivingBankName', '收款账户开户行'],
  ['receivingBankLineNo', '收款人行行号'],
  ['agreementAccepted', '入驻协议确认'],
];

function getEnterpriseRegisterRequiredFields(isEnterpriseResubmission: boolean) {
  return isEnterpriseResubmission
    ? ENTERPRISE_CERTIFICATION_REQUIRED_FIELDS
    : [...ENTERPRISE_ACCOUNT_REQUIRED_FIELDS, ...ENTERPRISE_CERTIFICATION_REQUIRED_FIELDS];
}

function EnterpriseUploadCard({
  inputRef,
  item,
  onSelect,
  onUpload,
  status,
}: {
  inputRef: (node: HTMLInputElement | null) => void;
  item: EnterpriseUploadItem;
  onSelect: () => void;
  onUpload: (file?: File) => void;
  status: EnterpriseUploadStatus;
}) {
  const isUploading = status.state === 'uploading';
  const stateLabel = status.state === 'success'
    ? '上传成功'
    : status.state === 'error'
      ? '上传失败'
      : status.state === 'uploading'
        ? '上传中'
        : item.required
          ? '待上传'
          : '可选上传';

  return (
    <section className={`enterprise-upload-card ${status.state}`}>
      <input
        accept=".jpg,.jpeg,.png,.pdf"
        className="sr-only-file"
        onChange={(event) => onUpload(event.currentTarget.files?.[0])}
        ref={inputRef}
        type="file"
      />
      <div className="enterprise-upload-card-head">
        <div>
          <h3>{item.label}{item.required ? <span>*</span> : null}</h3>
          <p>{item.helper}</p>
        </div>
        <StatusTag value={stateLabel} tone={status.state === 'success' ? 'green' : status.state === 'error' ? 'red' : status.state === 'uploading' ? 'blue' : 'gray'} />
      </div>
      {status.fileName ? (
        <div className="enterprise-upload-file">
          <span>{status.state === 'success' ? '✓' : status.state === 'error' ? '!' : '↑'}</span>
          <div>
            <strong>{status.fileName}</strong>
            <small>{status.message}</small>
            {isUploading ? <i style={{ width: `${status.progress}%` }} /> : null}
          </div>
        </div>
      ) : (
        <button className="enterprise-upload-empty" onClick={onSelect} type="button">
          <strong>选择文件</strong>
          <small>支持 jpg、png、pdf</small>
        </button>
      )}
      {status.fileName ? (
        <button className="enterprise-upload-retry" disabled={isUploading} onClick={onSelect} type="button">
          {status.state === 'success' ? '重新上传' : status.state === 'error' ? '重新上传' : '上传中...'}
        </button>
      ) : null}
    </section>
  );
}

function createEnterpriseUploadStatuses(): Record<EnterpriseUploadKey, EnterpriseUploadStatus> {
  return {
    authorizationMaterialUrl: createEnterpriseUploadStatus(),
    businessLicenseFileUrl: createEnterpriseUploadStatus(),
    qualificationFileUrl: createEnterpriseUploadStatus(),
  };
}

function createEnterpriseUploadStatus(): EnterpriseUploadStatus {
  return {
    state: 'empty',
    fileName: '',
    fileUrl: '',
    message: '',
    progress: 0,
  };
}

function buildEnterprisePayload(formData: FormData): EnterpriseRegisterPayload {
  return {
    username: getFormValue(formData, 'username'),
    password: getFormValue(formData, 'password'),
    confirmPassword: getFormValue(formData, 'confirmPassword'),
    ...buildEnterpriseCertificationPayload(formData),
  };
}

function buildEnterpriseCertificationPayload(formData: FormData): EnterpriseCertificationPayload {
  const payload: EnterpriseCertificationPayload = {
    name: getFormValue(formData, 'name'),
    contactPerson: getFormValue(formData, 'contactPerson'),
    contactPhone: getFormValue(formData, 'contactPhone'),
    mainCategory: getFormValue(formData, 'mainCategory'),
    legalRepresentative: getFormValue(formData, 'legalRepresentative'),
    legalRepresentativeIdNo: getFormValue(formData, 'legalRepresentativeIdNo'),
    email: getFormValue(formData, 'email'),
    userCategory: getFormValue(formData, 'userCategory'),
    userType: getFormValue(formData, 'userType'),
    registeredCapital: getFormValue(formData, 'registeredCapital'),
    region: getFormValue(formData, 'region'),
    address: getFormValue(formData, 'address'),
    unifiedSocialCreditCode: getFormValue(formData, 'unifiedSocialCreditCode'),
    companyProfile: getFormValue(formData, 'companyProfile'),
    businessScope: getFormValue(formData, 'businessScope'),
    paymentBankAccount: getFormValue(formData, 'paymentBankAccount'),
    paymentAccountName: getFormValue(formData, 'paymentAccountName'),
    paymentBankName: getFormValue(formData, 'paymentBankName'),
    paymentBankLineNo: getFormValue(formData, 'paymentBankLineNo'),
    paymentIsBankOfChina: false,
    receivingBankAccount: getFormValue(formData, 'receivingBankAccount'),
    receivingAccountName: getFormValue(formData, 'receivingAccountName'),
    receivingBankName: getFormValue(formData, 'receivingBankName'),
    receivingBankLineNo: getFormValue(formData, 'receivingBankLineNo'),
    receivingIsBankOfChina: false,
    agreementAccepted: getFormValue(formData, 'agreementAccepted') === '是',
    qualificationFileUrl: getFormValue(formData, 'qualificationFileUrl'),
    businessLicenseFileUrl: getFormValue(formData, 'businessLicenseFileUrl'),
    authorizationMaterialUrl: getFormValue(formData, 'authorizationMaterialUrl'),
  };

  (['qualificationFileUrl', 'businessLicenseFileUrl', 'authorizationMaterialUrl'] as const).forEach((key) => {
    if (!payload[key]) {
      delete payload[key];
    }
  });

  return payload;
}

function getFormValue(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

function validateEnterpriseRegisterForm(formData: FormData, isEnterpriseResubmission: boolean): { valid: true } | { valid: false; message: string; focusName: string } {
  const requiredFields = getEnterpriseRegisterRequiredFields(isEnterpriseResubmission);
  const missingFields = requiredFields.filter(([name]) => name === 'agreementAccepted'
    ? getFormValue(formData, name) !== '是'
    : !getFormValue(formData, name));

  if (missingFields.length > 0) {
    return {
      valid: false,
      message: `请补齐：${formatMissingEnterpriseFields(missingFields)}。`,
      focusName: missingFields[0][0],
    };
  }

  if (!isEnterpriseResubmission && getFormValue(formData, 'password') !== getFormValue(formData, 'confirmPassword')) {
    return {
      valid: false,
      message: '两次输入的密码不一致，请重新填写。',
      focusName: 'confirmPassword',
    };
  }

  return { valid: true };
}

function formatMissingEnterpriseFields(fields: Array<[string, string]>): string {
  const labels = fields.slice(0, 4).map(([, label]) => label);

  return fields.length > labels.length ? `${labels.join('、')}等` : labels.join('、');
}

function focusEnterpriseRegisterField(form: HTMLFormElement, name: string) {
  const field = form.elements.namedItem(name);
  const target = field instanceof RadioNodeList ? field[0] : field;

  if (target instanceof HTMLElement) {
    target.focus();
    target.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

function getEnterpriseSubmitErrorMessage(error: unknown): string {
  const message = getErrorMessage(error);

  if (isClassValidatorMessage(message)) {
    return '提交资料校验未通过，请检查必填项和字段格式后重试。';
  }

  return message;
}

function isClassValidatorMessage(message: string): boolean {
  return /must be|should not|is not|property .+ should not exist|MinLength|MaxLength|IsString|class-validator/i.test(message);
}

function sortLotsByBiddingEnd(lots: Lot[]): Lot[] {
  return [...lots].sort((left, right) => getBiddingEndTime(left) - getBiddingEndTime(right));
}

function getBiddingEndTime(lot: Lot): number {
  const biddingEndAt = typeof (lot as LotWithBiddingEnd).biddingEndAt === 'string'
    ? (lot as LotWithBiddingEnd).biddingEndAt
    : '';

  if (!biddingEndAt) {
    return Number.POSITIVE_INFINITY;
  }

  const endTime = new Date(biddingEndAt).getTime();

  return Number.isFinite(endTime) ? endTime : Number.POSITIVE_INFINITY;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '未知错误';
}

function formatFileSize(size: number): string {
  if (!Number.isFinite(size) || size <= 0) {
    return '文件大小待返回';
  }

  if (size >= 1024 * 1024) {
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.ceil(size / 1024)} KB`;
}

function createCaptcha() {
  const left = Math.floor(Math.random() * 8) + 2;
  const right = Math.floor(Math.random() * 8) + 1;

  return {
    label: `${left} + ${right} = ?`,
    answer: left + right,
  };
}

function getInitialLot(id?: string): Lot | undefined {
  return id ? api.getLots().find((lot) => lot.id === id) : undefined;
}

function isLocalMockLot(lot: Lot): boolean {
  return api.getLots().some((mockLot) => mockLot.id === lot.id);
}

function getBidQualificationNotice({
  bidEligibility,
  isRealLot,
  lot,
  notice,
  profile,
}: {
  bidEligibility: BidEligibility;
  isRealLot: boolean;
  lot?: Lot;
  notice: string;
  profile: ReturnType<typeof getAuthProfile>;
}): string {
  if (!lot?.id) {
    return '未加载到真实竞价拍品，不能提交报价。';
  }

  if (!isRealLot) {
    return notice;
  }

  if (!profile) {
    return '请先登录企业账号后参与竞价。';
  }

  if (profile.roleCode !== 'ENTERPRISE') {
    return '当前账号不是企业账号，不能参与企业竞价。';
  }

  if (profile.enterprise?.isBlacklisted) {
    return '当前企业账号已被限制，不能参与竞价。';
  }

  if (profile.enterprise?.certificationStatusCode !== 'APPROVED') {
    return '企业认证通过后，才可提交报价。';
  }

  if (bidEligibility !== 'approved') {
    return getBidEligibilityMessage(bidEligibility);
  }

  return notice;
}

function getBidEligibilityMessage(status: BidEligibility): string {
  if (status === 'pending') {
    return '意向金凭证已提交但尚未审核通过，暂不能报价。';
  }

  if (status === 'rejected') {
    return '意向金凭证审核驳回，请重新上传并通过审核后再报价。';
  }

  if (status === 'missing') {
    return '当前企业尚未获得该拍品竞价资格，请在拍品结束前到公告详情提交意向金付款凭证。';
  }

  if (status === 'error') {
    return '竞价资格接口读取失败，暂不能提交报价。';
  }

  return '正在核验竞价资格，通过后方可报价。';
}

function filterLots(lots: Lot[], filters: FilterValues): Lot[] {
  const entries = getActiveFilterEntries(filters);

  if (entries.length === 0) {
    return lots;
  }

  return lots.filter((lot) => entries.every(([field, value]) => {
    const haystack = field.includes('品种')
      ? lot.category
      : field.includes('所在地')
        ? lot.origin
        : field.includes('状态')
          ? lot.status
          : field.includes('时间')
            ? `${lot.publicityPeriod} ${lot.auctionTime}`
            : [
              lot.title,
              lot.category,
              lot.origin,
              lot.status,
              lot.publicityPeriod,
              lot.auctionTime,
              lot.productInfo,
              lot.productDetail,
              lot.supplier,
            ].join(' ');

    return normalizeFilterText(haystack).includes(value);
  }));
}

function filterResults(results: ResultRecord[], filters: FilterValues): ResultRecord[] {
  const entries = getActiveFilterEntries(filters);

  if (entries.length === 0) {
    return results;
  }

  return results.filter((result) => entries.every(([field, value]) => {
    const haystack = field.includes('时间')
      ? result.publicTime
      : field.includes('品种')
        ? result.lotTitle
        : [result.lotTitle, result.winner, result.finalPrice, result.publicTime, result.status, result.lotId].join(' ');

    return normalizeFilterText(haystack).includes(value);
  }));
}

function filterContents(contents: ContentRecord[], filters: FilterValues): ContentRecord[] {
  const entries = getActiveFilterEntries(filters);

  if (entries.length === 0) {
    return contents;
  }

  return contents.filter((content) => entries.every(([field, value]) => {
    const haystack = field.includes('分类')
      ? content.category
      : field.includes('状态')
        ? content.status
        : [content.title, content.category, content.summary, content.publishedAt, content.status].join(' ');

    return normalizeFilterText(haystack).includes(value);
  }));
}

function getActiveFilterEntries(filters: FilterValues): Array<[string, string]> {
  return Object.entries(filters)
    .map(([field, value]) => [field, normalizeFilterText(value)] as [string, string])
    .filter(([, value]) => value.length > 0);
}

function normalizeFilterText(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function isPositiveInteger(value: string): boolean {
  return /^[1-9]\d*$/.test(value);
}

function parseMoney(value: string): string {
  return value.replace(/[^\d.]/g, '') || '0';
}

function getAuctionCountdown(lot: Lot, now: number): { text: string; ended: boolean } {
  const biddingEndAt = typeof (lot as LotWithBiddingEnd).biddingEndAt === 'string'
    ? (lot as LotWithBiddingEnd).biddingEndAt
    : '';

  if (!biddingEndAt) {
    return {
      text: lot.status === '竞拍中' ? '竞价中' : lot.countdown,
      ended: lot.status === '已结束',
    };
  }

  const endTime = new Date(biddingEndAt).getTime();

  if (!Number.isFinite(endTime)) {
    return { text: lot.countdown, ended: false };
  }

  const remaining = endTime - now;

  if (remaining <= 0) {
    return { text: '竞拍已结束，结果生成中', ended: true };
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const clock = [hours, minutes, seconds].map((part) => String(part).padStart(2, '0')).join(':');

  return {
    text: days > 0 ? `剩余 ${days}天 ${clock}` : `剩余 ${clock}`,
    ended: false,
  };
}

function getBidIncrement(lot: Lot): string {
  const matched = lot.auctionRule?.match(/加价幅度\s*([\d,]+(?:\.\d+)?)/);

  return matched?.[1].replace(/,/g, '') ?? '1';
}

function calculateBidAmount(lot: Lot, incrementTimes: number): string {
  const basePrice = Number.parseFloat(parseMoney(lot.currentPrice || lot.startPrice));
  const bidIncrement = Number.parseFloat(getBidIncrement(lot));
  const amount = basePrice + Math.max(1, incrementTimes) * bidIncrement;
  const decimalPlaces = Math.max(
    countDecimalPlaces(parseMoney(lot.currentPrice || lot.startPrice)),
    countDecimalPlaces(getBidIncrement(lot)),
  );

  return amount.toFixed(decimalPlaces);
}

function countDecimalPlaces(value: string): number {
  return value.includes('.') ? value.split('.')[1].length : 0;
}

function formatMoney(value: string): string {
  return `${value} 元`;
}
