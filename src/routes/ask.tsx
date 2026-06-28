import { createFileRoute, useSearch } from '@tanstack/react-router'
import { PageContainer } from '../components/layout/page-container'
import { GideonOrb, orbStateForMode } from '../components/assistant/gideon-orb'
import { VoiceStateIndicator } from '../components/assistant/voice-state-indicator'

export const Route = createFileRoute('/ask')({
  component: AskPage,
})

/**
 * The voice-first surface. The orb takes the stage; the (shell) composer stays
 * docked below. Land here to speak; submitting routes to the generated answer.
 */
function AskPage() {
  const search = useSearch({ from: '/ask' })
  const mode = search.mode ?? 'idle'
  const listening = mode === 'listening'

  return (
    <PageContainer narrow>
      <div className="empty">
        <GideonOrb state={orbStateForMode(mode)} size={132} />
        <h1>{listening ? <>I’m <em>listening.</em></> : <>Talk it <em>through.</em></>}</h1>
        <p className="lede">
          {listening
            ? 'Go ahead — ask anything. I’ll search, compare, and build a visual answer.'
            : 'Tap the mic to speak, or type below. I’ll turn it into a structured answer.'}
        </p>
        <div style={{ marginTop: 28 }}>
          <VoiceStateIndicator mode={mode} />
        </div>
      </div>
    </PageContainer>
  )
}
