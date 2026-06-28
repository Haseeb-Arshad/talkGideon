import { ArrowUpRight } from 'lucide-react'

interface FollowUpChipsProps {
  prompts: string[]
  onPick: (prompt: string) => void
}

export function FollowUpChips({ prompts, onPick }: FollowUpChipsProps) {
  return (
    <div className="chips" style={{ justifyContent: 'flex-start' }}>
      {prompts.map((p) => (
        <button type="button" className="chip" key={p} onClick={() => onPick(p)}>
          <span>{p}</span>
          <ArrowUpRight aria-hidden="true" />
        </button>
      ))}
    </div>
  )
}
