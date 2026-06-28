/** A single interaction session (one question → one generated answer). */

export type AssistantMode =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'searching'
  | 'answering'
  | 'ready'
  | 'error'

export const ASSISTANT_MODES: AssistantMode[] = [
  'idle',
  'listening',
  'thinking',
  'searching',
  'answering',
  'ready',
  'error',
]

export interface Session {
  id: string
  query: string
  title: string
  createdAt: string
  mode: AssistantMode
  answerId?: string
}
