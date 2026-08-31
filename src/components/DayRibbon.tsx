import { useEffect, useState } from 'react'
import { firingsOnDay, formatTime } from '../domain/schedule'
import { useAppStore } from '../store/useAppStore'

type Mark = { minute: number; names: string[] }

/** Hours drawn either side of the day's activity, so ticks never touch an edge. */
const PAD_HOURS = 1

/**
 * Today, as one horizontal band: a tick for every moment an enabled reminder
 * will speak, and a hairline at the current minute. Written schedules ("every
 * 60m, 09:00–18:00, weekdays") describe a rule; this draws the consequence,
 * which is the thing a person actually wants to know before trusting the app
 * with a workday.
 */
export default function DayRibbon() {
  const rituals = useAppStore((s) => s.rituals)
  const [now, setNow] = useState(() => new Date())
  const [hovered, setHovered] = useState<Mark | null>(null)

  // A minute is the finest resolution the ribbon can show, so tick at a minute.
  useEffect(() => {
    const h = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(h)
  }, [])

  const active = rituals.filter((r) => r.enabled)

  // Collapse simultaneous firings from different reminders into one tick —
  // two ticks a pixel apart would read as noise rather than as two reminders.
  const byMinute = new Map<number, string[]>()
  for (const r of active) {
    for (const m of firingsOnDay(r.schedule, now)) {
      const at = byMinute.get(m)
      if (at) at.push(r.name)
      else byMinute.set(m, [r.name])
    }
  }
  const marks: Mark[] = [...byMinute.entries()]
    .map(([minute, names]) => ({ minute, names }))
    .sort((a, b) => a.minute - b.minute)

  const nowMinute = now.getHours() * 60 + now.getMinutes()

  if (marks.length === 0) {
    return (
      <div className="border-y border-hairline">
        <div className="mx-auto max-w-3xl px-6 py-4">
          <p className="data text-ink-mute">
            {active.length === 0
              ? 'No reminders switched on — today has no shape yet.'
              : 'Nothing scheduled for today. Check the days on your reminders.'}
          </p>
        </div>
      </div>
    )
  }

  // Frame the band around the day's own activity rather than a fixed 00–24, so
  // a 09–18 schedule fills the width instead of huddling in the middle.
  const first = marks[0].minute
  const last = marks[marks.length - 1].minute
  const from = Math.max(0, Math.floor(Math.min(first, nowMinute) / 60) - PAD_HOURS) * 60
  const to = Math.min(24 * 60, (Math.ceil(Math.max(last, nowMinute) / 60) + PAD_HOURS) * 60)
  const span = Math.max(1, to - from)
  const pct = (minute: number) => ((minute - from) / span) * 100

  const hours: number[] = []
  for (let h = Math.ceil(from / 60); h <= Math.floor(to / 60); h++) hours.push(h)
  const hourStep = hours.length > 9 ? 2 : 1

  const nextMark = marks.find((m) => m.minute > nowMinute)
  const spentCount = marks.filter((m) => m.minute <= nowMinute).length

  return (
    <div className="border-y border-hairline bg-plaster-deep/40">
      <div className="mx-auto max-w-3xl px-6 py-5">
        <div className="flex items-baseline justify-between gap-4">
          <span className="data-caps text-ink-mute">Today</span>
          <span className="data text-ink-mute">
            {hovered
              ? `${formatTime(hovered.minute)} · ${hovered.names.join(' + ')}`
              : `${spentCount} spoken · ${marks.length - spentCount} to come`}
          </span>
        </div>

        <div className="relative mt-3 h-14">
          {/* The band itself. */}
          <div className="absolute inset-x-0 top-4 h-px bg-hairline" />

          {marks.map((m) => {
            const spent = m.minute <= nowMinute
            const isNext = nextMark?.minute === m.minute
            return (
              // Hover targets, not controls. A dense schedule can put a hundred
              // ticks on this band; as buttons they would be a hundred tab stops
              // in front of the page. The reminder list below carries the same
              // information in a form a screen reader can walk.
              <div
                key={m.minute}
                aria-hidden
                onMouseEnter={() => setHovered(m)}
                onMouseLeave={() => setHovered(null)}
                className="absolute top-0 h-9 w-2.5 -translate-x-1/2"
                style={{ left: `${pct(m.minute)}%` }}
              >
                <span
                  className={
                    'absolute left-1/2 w-px -translate-x-1/2 ' +
                    (isNext
                      ? 'rwya-pending top-0 h-9 bg-signal'
                      : spent
                        ? 'top-2 h-4 bg-ochre/45'
                        : 'top-1.5 h-5 bg-signal/70')
                  }
                />
              </div>
            )
          })}

          {/* Now. The one element that moves on its own. */}
          <div
            className="absolute top-0 h-9 w-px bg-ink"
            style={{ left: `${pct(nowMinute)}%` }}
            aria-hidden
          >
            <span className="absolute -top-0.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-ink" />
          </div>

          {/* Hour feet, in the same mono as every other time in the app. */}
          {hours
            .filter((h) => h % hourStep === 0)
            .map((h) => (
              <span
                key={h}
                className="data absolute top-10 -translate-x-1/2 text-ink-mute/70"
                style={{ left: `${pct(h * 60)}%` }}
              >
                {String(h).padStart(2, '0')}
              </span>
            ))}
        </div>
      </div>
    </div>
  )
}
