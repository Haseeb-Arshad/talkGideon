import { Brain } from 'lucide-react'
import { MemoryPill } from './memory-pill'

interface MemoryUsedCardProps {
  items: string[]
}

/** The quiet "memory shaped this answer" band. */
export function MemoryUsedCard({ items }: MemoryUsedCardProps) {
  if (items.length === 0) return null
  return (
    <div className="mem-used">
      <span className="ml">
        <Brain aria-hidden="true" /> Memory used
      </span>
      {items.map((t) => (
        <MemoryPill key={t}>{t}</MemoryPill>
      ))}
    </div>
  )
}
