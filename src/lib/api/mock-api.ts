/**
 * Mock intelligence API. Shapes mirror the planned Go backend exactly, so the
 * UI never has to change when real endpoints land — only this file is replaced
 * (or routed through `client.ts`'s `apiFetch`).
 */

import type { Answer, GideonEvent, MemorySnapshot, Session, SourceRef } from '../types'
import { resolveAnswer, resolveAnswerById, sourcesOf } from '../data/mock-answer'
import { MEMORY_SNAPSHOT } from '../data/mock-memory'
import { MOCK_SESSIONS } from '../data/mock-sessions'
import { wait } from '../utils'

export async function fetchSessions(): Promise<Session[]> {
  await wait(120)
  return MOCK_SESSIONS
}

export async function fetchMemory(): Promise<MemorySnapshot> {
  await wait(140)
  return MEMORY_SNAPSHOT
}

export async function fetchSources(query: string): Promise<SourceRef[]> {
  await wait(420)
  return sourcesOf(resolveAnswer(query))
}

/**
 * Fetch a complete answer. The phased "assembling" experience is driven on the
 * client (see `streamAnswer`); this is the simple request/response form used by
 * TanStack Query for cache + revisits.
 */
export async function fetchAnswer(id: string, query?: string): Promise<Answer> {
  await wait(900)
  return resolveAnswerById(id, query)
}

/** Fetch an answer fresh from a query (used the first time a question is asked). */
export async function fetchAnswerForQuery(query: string): Promise<Answer> {
  await wait(900)
  return resolveAnswer(query)
}

/**
 * Streaming form — emits the same `GideonEvent`s a real SSE/WebSocket stream
 * will. Drives the generative "the page assembles itself" experience: mode
 * changes, sources appearing one by one, then blocks in priority order.
 * Returns a cleanup function to cancel.
 */
export function streamAnswer(query: string, onEvent: (e: GideonEvent) => void): () => void {
  let cancelled = false
  const timers: ReturnType<typeof setTimeout>[] = []
  const at = (ms: number, fn: () => void) => {
    timers.push(setTimeout(() => !cancelled && fn(), ms))
  }

  const answer = resolveAnswer(query)
  const needsSearch = answer.requiresSearch ?? false
  const sources = sourcesOf(answer)
  const renderable = [...answer.blocks]
    .filter((b) => b.type !== 'sources')
    .sort((a, b) => a.priority - b.priority)

  let t = 0
  onEvent({ type: 'mode', mode: 'thinking' })
  onEvent({ type: 'status', label: 'Thinking through your question…' })

  t = 520
  if (needsSearch) {
    at(t, () => {
      onEvent({ type: 'mode', mode: 'searching' })
      onEvent({ type: 'status', label: 'Searching sources…' })
    })
    sources.forEach((source, i) => {
      at(t + 260 + i * 220, () => onEvent({ type: 'source', source }))
    })
    t = t + 260 + sources.length * 220 + 240
  }

  at(t, () => {
    onEvent({ type: 'mode', mode: 'answering' })
    onEvent({ type: 'status', label: 'Composing your answer…' })
  })

  renderable.forEach((block, i) => {
    at(t + 220 + i * 300, () => onEvent({ type: 'block', block }))
  })
  // Source grid arrives near the end as its own block.
  const sourceBlock = answer.blocks.find((b) => b.type === 'sources')
  if (sourceBlock) {
    at(t + 220 + renderable.length * 300, () => onEvent({ type: 'block', block: sourceBlock }))
  }

  const doneAt = t + 360 + (renderable.length + 1) * 300
  at(doneAt, () => {
    onEvent({ type: 'mode', mode: 'ready' })
    onEvent({ type: 'done', answerId: answer.id, latencyMs: answer.latencyMs })
  })

  return () => {
    cancelled = true
    timers.forEach(clearTimeout)
  }
}
