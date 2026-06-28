import { Paperclip } from 'lucide-react'

interface AttachmentButtonProps {
  onClick?: () => void
  disabled?: boolean
}

export function AttachmentButton({ onClick, disabled }: AttachmentButtonProps) {
  return (
    <button
      type="button"
      className="tool"
      onClick={onClick}
      disabled={disabled}
      aria-label="Add an attachment"
      title="Add attachment"
    >
      <Paperclip aria-hidden="true" />
    </button>
  )
}
