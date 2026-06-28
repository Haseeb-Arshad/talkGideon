import type { ComparisonTableBlock } from '../../lib/types'
import { SoftCard } from '../ui/soft-card'

export function ComparisonTable({ block }: { block: ComparisonTableBlock }) {
  return (
    <SoftCard>
      <div className="compare-head">
        <div className="compare-vs">
          <span className="name">
            <span className="swatch a" aria-hidden="true" />
            {block.a.name}
          </span>
          <span className="x">vs</span>
          <span className="name">
            <span className="swatch b" aria-hidden="true" />
            {block.b.name}
          </span>
        </div>
      </div>
      <div role="table" aria-label={`${block.a.name} versus ${block.b.name}`}>
        {block.rows.map((row) => (
          <div className="crow" role="row" key={row.dimension}>
            <div className="dim" role="rowheader">
              {row.dimension}
            </div>
            <div className={row.a.win ? 'cell win' : 'cell'} role="cell">
              <div className="v">{row.a.value}</div>
              {row.a.note && <div className="n">{row.a.note}</div>}
            </div>
            <div className={row.b.win ? 'cell win' : 'cell'} role="cell">
              <div className="v">{row.b.value}</div>
              {row.b.note && <div className="n">{row.b.note}</div>}
            </div>
          </div>
        ))}
      </div>
    </SoftCard>
  )
}
