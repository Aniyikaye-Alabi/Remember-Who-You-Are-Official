import type { Schedule, TimeOfDay, Weekday } from './types'

/** How far ahead we are willing to search for the next fire. */
const MAX_LOOKAHEAD_DAYS = 8

/** "HH:MM" -> minutes since local midnight. Returns null if malformed. */
export function parseTime(t: TimeOfDay): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return h * 60 + min
}

export function formatTime(minutes: number): TimeOfDay {
  const h = Math.floor(minutes / 60) % 24
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

/**
 * A Date at `minutesFromMidnight` on the local calendar day `dayOffset` days
 * after `base`. Uses the local-time constructor so DST shifts are applied by
 * the platform rather than by us.
 */
function localDayAt(base: Date, dayOffset: number, minutesFromMidnight: number): Date {
  return new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate() + dayOffset,
    0,
    minutesFromMidnight,
    0,
    0,
  )
}

function dayIsActive(d: Date, days: Weekday[]): boolean {
  return days.includes(d.getDay() as Weekday)
}

/**
 * The next moment this schedule should fire, strictly after `from`.
 *
 * Pure and side-effect free — this is the single source of truth for timing,
 * and the same function a push backend would run server-side later.
 *
 * Returns null when the schedule can never fire (no active days, an empty or
 * inverted window, a non-positive interval, or no valid times).
 */
export function computeNextFire(schedule: Schedule, from: Date): Date | null {
  if (schedule.days.length === 0) return null

  if (schedule.kind === 'interval') {
    const start = parseTime(schedule.window.start)
    const end = parseTime(schedule.window.end)
    if (start === null || end === null) return null
    // An inverted or zero-width window never fires. The editor prevents this;
    // we fail closed rather than guessing that the user meant an overnight window.
    if (end <= start) return null
    if (!Number.isFinite(schedule.everyMinutes) || schedule.everyMinutes < 1) return null

    for (let offset = 0; offset < MAX_LOOKAHEAD_DAYS; offset++) {
      const probe = localDayAt(from, offset, 0)
      if (!dayIsActive(probe, schedule.days)) continue
      for (let t = start; t <= end; t += schedule.everyMinutes) {
        const candidate = localDayAt(from, offset, t)
        if (candidate.getTime() > from.getTime()) return candidate
      }
    }
    return null
  }

  const times = schedule.times
    .map(parseTime)
    .filter((t): t is number => t !== null)
    .sort((a, b) => a - b)
  if (times.length === 0) return null

  for (let offset = 0; offset < MAX_LOOKAHEAD_DAYS; offset++) {
    const probe = localDayAt(from, offset, 0)
    if (!dayIsActive(probe, schedule.days)) continue
    for (const t of times) {
      const candidate = localDayAt(from, offset, t)
      if (candidate.getTime() > from.getTime()) return candidate
    }
  }
  return null
}

/** Human-readable summary of a schedule, for ritual cards. */
export function describeSchedule(schedule: Schedule): string {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const sorted = [...schedule.days].sort((a, b) => a - b)
  let when: string
  if (sorted.length === 7) when = 'every day'
  else if (sorted.length === 5 && sorted.every((d) => d >= 1 && d <= 5)) when = 'weekdays'
  else if (sorted.length === 2 && sorted.includes(0) && sorted.includes(6)) when = 'weekends'
  else if (sorted.length === 0) when = 'no days selected'
  else when = sorted.map((d) => names[d]).join(', ')

  if (schedule.kind === 'interval') {
    const every =
      schedule.everyMinutes % 60 === 0 && schedule.everyMinutes >= 60
        ? `${schedule.everyMinutes / 60}h`
        : `${schedule.everyMinutes}m`
    return `Every ${every}, ${schedule.window.start}–${schedule.window.end}, ${when}`
  }
  return `At ${schedule.times.join(', ')}, ${when}`
}

/**
 * Every minute-of-day this schedule fires on the local calendar day `day`.
 * Empty when the day is not an active one, or the schedule can never fire.
 *
 * Pure, and deliberately separate from `computeNextFire`: that answers "when
 * next", this answers "what does today look like" — the shape the day ribbon
 * draws. Both walk the same window arithmetic, so they cannot disagree.
 */
export function firingsOnDay(schedule: Schedule, day: Date): number[] {
  if (!dayIsActive(day, schedule.days)) return []

  if (schedule.kind === 'interval') {
    const start = parseTime(schedule.window.start)
    const end = parseTime(schedule.window.end)
    if (start === null || end === null || end <= start) return []
    if (!Number.isFinite(schedule.everyMinutes) || schedule.everyMinutes < 1) return []

    const out: number[] = []
    for (let t = start; t <= end; t += schedule.everyMinutes) out.push(t)
    return out
  }

  return schedule.times
    .map(parseTime)
    .filter((t): t is number => t !== null)
    .sort((a, b) => a - b)
}
