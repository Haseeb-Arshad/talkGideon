import type { AnswerView } from './types'
import { ANSWER_VIEWS } from './types/answer'
import type { AssistantMode } from './types'
import { ASSISTANT_MODES } from './types/session'

/**
 * Global URL search state. Kept in the URL (not global JS state) so the app is
 * shareable, refresh-safe, and back/forward works: the current assistant mode,
 * the selected answer view, the memory drawer, an optional session id, and the
 * active query.
 */
/**
 * Fields are typed optional so Link/navigate search updaters compose freely
 * (`(prev) => ({ ...prev, mem: true })`). `validateGideonSearch` still fills
 * concrete defaults at runtime, so reads are always defined in practice.
 */
export interface GideonSearch {
  mode?: AssistantMode
  view?: AnswerView
  mem?: boolean
  session?: string
  q?: string
}

function asMode(v: unknown): AssistantMode {
  return ASSISTANT_MODES.includes(v as AssistantMode) ? (v as AssistantMode) : 'idle'
}

function asView(v: unknown): AnswerView {
  return ANSWER_VIEWS.includes(v as AnswerView) ? (v as AnswerView) : 'summary'
}

function asBool(v: unknown): boolean {
  return v === true || v === 'true' || v === 1 || v === '1'
}

function asStr(v: unknown): string | undefined {
  return typeof v === 'string' && v.length > 0 ? v : undefined
}

/** validateSearch for the root route — every route inherits this shape. */
export function validateGideonSearch(search: Record<string, unknown>): GideonSearch {
  return {
    mode: asMode(search.mode),
    view: asView(search.view),
    mem: asBool(search.mem),
    session: asStr(search.session),
    q: asStr(search.q),
  }
}
