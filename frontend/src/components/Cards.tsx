import type { Lot, Stat } from '../types';
import { navigateTo } from '../navigation';
import { ButtonRow } from './Button';
import { StatusTag } from './StatusTag';

export function StatCards({ stats }: { stats: Stat[] }) {
  return (
    <section className="stat-grid">
      {stats.map((stat, index) => (
        <article className={`stat-card ${stat.tone ?? 'blue'}`} key={stat.label}>
          <span><i aria-hidden="true">{['▥', '￥', '↺', '◈'][index] ?? '◇'}</i>{stat.label}</span>
          <strong>{splitStatValue(stat.value).value}<em>{splitStatValue(stat.value).unit}</em></strong>
          <small>{stat.helper}</small>
        </article>
      ))}
    </section>
  );
}

export function LotCard({ lot, action = '查看详情', actionTo, progress }: { lot: Lot; action?: string; actionTo?: string; progress?: number }) {
  const target = actionTo ?? (action.includes('竞价') ? `/auctions/live/detail?id=${lot.id}` : `/announcements/upcoming/detail?id=${lot.id}`);

  return (
    <article className="lot-card">
      <div className="lot-thumb">
        <span>{lot.category.split('/')[0]}</span>
      </div>
      <div className="lot-body">
        <div className="lot-title-row">
          <h3>{lot.title}</h3>
          <StatusTag value={lot.status} />
        </div>
        <div className="lot-price-row">
          <span>当前价</span>
          <strong>{lot.currentPrice}</strong>
        </div>
        {progress ? (
          <div className="lot-progress" aria-label="竞价热度">
            <span style={{ width: `${progress}%` }} />
          </div>
        ) : null}
        <dl className="meta-grid">
          <div>
            <dt>起拍价</dt>
            <dd>{lot.startPrice}</dd>
          </div>
          <div>
            <dt>当前价</dt>
            <dd>{lot.currentPrice}</dd>
          </div>
          <div>
            <dt>数量</dt>
            <dd>{lot.quantity}</dd>
          </div>
          <div>
            <dt>保证金</dt>
            <dd>{lot.deposit}</dd>
          </div>
          <div>
            <dt>供应商</dt>
            <dd>{lot.supplier}</dd>
          </div>
          <div>
            <dt>产地</dt>
            <dd>{lot.origin}</dd>
          </div>
        </dl>
        <ButtonRow actions={[{ label: action, tone: action.includes('竞价') ? 'primary' : 'secondary', to: target }]} />
      </div>
    </article>
  );
}

export function SectionHeader({ title, subtitle, action, actionTo, icon }: { title: string; subtitle?: string; action?: string; actionTo?: string; icon?: string }) {
  return (
    <div className="section-header">
      <div>
        <h2>{icon ? <span aria-hidden="true">{icon}</span> : null}{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {action ? <button className="text-link" onClick={actionTo ? () => navigateTo(actionTo) : undefined} type="button">{action}</button> : null}
    </div>
  );
}

function splitStatValue(value: string) {
  const matched = value.match(/^(.+?)(\s*[^\d\s,，.]+)$/);

  return {
    value: matched?.[1].trim() ?? value,
    unit: matched?.[2].trim() ?? '',
  };
}
