import type { SourceRef } from '../../lib/types'
import { domainInitial } from '../../lib/utils'

function Inner({ source }: { source: SourceRef }) {
  return (
    <>
      <div className="fav" aria-hidden="true">
        {domainInitial(source.domain)}
      </div>
      <div className="stitle">{source.title}</div>
      <div className="smeta">
        <span className="dom">{source.domain}</span>
        {source.kind && <span>· {source.kind}</span>}
      </div>
      {source.snippet && <div className="snip">{source.snippet}</div>}
    </>
  )
}

export function SourceCard({ source }: { source: SourceRef }) {
  if (source.url) {
    return (
      <a className="source" href={source.url} target="_blank" rel="noreferrer">
        <Inner source={source} />
      </a>
    )
  }
  return (
    <div className="source">
      <Inner source={source} />
    </div>
  )
}
