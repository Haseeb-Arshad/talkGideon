import type { AssistantMode } from '../../lib/types'
import { StatusPill } from '../ui/status-pill'

interface VoiceStateIndicatorProps {
  mode: AssistantMode
}

/** Compact mode indicator for the voice-first surface. */
export function VoiceStateIndicator({ mode }: VoiceStateIndicatorProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <StatusPill mode={mode} />
    </div>
  )
}
