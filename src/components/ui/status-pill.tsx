import type { AssistantMode } from '../../lib/types'
import { cn } from '../../lib/utils'

const LABELS: Record<AssistantMode, string> = {
  idle: 'Online',
  listening: 'Listening',
  thinking: 'Thinking',
  searching: 'Searching',
  answering: 'Answering',
  ready: 'Ready',
  error: 'Reconnecting',
}

interface StatusPillProps {
  mode: AssistantMode
  className?: string
}

/** Calm status chip with a single state dot. Mirrors the assistant mode. */
export function StatusPill({ mode, className }: StatusPillProps) {
  return (
    <span className={cn('status-pill', className)} data-state={mode} role="status" aria-live="polite">
      <span className="dot" aria-hidden="true" />
      <span className="label-long">{LABELS[mode]}</span>
    </span>
  )
}
