import type { ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required for accessibility — every icon button is labelled. */
  label: string
  /** Show the small amber notification dot. */
  dot?: boolean
}

export function IconButton({ label, dot, className, children, ...props }: IconButtonProps) {
  return (
    <button
      type="button"
      className={cn('icon-btn', dot && 'has-dot', className)}
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  )
}
