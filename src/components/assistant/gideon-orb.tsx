import type { CSSProperties } from 'react'
import type { AssistantMode } from '../../lib/types'

export type OrbState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'searching'
  | 'speaking'
  | 'answering'
  | 'error'

/** Map the assistant lifecycle mode to a visual orb state. */
export function orbStateForMode(mode: AssistantMode): OrbState {
  if (mode === 'ready') return 'idle'
  return mode
}

interface GideonOrbProps {
  state?: OrbState
  /** Pixel diameter; falls back to the CSS default per context. */
  size?: number
  className?: string
}

/**
 * The Gideon presence — a warm, breathing orb. Pure CSS animation (no 3D),
 * tasteful and calm. States: idle (breathing), listening (waveform + ripple),
 * thinking (slow pulse), searching (scanning ripple), speaking/answering
 * (rhythmic pulse), error (muted sand glow).
 */
export function GideonOrb({ state = 'idle', size, className }: GideonOrbProps) {
  const style = size ? ({ ['--orb-size']: `${size}px` } as CSSProperties) : undefined
  return (
    <div className={className ? `orb ${className}` : 'orb'} data-state={state} style={style} aria-hidden="true">
      <span className="orb-halo" />
      <span className="orb-ring" />
      <span className="orb-core" />
      <span className="orb-wave">
        <span />
        <span />
        <span />
        <span />
        <span />
      </span>
    </div>
  )
}
