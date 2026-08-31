import { useEffect } from 'react'
import { pickNugget, resolvePool } from '../domain/selection'
import { useAppStore } from '../store/useAppStore'
import { useSessionStore } from '../store/useSessionStore'
import { deliver } from './deliver'
import { planTick } from './tick'

const TICK_MS = 1000

/** Deliver one ritual now, committing the picker's walk state. */
export function fireRitual(ritualId: string): void {
  const store = useAppStore.getState()
  const ritual = store.rituals.find((r) => r.id === ritualId)
  if (!ritual) return

  const pool = resolvePool(store.nuggets, ritual.nuggetIds)
  const { nugget, cursor, shuffle } = pickNugget({
    pool,
    pick: ritual.pick,
    cursor: ritual.cursor,
    shuffle: ritual.shuffle,
  })
  if (!nugget) return

  store.recordFire(ritual.id, cursor, shuffle, Date.now())
  void deliver(ritual, nugget, store.settings)
}

/**
 * The single app-wide clock. One wall-clock tick drives every ritual, rather
 * than one setTimeout per ritual, because:
 *
 *  - long timeouts accumulate drift, while comparing Date.now() against an
 *    absolute target is self-correcting;
 *  - browsers throttle timers in background tabs, so a timer that "should" have
 *    fired simply arrives late — but a wall-clock comparison still resolves
 *    correctly on the next tick that does land;
 *  - a sleeping machine fires no timers at all, so on wake the only reliable
 *    question is "what time is it now, and what did I miss".
 *
 * The decision itself lives in planTick() so it can be unit tested.
 */
export function useScheduler(): void {
  useEffect(() => {
    const tick = () => {
      const { rituals, settings } = useAppStore.getState()
      const session = useSessionStore.getState()

      const { next, dueRitualId, changed } = planTick(
        rituals,
        settings.armed,
        session.nextFire,
        new Date(),
      )

      // Commit the map before delivering, so a slow delivery cannot cause the
      // next tick to see a stale target and fire again.
      if (changed) session.setNextFire(next)
      if (dueRitualId) fireRitual(dueRitualId)
    }

    tick()
    const handle = window.setInterval(tick, TICK_MS)

    // A backgrounded tab may not have ticked for a while; recompute the moment
    // the user returns so the countdown they see is honest.
    const onWake = () => tick()
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('focus', onWake)

    return () => {
      window.clearInterval(handle)
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('focus', onWake)
    }
  }, [])
}
