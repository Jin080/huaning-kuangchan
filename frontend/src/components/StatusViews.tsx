import type { CSSProperties, ReactNode } from 'react';

import { navigateTo } from '../navigation';
import type { Action } from '../types';

type StatusAction = Pick<Action, 'label' | 'tone' | 'to' | 'onClick' | 'disabled'>;
type StatusTone = 'blue' | 'gray' | 'red' | 'orange' | 'green';

type StatusViewProps = {
  icon: ReactNode;
  title: string;
  description: string;
  primaryAction?: StatusAction;
  secondaryAction?: StatusAction;
  tone?: StatusTone;
  compact?: boolean;
};

export function TableSkeleton({ columns = 5, rows = 5 }: { columns?: number; rows?: number }) {
  return (
    <div className="status-table-skeleton" aria-label="表格加载中" role="status" style={{ '--status-skeleton-columns': columns } as CSSProperties}>
      <div className="status-skeleton-row head">
        {Array.from({ length: columns }).map((_, index) => <span key={index} />)}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div className="status-skeleton-row" key={rowIndex}>
          {Array.from({ length: columns }).map((_, columnIndex) => <span key={columnIndex} />)}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="status-card-skeleton-grid" aria-label="卡片加载中" role="status">
      {Array.from({ length: count }).map((_, index) => (
        <article className="status-card-skeleton" key={index}>
          <span />
          <strong />
          <p />
          <p />
          <em />
        </article>
      ))}
    </div>
  );
}

export function EmptyState({
  title = '暂无相关数据',
  description = '当前条件下没有可展示的记录，可调整筛选条件后重新查看。',
  primaryAction,
  secondaryAction,
  compact,
}: Partial<Pick<StatusViewProps, 'title' | 'description' | 'primaryAction' | 'secondaryAction' | 'compact'>>) {
  return (
    <StatusView
      compact={compact}
      description={description}
      icon="—"
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
      title={title}
      tone="gray"
    />
  );
}

export function ErrorState({
  title = '加载失败',
  description = '数据暂时无法加载，请稍后重试。页面不会伪造成功状态。',
  primaryAction,
  secondaryAction,
  compact,
}: Partial<Pick<StatusViewProps, 'title' | 'description' | 'primaryAction' | 'secondaryAction' | 'compact'>>) {
  return (
    <StatusView
      compact={compact}
      description={description}
      icon="!"
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
      title={title}
      tone="red"
    />
  );
}

export function ForbiddenState({
  title = '无权访问',
  description = '当前账号没有访问该页面或功能的权限，请切换正确身份后再试。',
  primaryAction,
  secondaryAction,
  compact,
}: Partial<Pick<StatusViewProps, 'title' | 'description' | 'primaryAction' | 'secondaryAction' | 'compact'>>) {
  return (
    <StatusView
      compact={compact}
      description={description}
      icon="盾"
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
      title={title}
      tone="orange"
    />
  );
}

export function LoginRequiredState({
  title = '请先登录',
  description = '访问该页面需要登录后继续。',
  primaryAction,
  secondaryAction,
  compact,
}: Partial<Pick<StatusViewProps, 'title' | 'description' | 'primaryAction' | 'secondaryAction' | 'compact'>>) {
  return (
    <StatusView
      compact={compact}
      description={description}
      icon="钥"
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
      title={title}
      tone="blue"
    />
  );
}

export function PendingReviewState({
  title = '资料审核中',
  description = '您的资料已提交，平台管理员将在 1-3 个工作日内完成核验。',
  primaryAction,
  secondaryAction,
  compact,
}: Partial<Pick<StatusViewProps, 'title' | 'description' | 'primaryAction' | 'secondaryAction' | 'compact'>>) {
  return (
    <StatusView
      compact={compact}
      description={description}
      icon="待"
      primaryAction={primaryAction}
      secondaryAction={secondaryAction}
      title={title}
      tone="blue"
    />
  );
}

function StatusView({
  compact,
  description,
  icon,
  primaryAction,
  secondaryAction,
  title,
  tone = 'blue',
}: StatusViewProps) {
  const actions = [secondaryAction, primaryAction].filter(Boolean) as StatusAction[];

  return (
    <section className={`status-view ${tone} ${compact ? 'compact' : ''}`}>
      <span className="status-view-icon" aria-hidden="true">{icon}</span>
      <div className="status-view-copy">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {actions.length > 0 ? (
        <div className="status-view-actions">
          {actions.map((action, index) => (
            <button
              className={`btn ${action.tone ?? (index === actions.length - 1 ? 'primary' : 'secondary')}`}
              disabled={action.disabled}
              key={action.label}
              onClick={() => handleAction(action)}
              type="button"
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function handleAction(action: StatusAction) {
  if (action.to) {
    navigateTo(action.to);
    return;
  }

  action.onClick?.();
}
