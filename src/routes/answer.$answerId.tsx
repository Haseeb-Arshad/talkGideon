import { useEffect, useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { AssistantMode, AnswerView, SourceRef } from '../lib/types'
import { PageContainer } from '../components/layout/page-container'
import { AnswerCanvas } from '../components/answer/answer-canvas'
import { GenerativeLoadingState } from '../components/answer/generative-loading-state'
import { answerQuery } from '../lib/queries'
import { streamAnswer } from '../lib/api/mock-api'
import { useAsk } from '../lib/use-ask'

export const Route = createFileRoute('/answer/$answerId')({
  component: AnswerRoute,
})

function AnswerRoute() {
  const { answerId } = Route.useParams()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const ask = useAsk()

  const q = search.q
  const view: AnswerView = search.view ?? 'summary'

  // The complete answer (cached; also resolves on direct visits / refresh).
  const { data: answer } = useQuery(answerQuery(answerId, q))

  // Client-driven "assembling" phase — drives the orb, status, and source reveal.
  const [phase, setPhase] = useState<AssistantMode>(q ? 'thinking' : 'ready')
  const [statusLabel, setStatusLabel] = useState<string | undefined>(undefined)
  const [streamSources, setStreamSources] = useState<SourceRef[]>([])
  const startedRef = useRef<string>('')

  // Play the generative stream whenever a fresh query arrives.
  useEffect(() => {
    if (!q) {
      setPhase('ready')
      return
    }
    const key = `${answerId}|${q}`
    if (startedRef.current === key) return
    startedRef.current = key
    setPhase('thinking')
    setStatusLabel(undefined)
    setStreamSources([])

    const stop = streamAnswer(q, (e) => {
      switch (e.type) {
        case 'mode':
          setPhase(e.mode)
          break
        case 'status':
          setStatusLabel(e.label)
          break
        case 'source':
          setStreamSources((prev) => (prev.some((s) => s.id === e.source.id) ? prev : [...prev, e.source]))
          break
        case 'done':
          setPhase('ready')
          break
        case 'error':
          setPhase('error')
          break
      }
    })
    return stop
  }, [answerId, q])

  // Reflect the phase into the URL `mode` (shareable, no history spam).
  useEffect(() => {
    void navigate({ to: '.', search: (prev) => ({ ...prev, mode: phase }), replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  const setView = (next: AnswerView) =>
    void navigate({ to: '.', search: (prev) => ({ ...prev, view: next }), replace: true })

  const ready = phase === 'ready' && Boolean(answer)

  if (!ready || !answer) {
    return (
      <PageContainer>
        <GenerativeLoadingState
          query={q ?? answer?.query ?? answerId.replace(/-/g, ' ')}
          mode={phase === 'ready' ? 'answering' : phase}
          statusLabel={statusLabel}
          sources={streamSources}
        />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <AnswerCanvas answer={answer} view={view} onViewChange={setView} onFollowUp={ask} />
    </PageContainer>
  )
}
