import type { ReactNode } from 'react'

export type ToastTone = 'info' | 'success' | 'warning' | 'error'

interface ToastProps {
  children: ReactNode
  tone?: ToastTone
}

export function Toast({ children, tone = 'info' }: ToastProps) {
  return <div className={`toast toast--${tone}`} role="status">{children}</div>
}
