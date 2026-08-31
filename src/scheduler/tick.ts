import { computeNextFire } from '../domain/schedule'
import type { Ritual } from '../domain/types'

export type FireSlot = {
  /** Epoch ms of the next scheduled delivery, or null if it can never fire. */
  at: number | null
  /** Fingerprint of the inputs this was computed from; a change forces a recompute. */
  sig: string
}

export type TickResult = {
  next: Record<string, FireSlot>
  /** At most one ritual per tick — two voices at once is unintelligible. */
  dueRitualId: string | null
  changed: boolean
}

/** Any change to these invalidates a cached next-fire time. */
export function signature(r: Ritual, armed: boolean): string {
  return JSON.stringify([armed, r.enabled, r.schedule])
}

/**
 * Decide what the scheduler should do at this instant. Pure, so the catch-up
 * policy can be tested directly instead of through a React hook.
 *
 * Catch-up is deliberately fire-once-and-skip: the next target is always
 * recomputed from `now`, never advanced from the missed target. If a laptop
 * slept through three hours of hourly reminders, the user gets ONE on wake.
 * Being shouted at four times in a row is a bug, not diligence.
 */
export function planTick(
  rituals: Ritual[],
  armed: boolean,
  prev: Record<string, FireSlot>,
  now: Date,
): TickResult {
  const nowMs = now.getTime()
  const next: Record<string, FireSlot> = {}
  let changed = false
  let dueRitualId: string | null = null

  for (const r of rituals) {
    const sig = signature(r, armed)
    const before = prev[r.id]

    if (!armed || !r.enabled) {
      next[r.id] = { at: null, sig }
      if (!before || before.at !== null || before.sig !== sig) changed = true
      continue
    }

    // Newly armed, or the schedule was edited: set a target and wait for it.
    // Never fire on the same tick that arms a ritual.
    if (!before || before.sig !== sig) {
      const n = computeNextFire(r.schedule, now)
      next[r.id] = { at: n ? n.getTime() : null, sig }
      changed = true
      continue
    }

    if (before.at !== null && nowMs >= before.at) {
      const n = computeNextFire(r.schedule, now)
      next[r.id] = { at: n ? n.getTime() : null, sig }
      changed = true
      if (dueRitualId === null) dueRitualId = r.id
      continue
    }

    next[r.id] = before
  }

  // Rituals deleted since the last tick simply fall out of `next`.
  if (Object.keys(next).length !== Object.keys(prev).length) changed = true

  return { next, dueRitualId, changed }
}
