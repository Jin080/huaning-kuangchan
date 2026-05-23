import { useEffect, useState, type ReactNode } from 'react';

import { navigateTo } from '../navigation';
import { api } from '../services/api';
import { AUTH_SESSION_EVENT, getAuthProfile, getAuthToken, isLoggedInAs, type AuthProfile, type AuthRole } from '../services/auth';
import { ForbiddenState, LoginRequiredState } from './StatusViews';

const portalNav = ['首页', '矿产资源', '即将拍卖', '正在竞价', '成交公示', '信息资讯', '公开说明'];
const adminNav = ['首页看板', '拍品管理', '审核管理', '交易管理', '企业管理', '内容运营', '系统审计'];
const accountNav = ['中心首页', '我的企业认证', '我的意向金', '我的出价记录', '我的通知'];
const accountIconByNav: Record<string, string> = {
  中心首页: '▦',
  我的企业认证: '✓',
  我的意向金: '￥',
  我的出价记录: '槌',
  我的通知: '信',
};
const adminIconByNav: Record<string, string> = {
  首页看板: '▦',
  拍品管理: '◆',
  审核管理: '✓',
  交易管理: '￥',
  企业管理: '企',
  内容运营: '文',
  系统审计: '盾',
};

const portalPathByNav: Record<string, string> = {
  首页: '/',
  矿产资源: '/resources',
  即将拍卖: '/announcements/upcoming',
  正在竞价: '/auctions/live',
  成交公示: '/results',
  信息资讯: '/news',
  公开说明: '/disclosures',
};

const adminPathByNav: Record<string, string> = {
  首页看板: '/admin/dashboard',
  拍品管理: '/admin/lots',
  审核管理: '/admin/reviews',
  交易管理: '/admin/bids',
  企业管理: '/admin/blacklist',
  内容运营: '/admin/content',
  系统审计: '/admin/logs',
};
const adminLotLinks = [
  { label: '拍品列表', path: '/admin/lots' },
  { label: '全流程总览', path: '/admin/lots/workflow' },
  { label: '履约推进', path: '/admin/lots/progress' },
] as const;
const adminReviewLinks = [
  { label: '审核管理中心', path: '/admin/reviews', countKey: undefined },
  { label: '拍品发布审核', path: '/admin/reviews/lots', countKey: 'lotReviews' },
  { label: '企业认证审核', path: '/admin/reviews/enterprises', countKey: 'enterpriseReviews' },
  { label: '意向金凭证审核', path: '/admin/reviews/deposits', countKey: 'depositReviews' },
  { label: '异常归档线索', path: '/admin/reviews/lot-close', countKey: undefined },
] as const;
const adminTransactionLinks = [
  { label: '竞价记录管理', path: '/admin/bids' },
  { label: '成交结果管理', path: '/admin/results' },
  { label: '合同履约核验', path: '/admin/contracts' },
  { label: '退款状态管理', path: '/admin/refunds' },
] as const;
const ADMIN_LIST_REFRESH_EVENT = 'admin-list-refresh';
const adminAuditLinks = [
  { label: '结拍调度', path: '/admin/auction-closing' },
  { label: '操作日志', path: '/admin/logs' },
] as const;

const accountPathByNav: Record<string, string> = {
  中心首页: '/account',
  我的企业认证: '/account/certification',
  我的意向金: '/account/deposits',
  我的出价记录: '/account/bids',
  我的通知: '/account/messages',
};

type PortalSession = {
  loggedIn: boolean;
  enterpriseName: string;
  certificationStatus: string;
  roleCode?: AuthRole;
};

const defaultPortalSession: PortalSession = {
  loggedIn: false,
  enterpriseName: '企业中心',
  certificationStatus: '开发认证',
};

