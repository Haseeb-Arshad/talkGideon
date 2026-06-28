import type { SourceRef } from '../../lib/types'
import { SourceCard } from './source-card'

interface SourceGridProps {
  sources: SourceRef[]
  /** Wrap into rows instead of a single horizontal scroll row. */
  stacked?: boolean
}

export function SourceGrid({ sources, stacked }: SourceGridProps) {
  return (
    <div className={stacked ? 'sources stacked' : 'sources'}>
      {sources.map((s) => (
        <SourceCard key={s.id} source={s} />
      ))}
    </div>
  )
}
