/** Long-term memory — surfaced quietly, stored in Obsidian later. */

export type MemoryType =
  | 'preference'
  | 'project'
  | 'fact'
  | 'instruction'
  | 'decision'

export type MemorySource = 'conversation' | 'manual' | 'imported' | 'obsidian'

export interface Memory {
  id: string
  title: string
  content: string
  type: MemoryType
  source: MemorySource
  /** 0–1 confidence the memory is accurate / still relevant. */
  confidence: number
  tags: string[]
  updatedAt: string
}

export interface MemorySnapshot {
  obsidianConnected: boolean
  vaultName: string
  /** Memories actively shaping the current context. */
  active: Memory[]
  /** Recently learned, newest first. */
  recent: Memory[]
  /** Explicitly saved insights. */
  saved: Memory[]
}
