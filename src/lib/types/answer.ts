/**
 * Generated-answer schema.
 *
 * An Answer is a composition of typed blocks. The canvas renders only the
 * blocks present (in priority order), so any query can produce a coherent,
 * bespoke layout — never a wall of chat text. This shape is designed to be
 * produced 1:1 by the real backend later (see `events.ts` for streaming).
 */

export type AnswerStatus =
  | 'idle'
  | 'thinking'
  | 'searching'
  | 'answering'
  | 'ready'
  | 'error'

export type BlockDisplayMode = 'compact' | 'full' | 'inline'

export type AnswerBlockType =
  | 'summary'
  | 'comparison'
  | 'recommendation'
  | 'sources'
  | 'timeline'
  | 'workflow'
  | 'code'
  | 'warning'
  | 'followup'
  | 'note'

export interface BaseBlock {
  id: string
  type: AnswerBlockType
  /** Lower numbers render first. */
  priority: number
  createdAt: string
  displayMode?: BlockDisplayMode
}

export interface SummaryBlock extends BaseBlock {
  type: 'summary'
  lead: string
  tags?: string[]
}

export interface ComparisonCell {
  value: string
  note?: string
  win?: boolean
}

export interface ComparisonRow {
  dimension: string
  a: ComparisonCell
  b: ComparisonCell
}

export interface ComparisonTableBlock extends BaseBlock {
  type: 'comparison'
  a: { name: string }
  b: { name: string }
  rows: ComparisonRow[]
}

export interface RecommendationLine {
  side: 'a' | 'b'
  pin: string
  text: string
}

export interface RecommendationBlock extends BaseBlock {
  type: 'recommendation'
  /** May contain light inline <b> emphasis. */
  verdict: string
  lines?: RecommendationLine[]
}

export interface SourceRef {
  id: string
  title: string
  domain: string
  url?: string
  snippet?: string
  kind?: string
}

export interface SourceGridBlock extends BaseBlock {
  type: 'sources'
  sources: SourceRef[]
}

export interface TimelineItem {
  title: string
  sub?: string
}

/** Used for architecture / flow diagrams (left-to-right nodes). */
export interface TimelineBlock extends BaseBlock {
  type: 'timeline'
  title: string
  nodes: TimelineItem[]
}

export interface WorkflowStep {
  title: string
  detail?: string
}

export interface WorkflowBlock extends BaseBlock {
  type: 'workflow'
  title: string
  steps: WorkflowStep[]
}

export interface CodeBlock extends BaseBlock {
  type: 'code'
  language: string
  code: string
  caption?: string
}

export interface WarningBlock extends BaseBlock {
  type: 'warning'
  title: string
  body: string
}

export interface FollowUpBlock extends BaseBlock {
  type: 'followup'
  prompts: string[]
}

/** Generic prose card — "best of both worlds", context notes, etc. */
export interface NoteBlock extends BaseBlock {
  type: 'note'
  eyebrow?: string
  title: string
  body: string
}

export type AnswerBlock =
  | SummaryBlock
  | ComparisonTableBlock
  | RecommendationBlock
  | SourceGridBlock
  | TimelineBlock
  | WorkflowBlock
  | CodeBlock
  | WarningBlock
  | FollowUpBlock
  | NoteBlock

export interface Answer {
  id: string
  query: string
  title: string
  subtitle: string
  status: AnswerStatus
  /** Concise, natural-language answer for TTS. */
  spokenAnswer: string
  /** Short lead shown if blocks fail / for the "raw" view. */
  displayAnswer: string
  blocks: AnswerBlock[]
  sources: SourceRef[]
  memoryUsed: string[]
  suggestedFollowUps: string[]
  latencyMs: number
  createdAt: string
  /** Whether answering this involved a web search (drives the "searching" phase). */
  requiresSearch?: boolean
}

/** The four answer views surfaced as tabs / URL `view` param. */
export type AnswerView = 'summary' | 'sources' | 'memory' | 'raw'
export const ANSWER_VIEWS: AnswerView[] = ['summary', 'sources', 'memory', 'raw']
