import { Gauge } from 'lucide-react'

interface LatencyBadgeProps {
  ms: number
}

/** Subtle latency readout — tabular, quiet, premium. */
export function LatencyBadge({ ms }: LatencyBadgeProps) {
  const label = ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`
  return (
    <span className="latency" title="Time to answer">
      <Gauge aria-hidden="true" />
      {label}
    </span>
  )
}
