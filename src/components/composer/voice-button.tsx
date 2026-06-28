import { Mic } from 'lucide-react'

interface VoiceButtonProps {
  recording: boolean
  onClick?: () => void
  disabled?: boolean
}

export function VoiceButton({ recording, onClick, disabled }: VoiceButtonProps) {
  return (
    <button
      type="button"
      className={recording ? 'tool mic live' : 'tool mic'}
      onClick={onClick}
      disabled={disabled}
      aria-pressed={recording}
      aria-label={recording ? 'Stop voice input' : 'Speak to Gideon'}
      title={recording ? 'Stop' : 'Speak'}
    >
      <Mic aria-hidden="true" />
    </button>
  )
}
