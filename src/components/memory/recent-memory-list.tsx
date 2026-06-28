import type { Memory } from '../../lib/types'

interface RecentMemoryListProps {
  memories: Memory[]
  active?: boolean
}

/** Compact list of memories — type badge, time, and the remembered content. */
export function RecentMemoryList({ memories, active }: RecentMemoryListProps) {
  if (memories.length === 0) {
    return <p style={{ fontSize: 13, color: 'var(--faint)' }}>Nothing here yet.</p>
  }
  return (
    <div>
      {memories.map((m) => (
        <div className={active ? 'mem active' : 'mem'} key={m.id}>
          <div className="mtop">
            <span className="badge">{m.type}</span>
            <span className="mtime">{m.updatedAt}</span>
          </div>
          {m.content}
        </div>
      ))}
    </div>
  )
}
