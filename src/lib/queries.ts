import { queryOptions } from '@tanstack/react-query'
import { queryKeys } from './api/query-keys'
import { fetchAnswer, fetchMemory, fetchSessions, fetchSources } from './api/mock-api'

/** Query option factories — used by both route loaders and components. */

export const sessionsQuery = () =>
  queryOptions({ queryKey: queryKeys.sessions(), queryFn: fetchSessions })

export const memoryQuery = () =>
  queryOptions({ queryKey: queryKeys.memory(), queryFn: fetchMemory })

export const answerQuery = (id: string, query?: string) =>
  queryOptions({
    queryKey: queryKeys.answer(id, query),
    queryFn: () => fetchAnswer(id, query),
    staleTime: 5 * 60 * 1000,
  })

export const sourcesQuery = (query: string) =>
  queryOptions({
    queryKey: queryKeys.sources(query),
    queryFn: () => fetchSources(query),
    enabled: query.length > 0,
  })
