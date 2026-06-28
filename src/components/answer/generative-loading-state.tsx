import { motion } from 'framer-motion'
import type { AssistantMode, SourceRef } from '../../lib/types'
import { GideonOrb, orbStateForMode } from '../assistant/gideon-orb'
import { AssistantStatus } from '../assistant/assistant-status'
import { SectionLabel } from '../ui/section-label'
import { SourceCard } from './source-card'

interface GenerativeLoadingStateProps {
  query: string
  mode: AssistantMode
  statusLabel?: string
  sources: SourceRef[]
}

/**
 * The "page assembling itself" state. No big spinner — the question stays
 * anchored, the orb works, sources animate in one by one, and skeleton cards
 * hold the shape of the answer that's forming.
 */
export function GenerativeLoadingState({ query, mode, statusLabel, sources }: GenerativeLoadingStateProps) {
  return (
    <div className="loading">
      <div className="loading-head">
        <GideonOrb state={orbStateForMode(mode)} size={56} />
        <div>
          <div className="loading-q">{query}</div>
          <AssistantStatus mode={mode} label={statusLabel} />
        </div>
      </div>

      {sources.length > 0 && (
        <div className="sources-wrap">
          <SectionLabel count={sources.length}>Sources found</SectionLabel>
          <div className="src-stream">
            {sources.map((s) => (
              <motion.div
                key={s.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                <SourceCard source={s} />
              </motion.div>
            ))}
          </div>
        </div>
      )}

      <div className="skeleton-grid" aria-hidden="true">
        <div className="skel h-sum" />
        <div className="skel h-cmp" />
        <div className="skel h-src" />
      </div>
    </div>
  )
}
