/**
 * Streaming event contract for the future Go backend.
 *
 * The mock API emits the same event shapes (see `mock-api.ts#streamAnswer`)
 * so swapping in a real SSE / WebSocket stream is a drop-in: parse the wire
 * frames into `GideonEvent` and feed them to the same reducer.
 */

import type { AnswerBlock, SourceRef } from './answer'
import type { AssistantMode } from './session'

export type GideonEvent =
  /** Assistant lifecycle phase changed (drives the orb + status pill). */
  | { type: 'mode'; mode: AssistantMode }
  /** Human-readable status line, e.g. "Searching sources…". */
  | { type: 'status'; label: string }
  /** A source was found while searching (animate it in). */
  | { type: 'source'; source: SourceRef }
  /** A generated block is ready to render (the page assembles itself). */
  | { type: 'block'; block: AnswerBlock }
  /** Spoken/display answer token (for live captions + TTS). */
  | { type: 'token'; channel: 'spoken' | 'display'; text: string }
  /** The answer is complete. */
  | { type: 'done'; answerId: string; latencyMs: number }
  /** Something failed; surface a calm fallback. */
  | { type: 'error'; message: string }

export type GideonEventType = GideonEvent['type']
