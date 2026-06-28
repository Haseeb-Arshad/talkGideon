import { Check } from 'lucide-react'
import type { RecommendationBlock } from '../../lib/types'
import { SoftCard, CardEyebrow } from '../ui/soft-card'

export function RecommendationCard({ block }: { block: RecommendationBlock }) {
  return (
    <SoftCard className="reco">
      <CardEyebrow>
        <Check aria-hidden="true" /> Recommendation
      </CardEyebrow>
      {/* verdict carries light, authored <b> emphasis (trusted mock content). */}
      <div className="verdict" dangerouslySetInnerHTML={{ __html: block.verdict }} />
      {block.lines && block.lines.length > 0 && (
        <div className="reco-split">
          {block.lines.map((line, i) => (
            <div className="reco-line" key={i}>
              <span className={`pin ${line.side}`}>{line.pin}</span>
              <div className="rt">{line.text}</div>
            </div>
          ))}
        </div>
      )}
    </SoftCard>
  )
}
