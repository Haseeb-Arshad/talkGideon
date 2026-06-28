import { Fragment } from 'react'
import { ArrowRight, Workflow } from 'lucide-react'
import type { TimelineBlock } from '../../lib/types'
import { SoftCard, CardEyebrow } from '../ui/soft-card'

/** Renders a left-to-right flow (architecture / pipeline) from a timeline block. */
export function ArchitectureCard({ block }: { block: TimelineBlock }) {
  return (
    <SoftCard>
      <CardEyebrow>
        <Workflow aria-hidden="true" /> {block.title}
      </CardEyebrow>
      <div className="flow">
        {block.nodes.map((node, i) => (
          <Fragment key={`${node.title}-${i}`}>
            <div className="node">
              <div className="nt">{node.title}</div>
              {node.sub && <div className="ns">{node.sub}</div>}
            </div>
            {i < block.nodes.length - 1 && (
              <span className="arrow" aria-hidden="true">
                <ArrowRight />
              </span>
            )}
          </Fragment>
        ))}
      </div>
    </SoftCard>
  )
}
