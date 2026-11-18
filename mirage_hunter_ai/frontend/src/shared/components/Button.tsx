import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  startIcon?: ReactNode
  endIcon?: ReactNode
}

export function Button({ children, variant = 'primary', size = 'md', startIcon, endIcon, className = '', ...props }: ButtonProps) {
  return (
    <button className={`button button--${variant} button--${size} ${className}`.trim()} {...props}>
      {startIcon ? <span className="button__icon">{startIcon}</span> : null}
      <span>{children}</span>
      {endIcon ? <span className="button__icon">{endIcon}</span> : null}
    </button>
  )
}
