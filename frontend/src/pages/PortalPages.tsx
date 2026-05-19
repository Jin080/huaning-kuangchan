import { useEffect, useState } from 'react';

import { ButtonRow } from '../components/Button';
import { SectionHeader } from '../components/Cards';
import { DataTable } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { PortalLayout } from '../components/Layouts';
import { StatusTag } from '../components/StatusTag';
import { navigateTo } from '../navigation';
import { api, type DepositVoucherPayload, type EnterpriseRegisterPayload } from '../services/api';
import type { BidRecord, ContentRecord, Lot, ResultRecord, Stat, TableColumn } from '../types';

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
  const liveLots = lots.filter((lot) => lot.status === '竞拍中');
  const upcomingLots = lots.filter((lot) => lot.status === '公示中');
  const featuredLot = (liveLots[0] ?? lots[0]) as Lot | undefined;
  const displayUpcomingLots = upcomingLots.length > 0 ? upcomingLots.slice(0, 3) : lots.slice(0, 3);
  const visibleStats = stats.slice(0, 4);

  useEffect(() => {
    document.title = '华宁矿产资源公共交易与数字服务平台';
    void api.fetchStats().then(setStats);
    void api.fetchLots().then(setLots);
    void api.fetchResults().then(setResults);
    void api.fetchContents().then(setContents);
  }, []);

  return (
    <PortalLayout active="首页">
      <section className="latest-home-hero">
        <div className="latest-home-hero-inner">
          <span className="latest-home-kicker">智能交互门户</span>
          <h1>华宁矿产资源公共交易与数字服务平台</h1>
          <p>整合拍品公示、在线竞价、成交公示与企业服务，帮助竞买企业快速定位可参与资源。</p>
          <form className="latest-home-search" onSubmit={(event) => event.preventDefault()}>
            <span aria-hidden="true" />
            <input aria-label="搜索矿产资源、拍卖公告或政策资讯" placeholder="输入矿种、地区、公告编号或企业服务事项..." />
            <button type="button" onClick={() => navigateTo('/announcements/upcoming')}>搜索</button>
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
          <button className="text-link" onClick={() => navigateTo('/auctions/live')} type="button">查看全部</button>
        </div>
        <div className="latest-home-auction-grid">
          {featuredLot ? (
            <article className="latest-home-lot-card">
              <button className="latest-home-lot-media" onClick={() => navigateTo(`/auctions/live/detail?id=${featuredLot.id}`)} type="button">
                <span>{featuredLot.status}</span>
                <strong>{featuredLot.category}</strong>
              </button>
              <div className="latest-home-lot-body">
                <div>
                  <h3>{featuredLot.title}</h3>
                  <p>{featuredLot.productInfo || featuredLot.origin}</p>
                </div>
                <dl>
                  <div><dt>当前价</dt><dd>{featuredLot.currentPrice}</dd></div>
                  <div><dt>资源量</dt><dd>{featuredLot.quantity}</dd></div>
                </dl>
                <button className="btn primary" onClick={() => navigateTo(`/auctions/live/detail?id=${featuredLot.id}`)} type="button">参与竞价</button>
              </div>
            </article>
          ) : null}
          {[0, 1].map((item) => (
            <article className="latest-home-skeleton-card" key={item}>
              <div />
              <span />
              <span />
              <strong />
            </article>
          ))}
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
            </article>
          </div>
        </div>
      </section>
    </PortalLayout>
  );
}

export function UpcomingList() {
  const [lots, setLots] = useState<Lot[]>(api.getLots());

  useEffect(() => {
    void api.fetchLots().then(setLots);
  }, []);

  return (
    <PortalLayout active="即将拍卖">
      <PortalPageTitle
        breadcrumb={['首页', '即将拍卖']}
        meta={`${lots.filter((lot) => lot.status === '公示中').length} 条公示中公告`}
        subtitle="平台发布的矿产标的公示信息，公示期内可查看标的详情并提交意向金凭证。"
        title="即将拍卖公告"
      />
      <FilterBar fields={['关键词', '品种/品位', '竞拍时间', '公示状态']} />
      <DataTable columns={lotColumns} rows={lots.filter((lot) => lot.status === '公示中')} />
    </PortalLayout>
  );
}

