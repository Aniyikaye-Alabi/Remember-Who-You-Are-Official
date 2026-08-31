import { describe, it, expect } from 'vitest'
import { computeNextFire, parseTime, describeSchedule, firingsOnDay, formatTime } from './schedule'
import type { IntervalSchedule, TimesSchedule, Weekday } from './types'

const ALL_DAYS: Weekday[] = [0, 1, 2, 3, 4, 5, 6]
const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5]

const hourly = (days: Weekday[] = ALL_DAYS): IntervalSchedule => ({
  kind: 'interval',
  everyMinutes: 60,
  window: { start: '09:00', end: '18:00' },
  days,
})

// 2025-03-05 is a Wednesday.
const wed = (h: number, m = 0) => new Date(2025, 2, 5, h, m, 0, 0)

describe('parseTime', () => {
  it('parses valid times', () => {
    expect(parseTime('09:00')).toBe(540)
    expect(parseTime('00:00')).toBe(0)
    expect(parseTime('23:59')).toBe(1439)
  })
  it('rejects malformed or out-of-range times', () => {
    expect(parseTime('24:00')).toBeNull()
    expect(parseTime('09:60')).toBeNull()
    expect(parseTime('nine')).toBeNull()
  })
})

describe('computeNextFire — interval', () => {
  it('returns the next slot when inside the window', () => {
    expect(computeNextFire(hourly(), wed(10, 30))).toEqual(wed(11))
  })

  it('skips to the following slot when sitting exactly on a fire time', () => {
    expect(computeNextFire(hourly(), wed(11))).toEqual(wed(12))
  })

  it('returns the window start when before the window', () => {
    expect(computeNextFire(hourly(), wed(6))).toEqual(wed(9))
  })

  it('rolls to the next day when after the window', () => {
    expect(computeNextFire(hourly(), wed(20))).toEqual(new Date(2025, 2, 6, 9, 0, 0, 0))
  })

  it('honours the window end boundary inclusively', () => {
    expect(computeNextFire(hourly(), wed(17, 30))).toEqual(wed(18))
  })

  it('skips inactive days', () => {
    // Friday 20:00 with a weekday-only schedule -> Monday 09:00
    const fri = new Date(2025, 2, 7, 20, 0, 0, 0)
    expect(computeNextFire(hourly(WEEKDAYS), fri)).toEqual(new Date(2025, 2, 10, 9, 0, 0, 0))
  })

  it('returns null when no days are selected', () => {
    expect(computeNextFire(hourly([]), wed(10))).toBeNull()
  })

  it('returns null for an inverted or zero-width window', () => {
    const inverted: IntervalSchedule = { ...hourly(), window: { start: '18:00', end: '09:00' } }
    expect(computeNextFire(inverted, wed(10))).toBeNull()
    const zero: IntervalSchedule = { ...hourly(), window: { start: '09:00', end: '09:00' } }
    expect(computeNextFire(zero, wed(6))).toBeNull()
  })

  it('returns null for a non-positive interval', () => {
    expect(computeNextFire({ ...hourly(), everyMinutes: 0 }, wed(10))).toBeNull()
  })

  it('produces a strictly future, monotonically advancing sequence across a DST boundary', () => {
    // US spring-forward 2025-03-09 02:00. A 24/7 30-minute schedule must keep
    // moving forward across the discontinuity rather than stalling or going back.
    const dense: IntervalSchedule = {
      kind: 'interval',
      everyMinutes: 30,
      window: { start: '00:00', end: '23:30' },
      days: ALL_DAYS,
    }
    let cursor = new Date(2025, 2, 8, 22, 0, 0, 0)
    for (let i = 0; i < 12; i++) {
      const next = computeNextFire(dense, cursor)
      expect(next).not.toBeNull()
      expect(next!.getTime()).toBeGreaterThan(cursor.getTime())
      cursor = next!
    }
  })
})

describe('computeNextFire — fixed times', () => {
  const times = (days: Weekday[] = ALL_DAYS): TimesSchedule => ({
    kind: 'times',
    times: ['13:00', '09:00'], // deliberately unsorted
    days,
  })

  it('sorts times and returns the next one today', () => {
    expect(computeNextFire(times(), wed(7))).toEqual(wed(9))
    expect(computeNextFire(times(), wed(10))).toEqual(wed(13))
  })

  it('rolls to the next active day once all of today has passed', () => {
    expect(computeNextFire(times(), wed(14))).toEqual(new Date(2025, 2, 6, 9, 0, 0, 0))
  })

  it('returns null when no times are valid', () => {
    expect(computeNextFire({ kind: 'times', times: ['banana'], days: ALL_DAYS }, wed(10))).toBeNull()
  })
})

describe('describeSchedule', () => {
  it('summarises common shapes', () => {
    expect(describeSchedule(hourly(WEEKDAYS))).toBe('Every 1h, 09:00–18:00, weekdays')
    expect(describeSchedule(hourly())).toBe('Every 1h, 09:00–18:00, every day')
    expect(describeSchedule({ ...hourly(), everyMinutes: 45 })).toContain('Every 45m')
  })
})

describe('firingsOnDay', () => {
  // Wednesday.
  const wed = new Date(2025, 0, 15, 12, 0, 0)
  const sun = new Date(2025, 0, 19, 12, 0, 0)

  it('walks an interval window inclusively', () => {
    const out = firingsOnDay(
      { kind: 'interval', everyMinutes: 180, window: { start: '09:00', end: '18:00' }, days: [3] },
      wed,
    )
    expect(out.map(formatTime)).toEqual(['09:00', '12:00', '15:00', '18:00'])
  })

  it('is empty on a day the schedule does not run', () => {
    expect(
      firingsOnDay(
        { kind: 'interval', everyMinutes: 60, window: { start: '09:00', end: '18:00' }, days: [3] },
        sun,
      ),
    ).toEqual([])
  })

  it('sorts fixed times and drops malformed ones', () => {
    const out = firingsOnDay({ kind: 'times', times: ['17:00', 'nope', '09:30'], days: [3] }, wed)
    expect(out.map(formatTime)).toEqual(['09:30', '17:00'])
  })

  it('is empty for an inverted window, matching computeNextFire', () => {
    const bad = {
      kind: 'interval' as const,
      everyMinutes: 60,
      window: { start: '18:00', end: '09:00' },
      days: [3] as Weekday[],
    }
    expect(firingsOnDay(bad, wed)).toEqual([])
    expect(computeNextFire(bad, wed)).toBeNull()
  })
})
