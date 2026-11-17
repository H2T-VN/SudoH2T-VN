import { NavLink } from 'react-router-dom'

const links = [
  { to: '/', label: 'Tổng quan', icon: '⌂' },
  { to: '/experiments/new', label: 'Thử nghiệm mới', icon: '＋' },
  { to: '/models', label: 'Model', icon: '◈' },
  { to: '/results', label: 'Kết quả', icon: '◫' },
  { to: '/minimization', label: 'Minimization', icon: '⌁' },
]

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand__mark">M</div>
        <div>
          <strong>MirageHunter</strong>
          <span>H2T AI robustness</span>
        </div>
      </div>
      <nav className="sidebar__nav" aria-label="Điều hướng chính">
        {links.map((link) => (
          <NavLink
            className={({ isActive }) => `nav-link${isActive ? ' nav-link--active' : ''}`}
            end={link.to === '/'}
            key={link.to}
            to={link.to}
          >
            <span className="nav-link__icon" aria-hidden="true">{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>
      <div className="sidebar__footer">
        <span className="status-dot status-dot--muted" />
        <span>Scaffold mode</span>
      </div>
    </aside>
  )
}