export function UpcomingDetail() {
  const [lot, setLot] = useState<Lot>(api.getLot(getQueryId()));
  const [notice, setNotice] = useState('企业认证通过后，可上传意向金付款凭证。');

  useEffect(() => {
    const queryId = getQueryId();
    const loadLot = queryId
      ? api.fetchLot(queryId)
      : api.fetchLots().then((items) => items.find((item) => item.status === '公示中') ?? items[0] ?? api.getLot());

    void loadLot.then(setLot);
  }, []);

  const submitDeposit = async () => {
    const payload: DepositVoucherPayload = {
      voucherFileName: 'T14-意向金付款凭证.pdf',
      voucherFileUrl: 'https://files.example.com/t14-deposit-voucher.pdf',
      paidAmount: parseMoney(lot.deposit),
    };

    try {
      await api.submitDepositVoucher(lot.id, payload);
      setNotice('意向金凭证已通过真实接口提交，状态为待审核。');
    } catch (error) {
      setNotice(`意向金凭证提交失败：${getErrorMessage(error)}`);
    }
  };

  return (
    <PortalLayout active="即将拍卖">
      <NoticeDetailPage lot={lot} notice={notice} onDepositSubmit={submitDeposit} />
    </PortalLayout>
  );
}

export function LiveAuctionList() {
  const [lots, setLots] = useState<Lot[]>(api.getLots());

  useEffect(() => {
    void api.fetchLots().then(setLots);
  }, []);

  return (
    <PortalLayout active="正在竞价">
      <PortalPageTitle
        breadcrumb={['首页', '正在竞价']}
        meta={`${lots.filter((lot) => lot.status === '竞拍中').length} 个标的竞价中`}
        subtitle="查看竞拍期标的、当前最高价、竞价时间区间与倒计时。"
        title="正在竞价标的"
      />
      <FilterBar fields={['关键词', '品种/品位', '竞拍时间', '状态']} />
      <LiveAuctionCards lots={lots.filter((lot) => lot.status === '竞拍中')} />
    </PortalLayout>
  );
}

