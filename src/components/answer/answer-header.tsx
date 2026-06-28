import type { Answer, AnswerView } from '../../lib/types'
import { ANSWER_VIEWS } from '../../lib/types/answer'
import { GideonOrb } from '../assistant/gideon-orb'
import { LatencyBadge } from '../ui/latency-badge'

const VIEW_LABELS: Record<AnswerView, string> = {
  summary: 'Summary',
  sources: 'Sources',
  memory: 'Memory',
  raw: 'Just the answer',
}

interface AnswerHeaderProps {
  answer: Answer
  view: AnswerView
  onViewChange: (view: AnswerView) => void
}

export function AnswerHeader({ answer, view, onViewChange }: AnswerHeaderProps) {
  return (
    <header className="answer-head">
      <GideonOrb state="idle" size={56} />
      <div className="ht">
        <h1 className="answer-title">{answer.title}</h1>
        <p className="answer-subtitle">{answer.subtitle}</p>
        <div className="view-tabs" role="tablist" aria-label="Answer views">
          {ANSWER_VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              role="tab"
              aria-selected={v === view}
              className="view-tab"
              data-active={v === view}
              onClick={() => onViewChange(v)}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
      </div>
      {answer.latencyMs > 0 && <LatencyBadge ms={answer.latencyMs} />}
    </header>
  )
}
