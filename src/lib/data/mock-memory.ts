import type { Memory, MemorySnapshot } from '../types'

const m = (
  id: string,
  title: string,
  content: string,
  type: Memory['type'],
  source: Memory['source'],
  confidence: number,
  tags: string[],
  updatedAt: string,
): Memory => ({ id, title, content, type, source, confidence, tags, updatedAt })

export const MEMORY_SNAPSHOT: MemorySnapshot = {
  obsidianConnected: true,
  vaultName: 'Gideon',
  active: [
    m('mem-voice', 'Voice-first assistant', 'Building Gideon as a voice-first personal intelligence assistant.', 'project', 'conversation', 0.98, ['gideon', 'voice'], 'today'),
    m('mem-go', 'Go for low-latency', 'Prefers Go for low-latency backend services.', 'preference', 'conversation', 0.95, ['backend', 'go'], '2d'),
  ],
  recent: [
    m('mem-warm', 'Warm minimal UI', 'Prefers a warm, minimal UI over a neon dashboard look.', 'preference', 'conversation', 0.97, ['design'], 'today'),
    m('mem-obsidian', 'Obsidian as memory', 'Wants long-term memory stored in Obsidian.', 'instruction', 'conversation', 0.9, ['memory', 'obsidian'], '2d'),
    m('mem-latency', 'Sub-200ms target', 'Targeting sub-200ms voice round-trips.', 'fact', 'conversation', 0.85, ['voice', 'latency'], '4d'),
    m('mem-exa', 'Exa for web search', 'Uses Exa for web search.', 'fact', 'imported', 0.8, ['search'], '5d'),
    m('mem-host', 'Hosted on talkgideon.com', 'Gideon is hosted on talkgideon.com.', 'project', 'manual', 0.92, ['hosting'], '1w'),
  ],
  saved: [
    m('mem-lang', 'Design language', 'Gideon design language — warm minimalism, editorial type, sage accents.', 'decision', 'manual', 0.99, ['design', 'decision'], '1w'),
    m('mem-pipeline', 'Voice pipeline decision', 'Voice pipeline — Go gateway + Node brain over gRPC.', 'decision', 'manual', 0.96, ['architecture', 'decision'], '1w'),
  ],
}

/** Flat list for the /memory overview page. */
export const ALL_MEMORIES: Memory[] = [
  ...MEMORY_SNAPSHOT.active,
  ...MEMORY_SNAPSHOT.recent,
  ...MEMORY_SNAPSHOT.saved,
]
