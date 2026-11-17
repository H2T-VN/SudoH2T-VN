import { useLocation } from 'react-router-dom'

const pageTitles: Record<string, string> = {
  '/': 'Tổng quan',
  '/experiments/new': 'Tạo thử nghiệm',
  '/models': 'Model',
  '/results': 'Kết quả',
  '/minimization': 'Minimization',
}

export function Header() {
  const { pathname } = useLocation()
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">H2T-MIRAGEHUNTER</p>
        <h1>{pageTitles[pathname] ?? 'MirageHunter'}</h1>
      </div>
      <div className="topbar__meta">
        <span className="environment-pill">Development scaffold</span>
      </div>
    </header>
  )
}
