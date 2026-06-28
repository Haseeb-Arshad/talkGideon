import { Sparkles } from 'lucide-react'
import type { SummaryBlock } from '../../lib/types'
import { SoftCard, CardEyebrow } from '../ui/soft-card'

export function SummaryCard({ block }: { block: SummaryBlock }) {
  return (
    <SoftCard className="summary">
      <CardEyebrow>
        <Sparkles aria-hidden="true" /> Summary
      </CardEyebrow>
      <p className="lead">{block.lead}</p>
      {block.tags && block.tags.length > 0 && (
        <div className="summary-tags">
          {block.tags.map((t) => (
            <span className="tag" key={t}>
              {t}
            </span>
          ))}
        </div>
      )}
    </SoftCard>
  )
}
