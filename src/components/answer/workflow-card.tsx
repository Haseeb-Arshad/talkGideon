import { ListChecks } from 'lucide-react'
import type { WorkflowBlock } from '../../lib/types'
import { SoftCard, CardEyebrow } from '../ui/soft-card'

export function WorkflowCard({ block }: { block: WorkflowBlock }) {
  return (
    <SoftCard>
      <CardEyebrow>
        <ListChecks aria-hidden="true" /> {block.title}
      </CardEyebrow>
      <div className="steps">
        {block.steps.map((step, i) => (
          <div className="step" key={`${step.title}-${i}`}>
            <span className="sn">{i + 1}</span>
            <div className="stx">
              <b>{step.title}</b>
              {step.detail ? ` — ${step.detail}` : ''}
            </div>
          </div>
        ))}
      </div>
    </SoftCard>
  )
}
