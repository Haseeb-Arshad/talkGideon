import type { AssistantMode } from '../../lib/types'

const DEFAULTS: Record<AssistantMode, string> = {
  idle: 'Ready when you are.',
  listening: 'Listening…',
  thinking: 'Thinking it through…',
  searching: 'Searching sources…',
  answering: 'Composing your answer…',
  ready: 'Here’s what I found.',
  error: 'Something interrupted me — try again.',
}

interface AssistantStatusProps {
  mode: AssistantMode
  /** Override the default copy for the current mode (e.g. streamed status). */
  label?: string
  showSpinner?: boolean
}

const BUSY: AssistantMode[] = ['thinking', 'searching', 'answering']

/** A single calm status line; shows a small spinner while Gideon is working. */
export function AssistantStatus({ mode, label, showSpinner = true }: AssistantStatusProps) {
  const text = label ?? DEFAULTS[mode]
  const busy = showSpinner && BUSY.includes(mode)
  return (
    <div className="loading-status" role="status" aria-live="polite">
      {busy && <span className="spin" aria-hidden="true" />}
      <span>{text}</span>
    </div>
  )
}
