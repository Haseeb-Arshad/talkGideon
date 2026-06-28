import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge class names (shadcn convention): clsx + tailwind-merge. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Deterministic url-safe slug from a free-form query (stable answer ids). */
export function slugify(input: string, max = 48): string {
  const base = input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, max)
    .replace(/^-|-$/g, '')
  return base || 'answer'
}

/** Tiny non-crypto id for sessions/local entities. */
export function shortId(prefix = 's'): string {
  const rand = Math.random().toString(36).slice(2, 8)
  const stamp = Date.now().toString(36).slice(-4)
  return `${prefix}_${stamp}${rand}`
}

/** Promise-based delay used by the mock API to simulate latency/phases. */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/** Initials from a domain or title, for the source favicon chip. */
export function domainInitial(domain: string): string {
  const clean = domain.replace(/^www\./, '')
  return (clean[0] || '·').toUpperCase()
}
