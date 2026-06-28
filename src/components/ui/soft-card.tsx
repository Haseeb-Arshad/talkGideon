import type { HTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface SoftCardProps extends HTMLAttributes<HTMLDivElement> {
  raised?: boolean
}

/** The base ivory card surface — soft border, feather-light shadow. */
export function SoftCard({ raised, className, children, ...props }: SoftCardProps) {
  return (
    <div className={cn('card', raised && 'raised', className)} {...props}>
      {children}
    </div>
  )
}

interface CardEyebrowProps extends HTMLAttributes<HTMLSpanElement> {}

export function CardEyebrow({ className, children, ...props }: CardEyebrowProps) {
  return (
    <span className={cn('card-eyebrow', className)} {...props}>
      {children}
    </span>
  )
}
