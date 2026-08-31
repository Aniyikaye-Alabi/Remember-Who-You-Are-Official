import { audioContext } from './unlock'
import type { ChimeId } from '../domain/types'

type Partial_ = { freq: number; at: number; dur: number; gain: number; type?: OscillatorType }

/** Synthesized rather than loaded from files: no assets to ship, no CORS, no
 *  decode latency, and volume is a single gain node. */
const RECIPES: Record<ChimeId, Partial_[]> = {
  bell: [
    { freq: 880, at: 0, dur: 1.4, gain: 1, type: 'sine' },
    { freq: 1320, at: 0, dur: 0.9, gain: 0.35, type: 'sine' },
  ],
  twoTone: [
    { freq: 660, at: 0, dur: 0.5, gain: 1, type: 'triangle' },
    { freq: 990, at: 0.22, dur: 0.6, gain: 0.9, type: 'triangle' },
  ],
  gong: [
    { freq: 180, at: 0, dur: 2.4, gain: 1, type: 'sine' },
    { freq: 271, at: 0.02, dur: 2.0, gain: 0.5, type: 'sine' },
    { freq: 415, at: 0.04, dur: 1.4, gain: 0.22, type: 'sine' },
  ],
}

export const CHIME_IDS = Object.keys(RECIPES) as ChimeId[]

export const CHIME_LABELS: Record<ChimeId, string> = {
  bell: 'Soft bell',
  twoTone: 'Two-tone',
  gong: 'Low gong',
}

/** Plays the chime and resolves when the last partial has decayed. */
export function playChime(id: ChimeId, volume = 0.6): Promise<void> {
  const ac = audioContext()
  if (ac.state !== 'running') return Promise.resolve()

  const recipe = RECIPES[id] ?? RECIPES.bell
  const master = ac.createGain()
  master.gain.value = Math.max(0, Math.min(1, volume))
  master.connect(ac.destination)

  const now = ac.currentTime
  let end = now

  for (const p of recipe) {
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = p.type ?? 'sine'
    osc.frequency.value = p.freq

    const start = now + p.at
    const stop = start + p.dur
    // Exponential decay reads as a struck object; a linear ramp sounds synthetic.
    g.gain.setValueAtTime(0.0001, start)
    g.gain.exponentialRampToValueAtTime(p.gain, start + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, stop)

    osc.connect(g)
    g.connect(master)
    osc.start(start)
    osc.stop(stop + 0.02)
    end = Math.max(end, stop)
  }

  return new Promise((resolve) => {
    window.setTimeout(() => {
      master.disconnect()
      resolve()
    }, Math.max(0, (end - now) * 1000) + 40)
  })
}
