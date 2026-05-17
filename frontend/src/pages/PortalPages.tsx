import { ButtonRow } from '../components/Button';
import { LotCard, SectionHeader, StatCards } from '../components/Cards';
import { DataTable } from '../components/DataTable';
import { FilterBar } from '../components/FilterBar';
import { PortalLayout } from '../components/Layouts';
import { StatusTag } from '../components/StatusTag';
import { api } from '../services/api';
import type { Lot, ResultRecord, TableColumn } from '../types';

const lotColumns: TableColumn<Lot>[] = [
  { key: 'title', label: '拍品标题', width: '28%' },
  { key: 'startPrice', label: '起拍价' },
  { key: 'quantity', label: '数量' },
  { key: 'category', label: '品种/品位' },
  { key: 'publicityPeriod', label: '公示期' },
  { key: 'auctionTime', label: '竞拍时间' },
  { key: 'deposit', label: '保证金金额' },
  { key: 'status', label: '状态', render: (row) => <StatusTag value={row.status} /> },
  { key: 'actions', label: '操作', render: () => <button className="link-btn" type="button">查看公告</button> },
];

const resultColumns: TableColumn<ResultRecord>[] = [
  { key: 'lotTitle', label: '成交拍品', width: '40%' },
  { key: 'winner', label: '中标企业名称' },
  { key: 'finalPrice', label: '最终成交价' },
  { key: 'publicTime', label: '公示时间' },
  { key: 'actions', label: '操作', render: () => <button className="link-btn" type="button">查看详情</button> },
];

export function PortalHome() {
  const liveLots = api.getLots().filter((lot) => lot.status === '竞拍中');
  const upcomingLots = api.getLots().filter((lot) => lot.status === '公示中');
  return (
    <PortalLayout active="首页">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">华宁国企矿产资源公开交易服务</span>
          <h1>华宁矿产竞拍平台</h1>
          <p>集中展示矿产资源、拍卖公告、在线竞价入口与成交公示，支撑企业认证、意向金审核和竞价全流程留痕。</p>
          <div className="search-line">
            <input placeholder="搜索拍品名称、供应商、产地" />
            <button type="button">搜索</button>
          </div>
        </div>
        <div className="hero-notice">
          <strong>交易提醒</strong>
          <p>企业参与竞价前需完成认证，并通过对应拍品意向金凭证审核。</p>
          <ButtonRow actions={[{ label: '查看即将拍卖', tone: 'primary' }, { label: '企业入驻', tone: 'secondary' }]} />
        </div>
      </section>
      <StatCards stats={api.getStats()} />
      <section className="two-column">
        <div>
          <SectionHeader title="即将拍卖公告" action="查看更多" />
          <DataTable columns={lotColumns.slice(0, 6)} rows={upcomingLots} />
        </div>
        <div>
          <SectionHeader title="正在竞价" action="查看更多" />
          <div className="stack-list">
            {liveLots.map((lot) => <LotCard action="进入竞价" key={lot.id} lot={lot} />)}
          </div>
        </div>
      </section>
      <section>
        <SectionHeader title="成交公示" action="查看更多" />
        <DataTable columns={resultColumns} rows={api.getResults()} />
      </section>
    </PortalLayout>
  );
}

export function UpcomingList() {
  return (
    <PortalLayout active="即将拍卖">
      <PageTitle title="即将拍卖公告" subtitle="展示处于公示期的矿产拍品公告，企业可查看规则并提交意向金凭证。" />
      <FilterBar fields={['关键词', '品种/品位', '竞拍时间', '公示状态']} />
      <DataTable columns={lotColumns} rows={api.getLots().filter((lot) => lot.status === '公示中')} />
    </PortalLayout>
  );
}

export function UpcomingDetail() {
  const lot = api.getLot();
  return (
    <PortalLayout active="即将拍卖">
      <PageTitle title="即将拍卖公告详情" subtitle="首页 / 即将拍卖 / 公告详情" />
      <DetailHero lot={lot} mode="公告" />
      <InfoTabs sections={['商品信息', '客户须知', '竞拍规则', '保证金缴纳说明', '相关附件', '检测报告']} />
    </PortalLayout>
  );
}

export function LiveAuctionList() {
  return (
    <PortalLayout active="正在竞价">
      <PageTitle title="正在竞价标的" subtitle="查看竞拍期标的、当前最高价与倒计时。" />
      <FilterBar fields={['关键词', '品种/品位', '竞拍时间', '状态']} />
      <div className="card-grid">
        {api.getLots().filter((lot) => lot.status === '竞拍中').map((lot) => <LotCard action="进入竞价" key={lot.id} lot={lot} />)}
      </div>
    </PortalLayout>
  );
}