export function AuctionDetail() {
  const [lot, setLot] = useState<Lot>(api.getLot(getQueryId()));
  const [bidRecords, setBidRecords] = useState<BidRecord[]>(api.getBids());
  const [notice, setNotice] = useState('请选择出价加价次数，系统将自动计算报价金额。');
  const [incrementTimes, setIncrementTimes] = useState(1);
  const [isRealLot, setIsRealLot] = useState(false);
  const estimatedAmount = calculateBidAmount(lot, incrementTimes);

  useEffect(() => {
    const queryId = getQueryId();
    const localMockLot = queryId ? api.getLots().find((mockLot) => mockLot.id === queryId) : undefined;
    const loadLot = localMockLot
      ? Promise.resolve(localMockLot)
      : queryId
      ? api.fetchLot(queryId)
      : api.fetchLots().then((items) => items.find((item) => item.status === '竞拍中') ?? items[0] ?? api.getLot());

    void loadLot.then((nextLot) => {
      setLot(nextLot);
      const loadedRealLot = Boolean(nextLot.id)
        && !isLocalMockLot(nextLot)
        && (!queryId || nextLot.id === queryId);
      setIsRealLot(loadedRealLot);

      if (loadedRealLot) {
        void api.fetchBidRecords(nextLot.id, nextLot.title).then(setBidRecords);
      } else {
        setBidRecords(api.getBids());
        setNotice('当前为本地演示数据，不能提交真实报价，请从正在竞价列表进入真实拍品。');
      }
    });
  }, []);

  return (
    <PortalLayout active="正在竞价">
      <AuctionDetailView
        bidRecords={bidRecords}
        estimatedAmount={estimatedAmount}
        incrementTimes={incrementTimes}
        lot={lot}
        notice={notice}
        isRealLot={isRealLot}
        onBidSubmit={async () => {
          if (!isRealLot) {
            setNotice('当前为本地演示数据，不能提交真实报价，请从正在竞价列表进入真实拍品。');
            return;
          }

          try {
            await api.submitBid(lot.id, estimatedAmount);
            const nextRecords = await api.fetchBidRecords(lot.id, lot.title);
            setBidRecords(nextRecords);
            void api.fetchLot(lot.id).then(setLot);
            setNotice('报价已通过真实接口提交。');
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
      />
    </PortalLayout>
  );
}

export function ResultList() {
  const [results, setResults] = useState<ResultRecord[]>(api.getResults());

  useEffect(() => {
    void api.fetchResults().then(setResults);
  }, []);

  return (
    <PortalLayout active="成交公示">
      <PortalPageTitle
        breadcrumb={['首页', '成交公示']}
        meta={`${results.length} 条成交结果`}
        subtitle="公开展示平台已结束竞价并确认成交的标的结果，接受社会各界监督。"
        title="成交公示"
      />
      <FilterBar fields={['关键词', '成交时间', '品种/品位']} />
      <DataTable columns={resultColumns} rows={results} />
    </PortalLayout>
  );
}

export function ResultDetail() {
  const [result, setResult] = useState<ResultRecord>(api.getResults()[0]);

  useEffect(() => {
    void api.fetchResults().then((items) => {
      setResult(items.find((item) => item.id === getQueryId()) ?? items[0] ?? api.getResults()[0]);
    });
  }, []);

  return (
    <PortalLayout active="成交公示">
      <PortalBreadcrumb items={['首页', '成交公示', '公示详情']} />
      <section className="result-detail-card">
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
        <ButtonRow actions={[{ label: '返回列表', to: '/results' }, { label: '查看拍品信息', tone: 'primary', to: `/announcements/upcoming/detail?id=${result.lotId}` }]} />
      </section>
    </PortalLayout>
  );
}

export function NewsList() {
  const [contents, setContents] = useState<ContentRecord[]>(api.getContents());

  useEffect(() => {
    void api.fetchContents().then(setContents);
  }, []);

  return (
    <PortalLayout active="信息资讯">
      <PortalPageTitle
        breadcrumb={['首页', '信息资讯']}
        meta={`${contents.length} 条已发布资讯`}
        subtitle="政策法规、交易公告、矿能动态集中公开，便于企业及时了解平台规则和行业动态。"
        title="信息资讯"
      />
      <div className="content-layout portal-news-layout">
        <aside className="category-list news-category-list">
          <h2>分类导航</h2>
          {['政策法规', '交易公告', '矿能动态'].map((x, index) => <button className={index === 0 ? 'active' : ''} key={x} type="button">{x}</button>)}
        </aside>
        <div className="news-list-panel">
          <FilterBar fields={['关键词']} />
          <div className="news-card-list">
            {contents.map((content) => (
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
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}

export function NewsDetail() {
  const [article, setArticle] = useState<ContentRecord>(api.getContents()[0]);

  useEffect(() => {
    void api.fetchContents().then((items) => {
      setArticle(items.find((item) => item.id === getQueryId()) ?? items[0] ?? api.getContents()[0]);
    });
  }, []);

  return (
    <PortalLayout active="信息资讯">
      <PortalBreadcrumb items={['首页', '信息资讯', '资讯详情']} />
      <article className="article-page portal-article-page">
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
      </article>
    </PortalLayout>
  );
}

export function DisclosurePage() {
  const [disclosures, setDisclosures] = useState<ContentRecord[]>(api.getContents());

  useEffect(() => {
    void api.fetchContents().then(setDisclosures);
  }, []);
  const disclosure = disclosures[0];

  return (
    <PortalLayout active="公开说明">
      <PortalBreadcrumb items={['首页', '公开说明']} />
      <div className="content-layout disclosure-layout">
        <aside className="category-list disclosure-directory">
          <h2>说明目录</h2>
          {['用户黑名单管理说明', '信息发布审核机制', '竞拍规则说明', '保证金缴纳与退还说明'].map((x, index) => <button className={index === 2 ? 'active' : ''} key={x} type="button">{x}</button>)}
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
      </div>
    </PortalLayout>
  );
}

export function LoginPage() {
  const login = () => {
    localStorage.setItem('portalEnterpriseLoggedIn', 'true');
    window.dispatchEvent(new Event('portal-enterprise-session-change'));
    navigateTo('/account');
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <div className="login-brand">
          <span>矿</span>
          <h1>华宁矿产竞拍平台</h1>
        </div>
        <section className="login-card">
          <h2>企业用户登录</h2>
          <div className="login-alert">用户名或密码错误，请重新输入。</div>
          <label className="field login-field">
            <span>用户名</span>
            <input defaultValue="HN-MINING-2023" placeholder="请输入统一社会信用代码或账号" />
          </label>
          <label className="field login-field">
            <span>密码</span>
            <input defaultValue="password" placeholder="请输入密码" type="password" />
          </label>
          <label className="field login-field">
            <span>验证码</span>
            <div className="captcha-row">
              <input placeholder="输入右侧字符" />
              <button aria-label="刷新验证码" className="captcha-box" type="button">A7X2</button>
            </div>
          </label>
          <button className="btn primary login-submit" onClick={login} type="button">立即登录</button>
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
  const [notice, setNotice] = useState('请填写企业资料后提交审核。');
  const submitRegister = async () => {
    const form = document.querySelector<HTMLFormElement>('#enterprise-register-form');

    if (!form) {
      return;
    }

    try {
      await api.registerEnterprise(buildEnterprisePayload(new FormData(form)));
      setNotice('企业入驻资料已通过真实接口提交，状态为待审核。');
    } catch (error) {
      setNotice(`企业入驻提交失败：${getErrorMessage(error)}`);
    }
  };

  return (
    <PortalLayout active="企业入驻">
      <div className="register-page">
        <header className="register-head">
          <h1>企业入驻</h1>
          <RegisterSteps />
        </header>
        <p className="register-notice">{notice}</p>
        <LongForm
          formId="enterprise-register-form"
          groups={[
            ['账号信息', [['username', '用户名'], ['password', '设置密码'], ['confirmPassword', '确认密码']]],
            ['企业基础信息', [['avatar', '企业头像'], ['name', '企业名'], ['unifiedSocialCreditCode', '统一社会信用代码'], ['registeredCapital', '注册资本'], ['mainCategory', '主营分类'], ['userCategory', '用户类别'], ['userType', '用户类型'], ['region', '所属区域'], ['address', '详细地址']]],
            ['法人及联系人', [['contactPerson', '联系人'], ['contactPhone', '联系电话'], ['legalRepresentative', '法人代表'], ['legalRepresentativeIdNo', '身份证号'], ['email', '电子邮件']]],
            ['经营信息', [['companyProfile', '公司简介'], ['businessScope', '经营范围']]],
            ['附件材料', [['businessLicenseFileUrl', '营业执照'], ['qualificationFileUrl', '企业资质']]],
            ['付款银行账户', [['paymentBankAccount', '付款银行账户'], ['paymentAccountName', '付款账户名称'], ['paymentBankName', '付款账户开户行'], ['paymentBankLineNo', '付款人行行号'], ['paymentIsBankOfChina', '付款账户是否中行']]],
            ['收款银行账户', [['receivingBankAccount', '收款银行账户'], ['receivingAccountName', '收款账户名称'], ['receivingBankName', '收款账户开户行'], ['receivingBankLineNo', '收款人行行号'], ['receivingIsBankOfChina', '收款账户是否中行']]],
            ['协议确认', [['captcha', '图形验证码'], ['agreementAccepted', '入驻协议确认']]],
          ]}
          onSubmit={submitRegister}
        />
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
          <div className="live-auction-main">
            <StatusTag value={lot.status} />
            <h2>{lot.title}</h2>
            <p>{lot.productInfo || lot.productDetail || '竞价标的正在公开报价，企业可进入详情页查看当前最高价和竞价规则。'}</p>
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
      {lots.length === 0 ? <div className="empty-state">暂无正在竞价标的</div> : null}
    </div>
  );
}

function NoticeDetailPage({ lot, notice, onDepositSubmit }: { lot: Lot; notice: string; onDepositSubmit: () => void }) {
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
              <button className={index === 0 ? 'active' : ''} key={section} type="button">{section}</button>
            ))}
          </div>
          <section className="portal-article-block">
            <h2>一、 矿区基本情况</h2>
            <p>{lot.productDetail || lot.productInfo || '该拍品由平台公开发布，竞买人需按公告、竞拍规则和保证金缴纳说明完成资格手续后参与报价。'}</p>
            <h2>二、 客户须知</h2>
            <p>{lot.customerNotice || '竞买企业需完成企业认证，并在公示期结束前提交意向金付款凭证。平台审核通过后，方可参与对应标的竞价。'}</p>
            <h2>三、 竞拍规则</h2>
            <p>{lot.auctionRule || '竞价期内按后台配置的加价幅度和加价次数进行报价，系统以服务器收到报价的时间作为报价顺序。'}</p>
            <h2>四、 保证金缴纳说明</h2>
            <p>{lot.depositInstruction || '保证金需汇入平台指定账户，上传付款凭证后等待平台审核。未成交企业按平台退款流程办理。'}</p>
          </section>
          <section className="attachment-list notice-attachments">
            {['矿产资源勘查报告.pdf', '竞买申请书模板.docx', '保证金缴纳账户说明.pdf'].map((item) => (
              <button className="attachment-row" key={item} type="button">
                <span>{item}</span>
                <strong>下载</strong>
              </button>
            ))}
          </section>
        </article>
        <aside className="qualification-card">
          <h2>意向金资格</h2>
          <span className="status-tag blue">待上传意向金凭证</span>
          <p>{notice}</p>
          <div className="qualification-alert">请在公示期结束前完成保证金缴纳并上传付款凭证，逾期将无法参与竞价。</div>
          <dl>
            <div><dt>保证金金额</dt><dd>{lot.deposit}</dd></div>
            <div><dt>缴纳账户</dt><dd>华宁矿产资源交易中心保证金专户</dd></div>
          </dl>
          <button className="btn primary" onClick={onDepositSubmit} type="button">上传意向金付款凭证</button>
          <button className="btn secondary" onClick={() => navigateTo('/announcements/upcoming')} type="button">返回列表</button>
        </aside>
      </div>
    </div>
  );
}

function AuctionDetailView({
  bidRecords,
  estimatedAmount,
  incrementTimes,
  isRealLot,
  lot,
  notice,
  onBidSubmit,
  onIncrementTimesChange,
  onRefresh,
}: {
  bidRecords: BidRecord[];
  estimatedAmount: string;
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
            estimatedAmount={estimatedAmount}
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

function AuctionGallery({ lot }: { lot: Lot }) {
  return (
    <div className="auction-gallery" aria-label="拍品图片">
      <div className="gallery-main">
        <span>{lot.category}</span>
        <strong>主矿区航拍图</strong>
      </div>
      <div className="gallery-thumb core">岩芯样本</div>
      <div className="gallery-thumb more">查看全部</div>
    </div>
  );
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
        <button className="active" type="button">标的物详情</button>
        <button type="button">相关附件 ({attachments.length})</button>
        <button type="button">竞买须知</button>
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
            <button className="attachment-row" key={item} type="button">
              <span>{item}</span>
              <strong>下载</strong>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function BiddingPanel({
  bidIncrement,
  bidRecordCount,
  estimatedAmount,
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
  estimatedAmount: string;
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
          <strong>{lot.countdown}</strong>
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
        <button className="btn primary" disabled={!isRealLot} onClick={onBidSubmit} type="button">确认出价</button>
      </div>
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
  onSubmit,
}: {
  formId: string;
  groups: Array<[string, Array<[string, string]>]>;
  onSubmit: () => void;
}) {
  return (
    <form className="long-form" id={formId}>
      {groups.map(([title, fields]) => (
        <fieldset key={title}>
          <legend>{title}</legend>
          <div className="form-grid">
            {fields.map(([name, label]) => (
              <RegisterField key={name} label={label} name={name} />
            ))}
          </div>
        </fieldset>
      ))}
      <div className="sticky-actions">
        <div className="button-row">
          <button className="btn secondary" type="button">保存草稿</button>
          <button className="btn primary" onClick={onSubmit} type="button">提交审核</button>
          <button className="btn secondary" onClick={() => navigateTo('/login')} type="button">返回登录</button>
        </div>
      </div>
    </form>
  );
}

function RegisterField({ label, name }: { label: string; name: string }) {
  if (name === 'avatar') {
    return (
      <label className="field register-upload compact-upload">
        <span>{label}</span>
        <input name={name} type="hidden" value={getEnterpriseDefault(name)} />
        <button type="button">上传头像</button>
        <small>建议尺寸 200x200px，支持 JPG/PNG</small>
      </label>
    );
  }

  if (name === 'businessLicenseFileUrl' || name === 'qualificationFileUrl') {
    return (
      <label className="field register-upload">
        <span>{label}</span>
        <input name={name} type="hidden" value={getEnterpriseDefault(name)} />
        <button type="button">选择文件</button>
        <small>支持 JPG/PNG/PDF，文件大小不超过 5MB</small>
      </label>
    );
  }

  if (name === 'agreementAccepted') {
    return (
      <label className="field register-agreement">
        <input defaultChecked name={name} type="checkbox" value="是" />
        <span>我已阅读并同意《华宁矿产竞拍平台企业入驻协议》《隐私政策》及相关交易规则。</span>
      </label>
    );
  }

  const inputType = name.toLowerCase().includes('password') ? 'password' : 'text';

  return (
    <label className="field">
      <span>{label}</span>
      <input defaultValue={getEnterpriseDefault(name)} name={name} placeholder={`请输入${label}`} type={inputType} />
    </label>
  );
}

function buildEnterprisePayload(formData: FormData): EnterpriseRegisterPayload {
  return {
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
    paymentIsBankOfChina: getFormValue(formData, 'paymentIsBankOfChina') !== '否',
    receivingBankAccount: getFormValue(formData, 'receivingBankAccount'),
    receivingAccountName: getFormValue(formData, 'receivingAccountName'),
    receivingBankName: getFormValue(formData, 'receivingBankName'),
    receivingBankLineNo: getFormValue(formData, 'receivingBankLineNo'),
    receivingIsBankOfChina: getFormValue(formData, 'receivingIsBankOfChina') !== '否',
    agreementAccepted: getFormValue(formData, 'agreementAccepted') !== '否',
    qualificationFileUrl: getFormValue(formData, 'qualificationFileUrl'),
    businessLicenseFileUrl: getFormValue(formData, 'businessLicenseFileUrl'),
  };
}

function getEnterpriseDefault(name: string): string {
  const defaults: Record<string, string> = {
    username: 'enterprise_demo',
    password: 'password',
    confirmPassword: 'password',
    avatar: 'https://files.example.com/avatar.png',
    name: 'T14华宁验收企业',
    mainCategory: '矿产品贸易',
    userCategory: '企业',
    userType: '采购企业',
    registeredCapital: '10000000',
    region: '云南省玉溪市华宁县',
    address: '华宁县验收工业园区1号',
    unifiedSocialCreditCode: `T14${Date.now()}`,
    contactPerson: '张三',
    contactPhone: '13800000000',
    legalRepresentative: '李四',
    legalRepresentativeIdNo: '530424199001010000',
    email: 'enterprise@example.com',
    companyProfile: 'T14 验收企业资料。',
    businessScope: '矿产品采购、销售与相关服务。',
    qualificationFileUrl: 'https://files.example.com/qualification.pdf',
    businessLicenseFileUrl: 'https://files.example.com/license.pdf',
    paymentBankAccount: '6217000000000000001',
    paymentAccountName: 'T14华宁验收企业',
    paymentBankName: '中国银行华宁支行',
    paymentBankLineNo: '104731000001',
    paymentIsBankOfChina: '是',
    receivingBankAccount: '6217000000000000002',
    receivingAccountName: 'T14华宁验收企业',
    receivingBankName: '中国银行华宁支行',
    receivingBankLineNo: '104731000001',
    receivingIsBankOfChina: '是',
    captcha: '0000',
    agreementAccepted: '是',
  };

  return defaults[name] ?? '';
}

function getFormValue(formData: FormData, key: string): string {
  return String(formData.get(key) ?? '').trim();
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '未知错误';
}

function isLocalMockLot(lot: Lot): boolean {
  return api.getLots().some((mockLot) => mockLot.id === lot.id);
}

function isPositiveInteger(value: string): boolean {
  return /^[1-9]\d*$/.test(value);
}

function parseMoney(value: string): string {
  return value.replace(/[^\d.]/g, '') || '0';
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
