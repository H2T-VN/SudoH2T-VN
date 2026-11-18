import type { ReactNode } from 'react'

export function PageHeader({ eyebrow, title, description, action, children }: { eyebrow?: string; title: string; description?: string; action?: ReactNode; children?: ReactNode }) {
  return <div className="page-header"><div><div className="breadcrumbs"><span>Workspace</span><span>/</span><strong>{title}</strong></div>{eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}<h2>{title}</h2>{description ? <p className="page-header__description">{description}</p> : null}{children}</div>{action ? <div className="page-header__action">{action}</div> : null}</div>
}
