import { useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { shortId, slugify } from './utils'

/**
 * The single entry point for "ask Gideon a question". Used by the composer and
 * the example chips. Creates a stable answer id from the query and navigates to
 * the answer route with the URL state that drives the generative experience.
 */
export function useAsk() {
  const navigate = useNavigate()
  return useCallback(
    (query: string) => {
      const q = query.trim()
      if (!q) return
      const answerId = slugify(q)
      void navigate({
        to: '/answer/$answerId',
        params: { answerId },
        search: (prev) => ({
          ...prev,
          q,
          mode: 'thinking',
          view: 'summary',
          session: shortId('sess'),
        }),
      })
    },
    [navigate],
  )
}
