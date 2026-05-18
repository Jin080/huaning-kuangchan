import type { ReactNode } from 'react';

import { navigateTo } from '../navigation';

const portalNav = ['首页', '矿产资源', '即将拍卖', '正在竞价', '成交公示', '信息资讯', '公开说明'];
const adminNav = ['首页看板', '拍品管理', '审核管理', '交易管理', '企业管理', '内容运营', '系统审计'];
const accountNav = ['中心首页', '我的企业认证', '我的意向金', '我的出价记录', '我的通知'];

const portalPathByNav: Record<string, string> = {
  首页: '/',
  矿产资源: '/announcements/upcoming',
  即将拍卖: '/announcements/upcoming',
  正在竞价: '/auctions/live',
  成交公示: '/results',
  信息资讯: '/news',
  公开说明: '/disclosures',
};

const adminPathByNav: Record<string, string> = {
  首页看板: '/admin/dashboard',
  拍品管理: '/admin/lots',
  审核管理: '/admin/reviews/lots',
  交易管理: '/admin/bids',
  企业管理: '/admin/blacklist',
  内容运营: '/admin/content',
  系统审计: '/admin/logs',
};

const accountPathByNav: Record<string, string> = {
  中心首页: '/account',
  我的企业认证: '/account/certification',
  我的意向金: '/account/deposits',
  我的出价记录: '/account/bids',
  我的通知: '/account/messages',
};

export function PortalLayout({ active, children }: { active: string; children: ReactNode }) {
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
            <button onClick={() => navigateTo('/login')} type="button">登录</button>
            <button className="solid" onClick={() => navigateTo('/enterprise/register')} type="button">企业入驻</button>
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
            <button className={item === active ? 'active' : ''} key={item} onClick={() => navigateTo(adminPathByNav[item])} type="button">
              <span className="nav-dot" />
              {item}
            </button>
          ))}
        </nav>
        <div className="sidebar-user">
          <span>A</span>
          <div>
            <strong>Admin_01</strong>
            <small>系统管理员</small>
          </div>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <span>{active} {subActive ? `› ${subActive}` : ''}</span>
          <div>
            <button type="button">通知</button>
            <button type="button">退出</button>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </div>
  );
}

export function AccountLayout({ active, children }: { active: string; children: ReactNode }) {
  return (
    <PortalLayout active="企业中心">
      <div className="account-shell">
        <aside className="account-menu">
          <h3>企业用户中心</h3>
          {accountNav.map((item) => (
            <button className={item === active ? 'active' : ''} key={item} onClick={() => navigateTo(accountPathByNav[item])} type="button">
              {item}
            </button>
          ))}
        </aside>
        <section className="account-content">{children}</section>
      </div>
    </PortalLayout>
  );
}
