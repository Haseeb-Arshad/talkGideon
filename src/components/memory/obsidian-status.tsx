interface ObsidianStatusProps {
  connected: boolean
  vaultName: string
}

/** A subtle "Obsidian connected" row — invisible intelligence, not a file browser. */
export function ObsidianStatus({ connected, vaultName }: ObsidianStatusProps) {
  return (
    <div className="obs-status">
      <span className="od" aria-hidden="true" />
      <span className="ot">{connected ? 'Obsidian connected' : 'Obsidian ready'}</span>
      <span className="os">{vaultName}</span>
    </div>
  )
}
