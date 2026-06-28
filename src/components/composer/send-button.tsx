import { ArrowUp } from 'lucide-react'

interface SendButtonProps {
  disabled?: boolean
}

export function SendButton({ disabled }: SendButtonProps) {
  return (
    <button type="submit" className="send" disabled={disabled} aria-label="Send message">
      <ArrowUp aria-hidden="true" />
    </button>
  )
}
