import type { ReactNode } from 'react';

const portalNav = ['首页', '矿产资源', '即将拍卖', '正在竞价', '成交公示', '信息资讯', '公开说明'];
const adminNav = ['首页看板', '拍品管理', '审核管理', '交易管理', '企业管理', '内容运营', '系统审计'];
const accountNav = ['中心首页', '我的企业认证', '我的意向金', '我的出价记录', '我的通知'];

export function PortalLayout({ active, children }: { active: string; children: ReactNode }) {
  return (
    <div className="app-shell portal-shell">
      <header className="portal-header">
        <div className="brand-mark">
          <span>矿</span>
          <div>
            <strong>华宁矿产竞拍平台</strong>
            <small>公开 公平 公正</small>
          </div>
        </div>
        <nav>
          {portalNav.map((item) => (
            <button className={item === active ? 'active' : ''} key={item} type="button">
              {item}
            </button>
          ))}
        </nav>
        <div className="header-actions">
          <button type="button">搜索</button>
          <button type="button">登录</button>
          <button className="solid" type="button">企业入驻</button>
        </div>
      </header>
      <main>{children}</main>
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
            <button className={item === active ? 'active' : ''} key={item} type="button">
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
            <button className={item === active ? 'active' : ''} key={item} type="button">
              {item}
            </button>
          ))}
        </aside>
        <section className="account-content">{children}</section>
      </div>
    </PortalLayout>
  );
}
