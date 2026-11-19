import type { ReactNode } from 'react'

export function Sparkline({ values, color = 'var(--teal)', height = 54 }: { values: number[]; color?: string; height?: number }) {
  const max = Math.max(...values)
  const min = Math.min(...values)
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100
    const y = max === min ? 50 : 88 - ((value - min) / (max - min)) * 70
    return `${x},${y}`
  }).join(' ')
  return <svg className="sparkline" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ height }} aria-label="Biểu đồ xu hướng"><polyline points={points} fill="none" stroke={color} strokeWidth="3" vectorEffect="non-scaling-stroke" /></svg>
}

export function MiniBarChart({ values, labels, color = 'var(--blue)' }: { values: number[]; labels: string[]; color?: string }) {
  const max = Math.max(...values)
  return <div className="mini-bars" role="img" aria-label="Biểu đồ cột dữ liệu demo">
    {values.map((value, index) => <div className="mini-bars__item" key={`${labels[index]}-${index}`}><span className="mini-bars__value">{value}</span><div className="mini-bars__track"><div className="mini-bars__bar" style={{ height: `${Math.max((value / max) * 100, 5)}%`, background: color }} /></div><span className="mini-bars__label">{labels[index]}</span></div>)}
  </div>
}

export function ChartCard({ title, subtitle, children, action }: { title: string; subtitle?: string; children: ReactNode; action?: ReactNode }) {
  return <section className="card chart-card"><div className="card__header-row"><div><h3>{title}</h3>{subtitle ? <p className="muted">{subtitle}</p> : null}</div>{action}</div>{children}</section>
}
