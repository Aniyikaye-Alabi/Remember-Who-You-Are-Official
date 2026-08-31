import { describe, it, expect } from 'vitest'
import { planTick, signature } from './tick'
import type { FireSlot } from './tick'
import type { Ritual, Weekday } from '../domain/types'

const ALL_DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6]

const hourlyRitual = (overrides: Partial<Ritual> = {}): Ritual => ({
  id: 'r1',
  name: 'Focus check',
  enabled: true,
  nuggetIds: 'all',
  pick: 'sequential',
  schedule: {
    kind: 'interval',
    everyMinutes: 60,
    window: { start: '00:00', end: '23:00' },
    days: ALL_DAYS,
  },
  delivery: {
    chime: true,
    chimeId: 'bell',
    volume: 0.6,
    speak: true,
    notify: false,
    overlay: true,
  },
  cursor: 0,
  shuffle: [],
  lastFiredAt: null,
  ...overrides,
})

// 2025-03-05 is a Wednesday.
const at = (h: number, m = 0) => new Date(2025, 2, 5, h, m, 0, 0)

/** Run the scheduler from a cold start and return its armed state. */
function arm(ritual: Ritual, now: Date): Record<string, FireSlot> {
  return planTick([ritual], true, {}, now).next
}

describe('planTick — arming', () => {
  it('sets a target without firing on the tick that arms a ritual', () => {
    const r = hourlyRitual()
    const result = planTick([r], true, {}, at(10, 30))
    expect(result.dueRitualId).toBeNull()
    expect(result.next[r.id].at).toBe(at(11).getTime())
  })

  it('clears the target when disarmed, and does not fire', () => {
    const r = hourlyRitual()
    const armed = arm(r, at(10, 30))
    const result = planTick([r], false, armed, at(11, 30))
    expect(result.dueRitualId).toBeNull()
    expect(result.next[r.id].at).toBeNull()
  })

  it('clears the target for a ritual switched off individually', () => {
    const r = hourlyRitual()
    const armed = arm(r, at(10, 30))
    const off = { ...r, enabled: false }
    const result = planTick([off], true, armed, at(11, 30))
    expect(result.dueRitualId).toBeNull()
    expect(result.next[off.id].at).toBeNull()
  })
})

describe('planTick — firing', () => {
  it('does not fire before the target', () => {
    const r = hourlyRitual()
    const armed = arm(r, at(10, 30))
    expect(planTick([r], true, armed, at(10, 59)).dueRitualId).toBeNull()
  })

  it('fires once the target is reached', () => {
    const r = hourlyRitual()
    const armed = arm(r, at(10, 30))
    const result = planTick([r], true, armed, at(11))
    expect(result.dueRitualId).toBe(r.id)
    expect(result.next[r.id].at).toBe(at(12).getTime())
  })

  it('fires exactly once after sleeping through three hours of missed fires', () => {
    const r = hourlyRitual()
    let state = arm(r, at(10, 30))

    // The machine slept: no ticks happened between 10:30 and 14:05.
    let fires = 0
    const wake = planTick([r], true, state, at(14, 5))
    if (wake.dueRitualId) fires++
    state = wake.next

    // Ticks resume normally afterwards; nothing else should be owed until 15:00.
    for (let m = 6; m <= 54; m += 6) {
      const t = planTick([r], true, state, at(14, m))
      if (t.dueRitualId) fires++
      state = t.next
    }

    expect(fires).toBe(1)
    // The next target is computed from NOW, not advanced from the missed 11:00.
    expect(state[r.id].at).toBe(at(15).getTime())
  })

  it('fires at most one ritual per tick', () => {
    const a = hourlyRitual({ id: 'a', name: 'A' })
    const b = hourlyRitual({ id: 'b', name: 'B' })
    const state = planTick([a, b], true, {}, at(10, 30)).next
    const result = planTick([a, b], true, state, at(11))
    expect(result.dueRitualId).toBe('a')
  })
})

describe('planTick — edits and deletions', () => {
  it('recomputes when the schedule is edited', () => {
    const r = hourlyRitual()
    const state = arm(r, at(10, 30))
    const edited = hourlyRitual({
      schedule: { kind: 'times', times: ['16:00'], days: ALL_DAYS },
    })
    const result = planTick([edited], true, state, at(10, 31))
    expect(result.dueRitualId).toBeNull()
    expect(result.next[r.id].at).toBe(at(16).getTime())
    expect(result.changed).toBe(true)
  })

  it('drops deleted rituals from the map and reports a change', () => {
    const a = hourlyRitual({ id: 'a' })
    const b = hourlyRitual({ id: 'b' })
    const state = planTick([a, b], true, {}, at(10, 30)).next
    const result = planTick([a], true, state, at(10, 31))
    expect(Object.keys(result.next)).toEqual(['a'])
    expect(result.changed).toBe(true)
  })

  it('reports no change on a quiet tick, so the store is not churned every second', () => {
    const r = hourlyRitual()
    const state = arm(r, at(10, 30))
    expect(planTick([r], true, state, at(10, 31)).changed).toBe(false)
  })

  it('parks a ritual whose schedule can never fire', () => {
    const r = hourlyRitual({
      schedule: { kind: 'interval', everyMinutes: 60, window: { start: '09:00', end: '18:00' }, days: [] },
    })
    const result = planTick([r], true, {}, at(10, 30))
    expect(result.next[r.id].at).toBeNull()
    expect(result.dueRitualId).toBeNull()
  })
})

describe('signature', () => {
  it('changes with the armed flag, enabled flag, and schedule', () => {
    const r = hourlyRitual()
    expect(signature(r, true)).not.toBe(signature(r, false))
    expect(signature(r, true)).not.toBe(signature({ ...r, enabled: false }, true))
  })

  it('ignores fields that must not invalidate the target', () => {
    const r = hourlyRitual()
    expect(signature({ ...r, name: 'Renamed', cursor: 9 }, true)).toBe(signature(r, true))
  })
})
