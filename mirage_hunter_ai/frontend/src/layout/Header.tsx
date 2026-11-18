import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

import { Badge } from '../shared/components/Badge'
import { Icon } from '../shared/components/Icon'

const titles: Record<string, { eyebrow: string; title: string }> = {
  '/dashboard': { eyebrow: 'WORKSPACE OVERVIEW', title: 'Dashboard' },
  '/models': { eyebrow: 'MODEL REGISTRY', title: 'Models' },
  '/datasets': { eyebrow: 'DATA LIBRARY', title: 'Datasets' },
  '/hunts': { eyebrow: 'ROBUSTNESS SEARCH', title: 'Hunts' },
  '/hunts/new': { eyebrow: 'NEW HUNT', title: 'Tạo phiên Hunt' },
  '/baseline': { eyebrow: 'BASELINE EVALUATION', title: 'Baseline Evaluation' },
  '/failures': { eyebrow: 'FAILURE EXPLORER', title: 'Failures' },
  '/comparisons/models': { eyebrow: 'MODEL COMPARISON', title: 'So sánh model' },
  '/comparisons/strategies': { eyebrow: 'STRATEGY COMPARISON', title: 'So sánh strategy' },
  '/reports': { eyebrow: 'REPORTS & REGRESSION', title: 'Reports' },
}

interface HeaderProps { onMenu: () => void; darkMode: boolean; onToggleTheme: () => void }

export function Header({ onMenu, darkMode, onToggleTheme }: HeaderProps) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [language, setLanguage] = useState<'VI' | 'EN'>('VI')
  const meta = Object.entries(titles).find(([path]) => pathname === path || (path !== '/hunts' && pathname.startsWith(path + '/')))?.[1] ?? { eyebrow: 'MIRAGEHUNTER AI', title: 'Home' }

  useEffect(() => {
    setQuery('')
  }, [pathname])

  const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (query.trim()) navigate('/failures?query=' + encodeURIComponent(query.trim()))
  }

  return <header className="topbar">
    <div className="topbar__left"><button className="icon-button mobile-menu" onClick={onMenu} aria-label="Mở menu"><Icon name="menu" size={21} /></button><Link className="topbar__brand" to="/"><span className="topbar__brand-mark">M</span><span>MirageHunter <em>AI</em></span></Link><span className="topbar__divider" /><div className="page-heading"><span className="eyebrow">{meta.eyebrow}</span><h1>{meta.title}</h1></div></div>
    <div className="topbar__actions">
      <form className="search-box" onSubmit={handleSearch}><Icon name="search" size={17} /><input aria-label="Tìm kiếm" placeholder="Tìm failure, hunt..." value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘ K</kbd></form>
      <button className="language-button" onClick={() => setLanguage((current) => current === 'VI' ? 'EN' : 'VI')} aria-label="Đổi ngôn ngữ">{language}<Icon name="chevron" size={13} /></button>
      <button className="icon-button" onClick={onToggleTheme} aria-label={darkMode ? 'Bật chế độ sáng' : 'Bật chế độ tối'}><Icon name={darkMode ? 'sun' : 'moon'} size={18} /></button>
      <button className="icon-button notification-button" aria-label="Thông báo"><Icon name="bell" size={18} /><span /></button>
      <Badge tone="info">DEMO</Badge>
    </div>
  </header>
}
