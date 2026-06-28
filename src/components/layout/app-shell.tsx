import type { ReactNode } from 'react'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { AnimatePresence } from 'framer-motion'
import { TopBar } from './top-bar'
import { Composer } from '../composer/composer'
import { MemoryDrawer } from '../memory/memory-drawer'
import type { GideonSearch } from '../../lib/search'
import { useAsk } from '../../lib/use-ask'

/**
 * The persistent app frame: top bar, the scrolling stage (route outlet), the
 * one-and-only composer dock, and the memory drawer. No sidebar, no second
 * input — the whole product is one fluid surface across routes.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const search = useSearch({ strict: false }) as Partial<GideonSearch>
  const navigate = useNavigate()
  const ask = useAsk()

  const mode = search.mode ?? 'idle'
  const memOpen = Boolean(search.mem)
  const recording = mode === 'listening'

  const patchSearch = (patch: Partial<GideonSearch>) =>
    void navigate({ to: '.', search: (prev) => ({ ...prev, ...patch }), replace: true })

  return (
    <div className="shell">
      <TopBar mode={mode} memOpen={memOpen} onToggleMemory={() => patchSearch({ mem: !memOpen })} />

      <main className="stage scroll">{children}</main>

      <div className="composer-dock">
        <Composer
          recording={recording}
          onToggleVoice={() => patchSearch({ mode: recording ? 'idle' : 'listening' })}
          onSubmit={(text) => ask(text)}
        />
      </div>

      <AnimatePresence>
        {memOpen && <MemoryDrawer onClose={() => patchSearch({ mem: false })} />}
      </AnimatePresence>
    </div>
  )
}
