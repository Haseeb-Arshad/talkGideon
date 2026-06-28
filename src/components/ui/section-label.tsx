import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface SectionLabelProps {
  children: ReactNode
  count?: ReactNode
  className?: string
}

/** Small uppercase section heading with an optional muted count. */
export function SectionLabel({ children, count, className }: SectionLabelProps) {
  return (
    <div className={cn('section-label', className)}>
      <span>{children}</span>
      {count != null && <span className="count">{count}</span>}
    </div>
  )
}
