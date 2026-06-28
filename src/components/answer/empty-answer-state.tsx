import type { ComponentType } from 'react'
import { Compass, FileText, Scale, Search, Sparkles } from 'lucide-react'
import { GideonOrb } from '../assistant/gideon-orb'
import { EXAMPLE_PROMPTS } from '../../lib/data/mock-answer'

const ICONS: Record<string, ComponentType<{ 'aria-hidden'?: boolean }>> = {
  search: Search,
  scale: Scale,
  sparkles: Sparkles,
  compass: Compass,
  'file-text': FileText,
}

interface EmptyAnswerStateProps {
  onPick: (query: string) => void
}

/** The calm start screen — orb, an inviting question, and a few prompt chips. */
export function EmptyAnswerState({ onPick }: EmptyAnswerStateProps) {
  return (
    <div className="empty">
      <GideonOrb state="idle" size={116} />
      <h1>
        What should we <em>think through?</em>
      </h1>
      <p className="lede">
        Ask by voice or text. Gideon can search, compare, summarize, and build visual answers.
      </p>
      <div className="chips">
        {EXAMPLE_PROMPTS.map((p) => {
          const Icon = ICONS[p.icon] ?? Sparkles
          return (
            <button type="button" className="chip" key={p.label} onClick={() => onPick(p.query)}>
              <Icon aria-hidden={true} />
              <span>{p.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