export function PortalLayout({ active, children }: { active: string; children: ReactNode }) {
  const [session, setSession] = useState<PortalSession>(() => getPortalSession());

  useEffect(() => {
    let cancelled = false;

    const syncSession = () => {
      const currentSession = getPortalSession();
      setSession(currentSession);

      if (!currentSession.loggedIn || currentSession.roleCode !== 'ENTERPRISE') {
        return;
      }

      void api.fetchAccountProfile().then((profile) => {
        if (cancelled || !isLoggedInAs('ENTERPRISE')) {
          return;
        }

        setSession({
          loggedIn: true,
          enterpriseName: profile.enterpriseName || '企业中心',
          certificationStatus: profile.certificationStatus || '开发认证',
        });
      }).catch(() => {
        if (!cancelled) {
          setSession((current) => ({ ...current, loggedIn: true }));
        }
      });
    };

    syncSession();
    window.addEventListener(AUTH_SESSION_EVENT, syncSession);
    window.addEventListener('focus', syncSession);
    window.addEventListener('storage', syncSession);

    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_SESSION_EVENT, syncSession);
      window.removeEventListener('focus', syncSession);
      window.removeEventListener('storage', syncSession);
    };
  }, []);

  const logout = () => {
    void api.logout('ENTERPRISE');
    navigateTo('/');
  };

  return (
    <div className="app-shell portal-shell">
      <header className="portal-header">
        <div className="portal-header-inner">
          <div className="portal-brand" onClick={() => navigateTo('/')} role="button" tabIndex={0}>
            华宁矿产竞拍平台
          </div>
          <nav>
            {portalNav.map((item) => (
              <button className={item === active ? 'active' : ''} key={item} onClick={() => navigateTo(portalPathByNav[item])} type="button">
                {item}
              </button>
            ))}
          </nav>
          <div className="header-actions">
            <label className="header-search">
              <span aria-hidden="true">⌕</span>
              <input placeholder="搜索资源/公告..." />
            </label>
            {session.loggedIn ? (
              <div className="portal-session">
                <button className="portal-session-entry" onClick={() => navigateTo('/account')} type="button">
                  <strong>{session.enterpriseName}</strong>
                  <span>{session.certificationStatus}</span>
                </button>
                <button className="portal-session-logout" onClick={logout} type="button">退出</button>
              </div>
            ) : (
              <>
                <button onClick={() => navigateTo('/login')} type="button">登录</button>
                <button className="solid" onClick={() => navigateTo('/enterprise/register')} type="button">企业入驻</button>
              </>
            )}
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="portal-footer">
        <div>
          <strong>华宁矿产竞拍平台</strong>
          <nav aria-label="页脚导航">
            {['关于我们', '法律法规', '竞买指南', '安全协议', '联系我们'].map((item) => (
              <button key={item} onClick={() => navigateTo('/disclosures')} type="button">{item}</button>
            ))}
          </nav>
          <p>© 2026 华宁矿产资源交易中心 版权所有 | 滇ICP备12345678号</p>
        </div>
      </footer>
    </div>
  );
}

