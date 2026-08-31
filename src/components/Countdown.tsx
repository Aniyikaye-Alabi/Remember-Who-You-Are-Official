import { useEffect, useState } from 'react'

function format(ms: number): string {
  if (ms <= 0) return 'now'
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}

/** Re-renders once a second on its own so the rest of the tree does not have to. */
export default function Countdown({ at }: { at: number | null }) {
  const [, force] = useState(0)

  useEffect(() => {
    if (at === null) return
    const h = window.setInterval(() => force((n) => n + 1), 1000)
    return () => window.clearInterval(h)
  }, [at])

  if (at === null) return <span className="text-ink-mute">not scheduled</span>
  return <span>{format(at - Date.now())}</span>
}
