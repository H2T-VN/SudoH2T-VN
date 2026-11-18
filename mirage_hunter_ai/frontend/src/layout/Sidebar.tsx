import { NavLink } from 'react-router-dom'

import { Icon, type IconName } from '../shared/components/Icon'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const primaryLinks: Array<{ to: string; label: string; icon: IconName }> = [
  { to: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { to: '/models', label: 'Models', icon: 'box' },
  { to: '/datasets', label: 'Datasets', icon: 'layers' },
  { to: '/hunts', label: 'Hunts', icon: 'target' },
  { to: '/failures', label: 'Failures', icon: 'alert' },
  { to: '/comparisons/models', label: 'Comparisons', icon: 'scale' },
  { to: '/reports', label: 'Reports', icon: 'chart' },
]

export function Sidebar({ open, onClose }: SidebarProps) {
  return <>
    <div className={'sidebar-backdrop' + (open ? ' sidebar-backdrop--visible' : '')} onClick={onClose} aria-hidden="true" />
    <aside className={'sidebar' + (open ? ' sidebar--open' : '')}>
      <div className="brand">
        <div className="brand__mark">M</div>
        <div className="brand__copy"><strong>MirageHunter</strong><span>AI robustness lab</span></div>
        <button className="icon-button sidebar__close" onClick={onClose} aria-label="Đóng menu"><Icon name="close" size={20} /></button>
      </div>
      <div className="sidebar__section-label">WORKSPACE</div>
      <nav className="sidebar__nav" aria-label="Điều hướng chính">
        {primaryLinks.map((link) => <NavLink className={({ isActive }) => 'nav-link' + (isActive ? ' nav-link--active' : '')} key={link.to} to={link.to} onClick={onClose}>
          <span className="nav-link__icon"><Icon name={link.icon} size={18} /></span><span>{link.label}</span>
          {link.label === 'Failures' ? <span className="nav-link__count">24</span> : null}
        </NavLink>)}
      </nav>
      <div className="sidebar__section-label sidebar__section-label--secondary">RESOURCES</div>
      <nav className="sidebar__nav sidebar__nav--secondary" aria-label="Tài nguyên">
        <NavLink className={({ isActive }) => 'nav-link' + (isActive ? ' nav-link--active' : '')} to="/docs" onClick={onClose}><span className="nav-link__icon"><Icon name="external" size={18} /></span><span>Docs & API</span></NavLink>
        <NavLink className={({ isActive }) => 'nav-link' + (isActive ? ' nav-link--active' : '')} to="/settings" onClick={onClose}><span className="nav-link__icon"><Icon name="settings" size={18} /></span><span>Settings</span></NavLink>
      </nav>
      <div className="sidebar__footer"><div className="workspace-card"><div className="workspace-card__avatar">DS</div><div><strong>Demo workspace</strong><span>Local project</span></div><Icon name="dots" size={18} /></div><div className="demo-note"><span className="status-live" />Dữ liệu demo đang bật</div></div>
    </aside>
  </>
}
