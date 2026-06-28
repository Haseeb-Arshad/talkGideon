import { useEffect, useRef, useState } from 'react'
import { useSpeech } from '../../lib/voice/use-speech'
import { AttachmentButton } from './attachment-button'
import { VoiceButton } from './voice-button'
import { SendButton } from './send-button'

interface ComposerProps {
  onSubmit: (text: string) => void
  recording?: boolean
  onToggleVoice?: () => void
  disabled?: boolean
  placeholder?: string
}

/**
 * The single Gideon composer. Text + voice + attachment + send.
 * Keyboard: Enter submits, Shift+Enter newline, Escape clears/blurs,
 * Cmd/Ctrl+K focuses from anywhere.
 */
export function Composer({
  onSubmit,
  recording = false,
  onToggleVoice,
  disabled = false,
  placeholder = 'Ask Gideon anything…',
}: ComposerProps) {
  const [value, setValue] = useState('')
  const [sending, setSending] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)

  // Live dictation: while recording, the transcript drives the field. When the
  // browser ends the session on its own, drop back out of listening state.
  useSpeech({
    active: recording,
    onTranscript: (text) => setValue(text),
    onEnd: () => {
      if (recording) onToggleVoice?.()
    },
  })

  // Auto-grow the textarea up to the CSS max-height.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [value])

  // Cmd/Ctrl+K focuses the composer from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        ref.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const submit = () => {
    const text = value.trim()
    if (!text || disabled || sending) return
    setSending(true)
    onSubmit(text)
    setValue('')
    // Navigation takes over; release the lock shortly after.
    window.setTimeout(() => setSending(false), 400)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    } else if (e.key === 'Escape') {
      if (value) setValue('')
      else ref.current?.blur()
    }
  }

  const canSend = value.trim().length > 0 && !disabled && !sending

  return (
    <form
      className="composer"
      data-disabled={disabled || undefined}
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <AttachmentButton disabled={disabled} />
      <textarea
        ref={ref}
        className="field"
        rows={1}
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        disabled={disabled}
        aria-label="Message Gideon"
        autoComplete="off"
        spellCheck
      />
      <VoiceButton recording={recording} onClick={onToggleVoice} disabled={disabled} />
      <SendButton disabled={!canSend} />
    </form>
  )
}
