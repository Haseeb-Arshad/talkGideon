import { motion } from 'framer-motion'
import { AlertTriangle, Code2 } from 'lucide-react'
import type { AnswerBlock } from '../../lib/types'
import { SoftCard, CardEyebrow } from '../ui/soft-card'
import { SummaryCard } from './summary-card'
import { ComparisonTable } from './comparison-table'
import { RecommendationCard } from './recommendation-card'
import { ArchitectureCard } from './architecture-card'
import { WorkflowCard } from './workflow-card'

/** Block types that span the full canvas width. */
const FULL_WIDTH = new Set<AnswerBlock['type']>(['summary', 'comparison', 'recommendation'])

function renderBlock(block: AnswerBlock) {
  switch (block.type) {
    case 'summary':
      return <SummaryCard block={block} />
    case 'comparison':
      return <ComparisonTable block={block} />
    case 'recommendation':
      return <RecommendationCard block={block} />
    case 'timeline':
      return <ArchitectureCard block={block} />
    case 'workflow':
      return <WorkflowCard block={block} />
    case 'note':
      return (
        <SoftCard>
          {block.eyebrow && <CardEyebrow>{block.eyebrow}</CardEyebrow>}
          <h3>{block.title}</h3>
          <p>{block.body}</p>
        </SoftCard>
      )
    case 'warning':
      return (
        <SoftCard className="warn-card">
          <CardEyebrow>
            <AlertTriangle aria-hidden="true" /> Heads up
          </CardEyebrow>
          <h3>{block.title}</h3>
          <p>{block.body}</p>
        </SoftCard>
      )
    case 'code':
      return (
        <SoftCard>
          <CardEyebrow>
            <Code2 aria-hidden="true" /> {block.language}
          </CardEyebrow>
          <pre
            style={{
              margin: 0,
              overflowX: 'auto',
              fontSize: 13,
              lineHeight: 1.6,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              color: 'var(--ink-soft)',
            }}
          >
            <code>{block.code}</code>
          </pre>
          {block.caption && <p style={{ marginTop: 12, fontSize: 13 }}>{block.caption}</p>}
        </SoftCard>
      )
    default:
      return null
  }
}

interface GeneratedSectionProps {
  block: AnswerBlock
  index: number
}

/**
 * Renders one block, wrapped in a staggered reveal so the canvas appears to
 * assemble itself rather than popping in all at once.
 */
export function GeneratedSection({ block, index }: GeneratedSectionProps) {
  const node = renderBlock(block)
  if (!node) return null
  return (
    <motion.div
      className={FULL_WIDTH.has(block.type) ? 'span-2' : undefined}
      initial={{ opacity: 0, transform: 'translateY(16px)' }}
      animate={{ opacity: 1, transform: 'translateY(0px)' }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.06, 0.42), ease: [0.23, 1, 0.32, 1] }}
    >
      {node}
    </motion.div>
  )
}
