import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface PageContainerProps {
  children: ReactNode
  /** Narrower max-width for hero / reading-focused screens. */
  narrow?: boolean
  className?: string
}

/** Centers page content within the scrolling stage, with composer-safe padding. */
export function PageContainer({ children, narrow, className }: PageContainerProps) {
  return <div className={cn('stage-inner', narrow && 'narrow', className)}>{children}</div>
}
