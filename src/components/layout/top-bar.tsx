import { Link } from '@tanstack/react-router'
import { Sparkles, BookOpen } from 'lucide-react'
import type { AssistantMode } from '../../lib/types'
import { StatusPill } from '../ui/status-pill'
import { IconButton } from '../ui/icon-button'

interface TopBarProps {
  mode: AssistantMode
  memOpen: boolean
  onToggleMemory: () => void
}

/** No sidebar — a single calm top bar carries brand, nav, status, and memory. */
export function TopBar({ mode, memOpen, onToggleMemory }: TopBarProps) {
  return (
    <header className="topbar">
      <Link to="/" search={(prev) => prev} className="brand" aria-label="Gideon home">
        <span className="mark" aria-hidden="true">
          <Sparkles />
        </span>
        <span className="name">Gideon</span>
      </Link>

      <div className="topbar-right">
        <nav className="topbar-nav" aria-label="Primary">
          <Link to="/ask" search={(prev) => prev} activeProps={{ 'data-active': 'true' }}>
            Ask
          </Link>
          <Link to="/memory" search={(prev) => prev} activeProps={{ 'data-active': 'true' }}>
            Memory
          </Link>
          <Link to="/settings" search={(prev) => prev} activeProps={{ 'data-active': 'true' }}>
            Settings
          </Link>
        </nav>

        <StatusPill mode={mode} />

        <IconButton
          label={memOpen ? 'Close memory' : 'Open memory'}
          dot={!memOpen}
          aria-expanded={memOpen}
          onClick={onToggleMemory}
        >
          <BookOpen />
        </IconButton>
      </div>
    </header>
  )
}
