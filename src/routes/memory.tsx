import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { PageContainer } from '../components/layout/page-container'
import { SectionLabel } from '../components/ui/section-label'
import { ObsidianStatus } from '../components/memory/obsidian-status'
import { RecentMemoryList } from '../components/memory/recent-memory-list'
import { memoryQuery } from '../lib/queries'

export const Route = createFileRoute('/memory')({
  component: MemoryPage,
})

/** A quiet overview of long-term memory. Intentionally not visually dominant. */
function MemoryPage() {
  const { data } = useQuery(memoryQuery())

  return (
    <PageContainer narrow>
      <h1 className="page-title">Memory</h1>
      <p className="page-lede">
        What Gideon keeps in mind — preferences, projects, and decisions. Stored in Obsidian, surfaced
        quietly while you work.
      </p>

      <div style={{ marginTop: 22 }}>
        <ObsidianStatus connected={data?.obsidianConnected ?? true} vaultName={data?.vaultName ?? 'Gideon'} />
      </div>

      {data && (
        <>
          <div style={{ marginTop: 6 }}>
            <SectionLabel count={data.active.length}>Active context</SectionLabel>
            <RecentMemoryList memories={data.active} active />
          </div>
          <div style={{ marginTop: 22 }}>
            <SectionLabel count={data.recent.length}>Recent</SectionLabel>
            <RecentMemoryList memories={data.recent} />
          </div>
          <div style={{ marginTop: 22 }}>
            <SectionLabel count={data.saved.length}>Saved insights</SectionLabel>
            <RecentMemoryList memories={data.saved} />
          </div>
        </>
      )}
    </PageContainer>
  )
}
