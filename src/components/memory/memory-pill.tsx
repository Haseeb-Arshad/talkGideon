import type { ReactNode } from 'react'

/** A quiet pill for a single remembered fact. */
export function MemoryPill({ children }: { children: ReactNode }) {
  return <span className="mp">{children}</span>
}