export function AdminLayout({ active, subActive, children }: { active: string; subActive?: string; children: ReactNode }) {
  const [profile, setProfile] = useState<AuthProfile | null>(() => getAuthProfile('ADMIN'));
  const [reviewCounts, setReviewCounts] = useState({ lotReviews: 0, enterpriseReviews: 0, depositReviews: 0 });
  const isAuthenticated = Boolean(getAuthToken('ADMIN') && profile);
  const isAdmin = isAuthenticated && profile?.roleCode === 'ADMIN';

  useEffect(() => {
    const syncProfile = () => setProfile(getAuthProfile('ADMIN'));

    window.addEventListener(AUTH_SESSION_EVENT, syncProfile);
    window.addEventListener('storage', syncProfile);
    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, syncProfile);
      window.removeEventListener('storage', syncProfile);
    };
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }

    const loadReviewCounts = () => {
      void api.fetchAdminTodoCounts().then(setReviewCounts).catch(() => undefined);
    };

    loadReviewCounts();
    window.addEventListener(ADMIN_LIST_REFRESH_EVENT, loadReviewCounts);

    return () => window.removeEventListener(ADMIN_LIST_REFRESH_EVENT, loadReviewCounts);
  }, [isAdmin]);

  if (!isAuthenticated || !isAdmin) {
    return (
      <RoleGuardLayout
        message={isAuthenticated ? '当前账号无权访问管理后台，请使用管理员账号登录。' : '请先登录管理员账号后访问管理后台。'}
        primaryTo="/admin/login"
        primaryLabel="去登录"
        secondaryLabel="返回首页"
        variant={isAuthenticated ? 'forbidden' : 'login'}
      />
    );
  }

  const logout = () => {
    void api.logout('ADMIN');
    navigateTo('/admin/login');
  };

  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span>华</span>
          <div>
            <strong>华宁矿产</strong>
            <small>系统管理后台</small>
          </div>
        </div>
        <nav>
          {adminNav.map((item) => (
            <div className="sidebar-nav-group" key={item}>
              <button className={item === active ? 'active' : ''} onClick={() => navigateTo(adminPathByNav[item])} type="button">
                <span className="nav-dot">{adminIconByNav[item]}</span>
                {item}
              </button>
              {item === active && item === '拍品管理' ? (
                <div className="sidebar-subnav" aria-label="拍品管理入口">
                  {adminLotLinks.map((link) => (
                    <button className={link.label === subActive ? 'active' : ''} key={link.label} onClick={() => navigateTo(link.path)} type="button">
                      <span>{link.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              {item === active && item === '审核管理' ? (
                <div className="sidebar-subnav" aria-label="审核管理入口">
                  {adminReviewLinks.map((link) => {
                    const count = link.countKey ? reviewCounts[link.countKey] : 0;

                    return (
                      <button className={link.label === subActive ? 'active' : ''} key={link.label} onClick={() => navigateTo(link.path)} type="button">
                        <span>{link.label}</span>
                        {count > 0 ? <em>{count}</em> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              {item === active && item === '交易管理' ? (
                <div className="sidebar-subnav" aria-label="交易管理入口">
                  {adminTransactionLinks.map((link) => (
                    <button className={link.label === subActive ? 'active' : ''} key={link.label} onClick={() => navigateTo(link.path)} type="button">
                      <span>{link.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
              {item === active && item === '系统审计' ? (
                <div className="sidebar-subnav" aria-label="系统审计入口">
                  {adminAuditLinks.map((link) => (
                    <button className={link.label === subActive ? 'active' : ''} key={link.label} onClick={() => navigateTo(link.path)} type="button">
                      <span>{link.label}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </nav>
        <div className="sidebar-user">
          <span>A</span>
          <div>
            <strong>{profile.username}</strong>
            <small>{profile.roleName}</small>
          </div>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="admin-breadcrumb">首页 › {active}{subActive ? ` › ${subActive}` : ''}</span>
            <strong>{subActive ?? active}</strong>
          </div>
          <div>
            <button onClick={() => navigateTo('/admin/notifications')} type="button">通知</button>
            <button onClick={logout} type="button">退出</button>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}

export function AccountLayout({ active, children }: { active: string; children: ReactNode }) {
  const [profile, setProfile] = useState<AuthProfile | null>(() => getAuthProfile('ENTERPRISE'));
  const isAuthenticated = Boolean(getAuthToken('ENTERPRISE') && profile);
  const isEnterprise = isAuthenticated && profile?.roleCode === 'ENTERPRISE';

  useEffect(() => {
    const syncProfile = () => setProfile(getAuthProfile('ENTERPRISE'));

    window.addEventListener(AUTH_SESSION_EVENT, syncProfile);
    window.addEventListener('storage', syncProfile);
    return () => {
      window.removeEventListener(AUTH_SESSION_EVENT, syncProfile);
      window.removeEventListener('storage', syncProfile);
    };
  }, []);

  if (!isAuthenticated || !isEnterprise) {
    return (
      <PortalLayout active="企业中心">
        <RoleGuardContent
          message={isAuthenticated ? '当前管理员账号不能访问企业中心，请切换企业账号。' : '请先登录企业账号后访问企业中心。'}
          primaryLabel="去登录"
          secondaryLabel="返回首页"
          variant={isAuthenticated ? 'forbidden' : 'login'}
        />
      </PortalLayout>
    );
  }

  return (
    <PortalLayout active="企业中心">
      <div className="account-shell">
        <aside className="account-menu">
          <div className="account-menu-head">
            <span>企</span>
            <div>
              <h3>企业中心</h3>
              <small>华宁矿产竞拍</small>
            </div>
          </div>
          {accountNav.map((item) => (
            <button className={item === active ? 'active' : ''} key={item} onClick={() => navigateTo(accountPathByNav[item])} type="button">
              <span>{accountIconByNav[item]}</span>
              {item}
            </button>
          ))}
          <div className="account-menu-foot">
            <strong>{profile.enterprise?.name ?? profile.username}</strong>
            <small>{profile.enterprise?.certificationStatus ?? profile.roleName}</small>
          </div>
        </aside>
        <section className="account-content">{children}</section>
      </div>
    </PortalLayout>
  );
}

function getPortalSession(): PortalSession {
  const profile = getAuthProfile('ENTERPRISE');

  if (!getAuthToken('ENTERPRISE') || !profile) {
    return defaultPortalSession;
  }

  if (profile.roleCode === 'ENTERPRISE') {
    return {
      loggedIn: true,
      enterpriseName: profile.enterprise?.name ?? profile.username,
      certificationStatus: profile.enterprise?.certificationStatus ?? '未提交',
      roleCode: profile.roleCode,
    };
  }

  return {
    loggedIn: true,
    enterpriseName: profile.username,
    certificationStatus: profile.roleName || '管理员',
    roleCode: profile.roleCode,
  };
}

function RoleGuardLayout({
  message,
  primaryLabel,
  primaryTo,
  secondaryLabel,
  variant,
}: {
  message: string;
  primaryLabel: string;
  primaryTo?: string;
  secondaryLabel: string;
  variant: 'login' | 'forbidden';
}) {
  return (
    <div className="admin-shell auth-guard-shell">
      <RoleGuardContent message={message} primaryLabel={primaryLabel} primaryTo={primaryTo} secondaryLabel={secondaryLabel} variant={variant} />
    </div>
  );
}

function RoleGuardContent({
  message,
  primaryLabel,
  primaryTo = '/login',
  secondaryLabel,
  variant,
}: {
  message: string;
  primaryLabel: string;
  primaryTo?: string;
  secondaryLabel: string;
  variant: 'login' | 'forbidden';
}) {
  const stateProps = {
    description: message,
    primaryAction: { label: primaryLabel, to: primaryTo },
    secondaryAction: { label: secondaryLabel, to: '/' },
  };

  return variant === 'forbidden'
    ? <div className="auth-guard-content"><ForbiddenState {...stateProps} /></div>
    : <div className="auth-guard-content"><LoginRequiredState {...stateProps} /></div>;
}
