import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { PageContainer } from '../components/layout/page-container'
import { SoftCard } from '../components/ui/soft-card'
import { SectionLabel } from '../components/ui/section-label'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

interface ToggleProps {
  label: string
  description: string
  defaultOn?: boolean
}

function Toggle({ label, description, defaultOn = false }: ToggleProps) {
  const [on, setOn] = useState(defaultOn)
  return (
    <div className="setting-row">
      <div>
        <div className="st">{label}</div>
        <div className="ss">{description}</div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => setOn((v) => !v)}
        style={{
          width: 46,
          height: 28,
          flex: 'none',
          borderRadius: 100,
          padding: 3,
          background: on ? 'var(--sage)' : 'var(--line-strong)',
          transition: 'background 0.2s',
          display: 'flex',
          justifyContent: on ? 'flex-end' : 'flex-start',
        }}
      >
        <span
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 3px rgba(58,50,38,0.3)',
          }}
        />
      </button>
    </div>
  )
}

function SettingsPage() {
  return (
    <PageContainer narrow>
      <h1 className="page-title">Settings</h1>
      <p className="page-lede">Tune how Gideon looks, listens, and remembers.</p>

      <div style={{ marginTop: 26 }}>
        <SectionLabel>Voice</SectionLabel>
        <SoftCard>
          <Toggle label="Voice replies" description="Gideon speaks answers aloud as they’re composed." defaultOn />
          <Toggle label="Push-to-talk" description="Hold the mic to talk instead of toggling." />
        </SoftCard>
      </div>

      <div style={{ marginTop: 22 }}>
        <SectionLabel>Appearance & motion</SectionLabel>
        <SoftCard>
          <Toggle label="Reduce motion" description="Calm the orb and reveal animations." />
          <Toggle label="Generative answers" description="Build visual interfaces instead of plain text." defaultOn />
        </SoftCard>
      </div>

      <div style={{ marginTop: 22 }}>
        <SectionLabel>Memory</SectionLabel>
        <SoftCard>
          <Toggle label="Connect Obsidian" description="Store long-term memory in your Obsidian vault." defaultOn />
          <Toggle label="Remember automatically" description="Capture preferences and decisions as you talk." defaultOn />
        </SoftCard>
      </div>
    </PageContainer>
  )
}