export function AuctionDetail() {
  const lot = api.getLot();
  return (
    <PortalLayout active="正在竞价">
      <div className="process-bar">
        {['浏览公告', '参与报名', '缴纳保证金', '出价竞拍', '竞拍成功', '线下签约', '支付尾款', '完成确认'].map((step, index) => (
          <span className={index <= 3 ? 'done' : ''} key={step}>{step}</span>
        ))}
      </div>
      <DetailHero lot={lot} mode="竞价" />
      <section className="detail-grid">
        <div>
          <SectionHeader title="出价记录" subtitle="全部出价记录企业名称脱敏展示" />
          <DataTable
            columns={[
              { key: 'maskedEnterprise', label: '出价企业' },
              { key: 'amount', label: '出价金额' },
              { key: 'incrementTimes', label: '加价次数' },
              { key: 'bidTime', label: '出价时间' },
              { key: 'isHighest', label: '当前最高价', render: (row) => <StatusTag value={row.isHighest ? '是' : '否'} tone={row.isHighest ? 'green' : 'gray'} /> },
            ]}
            rows={api.getBids() as unknown as Record<string, unknown>[]}
          />
        </div>
        <InfoTabs sections={['商品详情', '相关附件', '检测报告']} />
      </section>
    </PortalLayout>
  );
}

export function ResultList() {
  return (
    <PortalLayout active="成交公示">
      <PageTitle title="成交公示" subtitle="公开展示成交拍品、中标企业名称和最终成交价。" />
      <FilterBar fields={['关键词', '成交时间', '品种/品位']} />
      <DataTable columns={resultColumns} rows={api.getResults()} />
    </PortalLayout>
  );
}

export function ResultDetail() {
  const result = api.getResults()[0];
  return (
    <PortalLayout active="成交公示">
      <PageTitle title="成交公示详情" subtitle="首页 / 成交公示 / 公示详情" />
      <section className="result-panel">
        <span className="eyebrow">成交结果</span>
        <h2>{result.lotTitle}</h2>
        <dl className="summary-list">
          <div><dt>中标企业名称</dt><dd>{result.winner}</dd></div>
          <div><dt>最终成交价</dt><dd className="price">{result.finalPrice}</dd></div>
          <div><dt>公示时间</dt><dd>{result.publicTime}</dd></div>
        </dl>
        <ButtonRow actions={[{ label: '返回列表' }, { label: '查看拍品信息', tone: 'primary' }]} />
      </section>
    </PortalLayout>
  );
}

export function NewsList() {
  return (
    <PortalLayout active="信息资讯">
      <PageTitle title="信息资讯" subtitle="政策法规、交易公告、矿能动态集中公开。" />
      <div className="content-layout">
        <aside className="category-list">{['政策法规', '交易公告', '矿能动态'].map((x) => <button key={x} type="button">{x}</button>)}</aside>
        <div>
          <FilterBar fields={['关键词']} />
          <DataTable
            columns={[
              { key: 'title', label: '标题', width: '42%' },
              { key: 'category', label: '分类' },
              { key: 'summary', label: '摘要' },
              { key: 'publishedAt', label: '发布时间' },
              { key: 'actions', label: '操作', render: () => <button className="link-btn" type="button">查看详情</button> },
            ]}
            rows={api.getContents() as unknown as Record<string, unknown>[]}
          />
        </div>
      </div>
    </PortalLayout>
  );
}

export function NewsDetail() {
  const article = api.getContents()[0];
  return (
    <PortalLayout active="信息资讯">
      <article className="article-page">
        <span className="eyebrow">{article.category}</span>
        <h1>{article.title}</h1>
        <p className="muted">发布时间：{article.publishedAt}</p>
        <p>为进一步规范矿产资源交易信息公开，平台对拍品公告、公示、竞价、成交结果等关键环节进行统一展示和状态留痕。</p>
        <p>企业用户应根据公告要求完成认证、意向金缴纳和凭证上传，平台审核通过后方可参与对应拍品竞价。</p>
        <ButtonRow actions={[{ label: '返回列表' }]} />
      </article>
    </PortalLayout>
  );
}

export function DisclosurePage() {
  return (
    <PortalLayout active="公开说明">
      <PageTitle title="公开说明" subtitle="平台规则、保证金、黑名单和信息发布机制说明。" />
      <div className="content-layout">
        <aside className="category-list">
          {['用户黑名单管理说明', '信息发布审核机制', '竞拍规则说明', '保证金缴纳与退还说明'].map((x) => <button key={x} type="button">{x}</button>)}
        </aside>
        <article className="article-card">
          <h2>竞拍规则说明</h2>
          <p>竞拍期内，仅企业认证通过且对应拍品意向金审核通过的企业可报价。用户只能看到当前最高价，不显示最高价企业名称。</p>
          <p>报价需符合后台配置的加价幅度和加价次数规则，系统以服务器收到报价的时间作为报价顺序。</p>
        </article>
      </div>
    </PortalLayout>
  );
}

