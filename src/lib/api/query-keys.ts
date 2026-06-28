/** Centralized TanStack Query keys — one source of truth for cache invalidation. */
export const queryKeys = {
  sessions: () => ['sessions'] as const,
  session: (id: string) => ['sessions', id] as const,
  answer: (id: string, query?: string) => ['answer', id, query ?? ''] as const,
  sources: (query: string) => ['sources', query] as const,
  memory: () => ['memory'] as const,
}

export type QueryKeys = typeof queryKeys
