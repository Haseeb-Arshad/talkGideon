import type { Answer, AnswerView } from '../../lib/types'
import { sourcesOf } from '../../lib/data/mock-answer'
import { SectionLabel } from '../ui/section-label'
import { SoftCard } from '../ui/soft-card'
import { MemoryUsedCard } from '../memory/memory-used-card'
import { AnswerHeader } from './answer-header'
import { GeneratedSection } from './generated-section'
import { SourceGrid } from './source-grid'
import { FollowUpChips } from './follow-up-chips'

interface AnswerCanvasProps {
  answer: Answer
  view: AnswerView
  onViewChange: (view: AnswerView) => void
  onFollowUp: (prompt: string) => void
}

/**
 * The generated answer interface. Four views (summary / sources / memory / raw)
 * over the same answer object — a bespoke mini-interface, never a chat bubble.
 */
export function AnswerCanvas({ answer, view, onViewChange, onFollowUp }: AnswerCanvasProps) {
  const sources = sourcesOf(answer)
  const gridBlocks = answer.blocks
    .filter((b) => b.type !== 'sources' && b.type !== 'followup')
    .sort((a, b) => a.priority - b.priority)

  return (
    <div className="answer">
      <AnswerHeader answer={answer} view={view} onViewChange={onViewChange} />

      {view === 'summary' && (
        <>
          <div className="canvas-grid">
            {gridBlocks.map((block, i) => (
              <GeneratedSection key={block.id} block={block} index={i} />
            ))}
          </div>

          {sources.length > 0 && (
            <div className="sources-wrap">
              <SectionLabel count={sources.length}>Sources</SectionLabel>
              <SourceGrid sources={sources} />
            </div>
          )}

          {answer.memoryUsed.length > 0 && <MemoryUsedCard items={answer.memoryUsed} />}

          {answer.suggestedFollowUps.length > 0 && (
            <div className="followups">
              <SectionLabel>Continue</SectionLabel>
              <FollowUpChips prompts={answer.suggestedFollowUps} onPick={onFollowUp} />
            </div>
          )}
        </>
      )}

      {view === 'sources' && (
        <div className="sources-wrap">
          <SectionLabel count={sources.length}>Sources Gideon scanned</SectionLabel>
          <SourceGrid sources={sources} stacked />
        </div>
      )}

      {view === 'memory' && (
        <div style={{ display: 'grid', gap: 18 }}>
          <SoftCard>
            <h3>What Gideon remembered</h3>
            <p>These memories shaped this answer. Manage them from the memory drawer.</p>
          </SoftCard>
          {answer.memoryUsed.length > 0 ? (
            <MemoryUsedCard items={answer.memoryUsed} />
          ) : (
            <p style={{ color: 'var(--muted)' }}>No stored memory influenced this answer.</p>
          )}
        </div>
      )}

      {view === 'raw' && (
        <SoftCard className="summary">
          <p className="lead">{answer.displayAnswer}</p>
          <p style={{ marginTop: 16, color: 'var(--muted)' }}>{answer.spokenAnswer}</p>
        </SoftCard>
      )}
    </div>
  )
}
