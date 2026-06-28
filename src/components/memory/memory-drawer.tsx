import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useSearch } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { BookOpen, Bookmark, Eraser, FolderOpen, Sparkles, X } from 'lucide-react'
import { IconButton } from '../ui/icon-button'
import { ObsidianStatus } from './obsidian-status'
import { RecentMemoryList } from './recent-memory-list'
import { MemoryUsedCard } from './memory-used-card'
import { memoryQuery } from '../../lib/queries'
import { resolveAnswer } from '../../lib/data/mock-answer'
import type { GideonSearch } from '../../lib/search'

/**
 * Memory as invisible intelligence — a calm right-hand drawer, not a vault
 * browser. Shows Obsidian status, what's shaping the current answer, active
 * context, and recent/saved memories.
 */
export function MemoryDrawer({ onClose }: { onClose: () => void }) {
  const { data } = useQuery(memoryQuery())
  const search = useSearch({ strict: false }) as Partial<GideonSearch>
  const usedInAnswer = search.q ? resolveAnswer(search.q).memoryUsed : []

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <motion.div
        className="scrim"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      />
      <motion.aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Memory"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'tween', duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
      >
        <div className="drawer-head">
          <div className="dt">
            <span className="micon" aria-hidden="true">
              <BookOpen />
            </span>
            <h2>Memory</h2>
          </div>
          <IconButton label="Close memory" onClick={onClose}>
            <X />
          </IconButton>
        </div>

        <div className="drawer-body scroll">
          <ObsidianStatus connected={data?.obsidianConnected ?? true} vaultName={data?.vaultName ?? 'Gideon'} />

          {usedInAnswer.length > 0 && (
            <div className="mem-group">
              <div className="gl">
                <Sparkles aria-hidden="true" /> Shaping this answer
              </div>
              <MemoryUsedCard items={usedInAnswer} />
            </div>
          )}

          {data && (
            <>
              <div className="mem-group">
                <div className="gl">Active context</div>
                <RecentMemoryList memories={data.active} active />
              </div>
              <div className="mem-group">
                <div className="gl">Recent</div>
                <RecentMemoryList memories={data.recent} />
              </div>
              <div className="mem-group">
                <div className="gl">Saved insights</div>
                <RecentMemoryList memories={data.saved} />
              </div>
            </>
          )}

          <div className="drawer-actions">
            <button type="button" className="vault-btn">
              <FolderOpen aria-hidden="true" /> Open vault
            </button>
            <button type="button" className="vault-btn ghost">
              <Bookmark aria-hidden="true" /> Save this insight
            </button>
            <button type="button" className="vault-btn ghost">
              <Eraser aria-hidden="true" /> Clear active context
            </button>
          </div>
        </div>
      </motion.aside>
    </>
  )
}