export function LoginPage() {
  return (
    <div className="login-page">
      <section className="login-card">
        <div className="brand-mark">
          <span>矿</span>
          <div>
            <strong>华宁矿产竞拍平台</strong>
            <small>企业用户登录</small>
          </div>
        </div>
        <label className="field"><span>用户名</span><input placeholder="请输入用户名" /></label>
        <label className="field"><span>密码</span><input placeholder="请输入密码" type="password" /></label>
        <label className="field"><span>图形验证码</span><input placeholder="请输入验证码" /></label>
        <ButtonRow actions={[{ label: '登录', tone: 'primary' }, { label: '企业入驻' }, { label: '返回首页', tone: 'ghost' }]} />
        <p className="form-tip">账号已被限制时提示：账号已被限制，请联系平台客服。</p>
      </section>
    </div>
  );
}

export function EnterpriseRegisterPage() {
  return (
    <PortalLayout active="企业入驻">
      <PageTitle title="企业入驻" subtitle="填写资料、提交审核、平台审核、认证通过。" />
      <LongForm
        groups={[
          ['账号信息', ['用户名', '设置密码', '确认密码', '头像']],
          ['企业基础信息', ['企业名', '主营分类', '用户类别', '用户类型', '注册资本', '所属区域', '详细地址', '统一社会信用代码']],
          ['法人及联系人', ['联系人', '联系电话', '法人代表', '身份证号', '电子邮件']],
          ['经营信息', ['公司简介', '经营范围', '企业资质', '营业执照']],
          ['付款银行账户', ['付款银行账户', '付款账户名称', '付款账户开户行', '付款人行行号', '付款账户是否中行']],
          ['收款银行账户', ['收款银行账户', '收款账户名称', '收款账户开户行', '收款人行行号', '收款账户是否中行']],
          ['协议确认', ['图形验证码', '入驻协议确认']],
        ]}
        actions={[{ label: '保存' }, { label: '提交审核', tone: 'primary' }, { label: '返回登录' }]}
      />
    </PortalLayout>
  );
}

function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <section className="page-title">
      <h1>{title}</h1>
      {subtitle ? <p>{subtitle}</p> : null}
    </section>
  );
}

function DetailHero({ lot, mode }: { lot: Lot; mode: '公告' | '竞价' }) {
  return (
    <section className="detail-hero">
      <div className="detail-image"><span>{lot.category}</span></div>
      <div className="detail-info">
        <div className="lot-title-row">
          <h1>{lot.title}</h1>
          <StatusTag value={lot.status} />
        </div>
        <dl className="summary-list">
          <div><dt>起拍价</dt><dd>{lot.startPrice}</dd></div>
          <div><dt>当前最高价</dt><dd className="price">{lot.currentPrice}</dd></div>
          <div><dt>数量</dt><dd>{lot.quantity}</dd></div>
          <div><dt>保证金</dt><dd>{lot.deposit}</dd></div>
          <div><dt>竞拍时间</dt><dd>{lot.auctionTime}</dd></div>
          <div><dt>倒计时</dt><dd className="price">{lot.countdown}</dd></div>
        </dl>
      </div>
      <aside className="action-card">
        <strong>{mode === '竞价' ? '出价操作区' : '意向金资格'}</strong>
        <p>{mode === '竞价' ? '当前企业已通过认证和意向金审核，可按加价幅度报价。' : '企业认证通过后，可上传意向金付款凭证。'}</p>
        {mode === '竞价' ? <input placeholder="请输入报价金额" /> : null}
        <ButtonRow
          actions={mode === '竞价'
            ? [{ label: '刷新当前价' }, { label: '确认出价', tone: 'primary' }]
            : [{ label: '上传意向金付款凭证', tone: 'primary' }, { label: '返回列表' }]}
        />
      </aside>
    </section>
  );
}

function InfoTabs({ sections }: { sections: string[] }) {
  return (
    <section className="tabs-card">
      <div className="tabs">{sections.map((section, index) => <button className={index === 0 ? 'active' : ''} key={section} type="button">{section}</button>)}</div>
      <div className="tab-content">
        <h3>{sections[0]}</h3>
        <p>展示平台发布的拍品说明、客户须知、规则条款、附件和检测报告。页面仅展示前端结构，具体内容由后端接口返回。</p>
      </div>
    </section>
  );
}

function LongForm({ groups, actions }: { groups: Array<[string, string[]]>; actions: Parameters<typeof ButtonRow>[0]['actions'] }) {
  return (
    <form className="long-form">
      {groups.map(([title, fields]) => (
        <fieldset key={title}>
          <legend>{title}</legend>
          <div className="form-grid">
            {fields.map((field) => (
              <label className="field" key={field}>
                <span>{field}</span>
                <input placeholder={`请输入${field}`} />
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <div className="sticky-actions"><ButtonRow actions={actions} /></div>
    </form>
  );
}
