import type { ReactNode } from 'react'
import { CHIME_IDS, CHIME_LABELS } from '../audio/chime'
import { firingsOnDay, parseTime } from '../domain/schedule'
import { useAppStore } from '../store/useAppStore'
import { fireRitual } from '../scheduler/useScheduler'
import type { ChimeId, PickMode, Ritual, Schedule, Weekday } from '../domain/types'

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const PICK_LABELS: Record<PickMode, string> = {
  'random-no-repeat': 'Shuffle (no repeats)',
  random: 'Random',
  sequential: 'In order',
}

const inputCls =
  'w-full rounded-md border border-hairline bg-plaster px-2.5 py-2 text-sm outline-none focus:border-signal'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="data-caps mb-1.5 block text-ink-mute">{label}</span>
      {children}
    </label>
  )
}

export default function RitualEditor({ ritual }: { ritual: Ritual }) {
  const update = useAppStore((s) => s.updateRitual)
  const remove = useAppStore((s) => s.removeRitual)
  const nuggets = useAppStore((s) => s.nuggets)

  const s = ritual.schedule

  const patchSchedule = (patch: Record<string, unknown>) =>
    update(ritual.id, { schedule: { ...s, ...patch } as Schedule })

  const toggleDay = (d: Weekday) => {
    const has = s.days.includes(d)
    patchSchedule({ days: has ? s.days.filter((x) => x !== d) : [...s.days, d] })
  }

  // computeNextFire fails closed on an inverted window, so surface it here
  // rather than letting the user wonder why nothing ever fires.
  const windowInvalid =
    s.kind === 'interval' &&
    (() => {
      const a = parseTime(s.window.start)
      const b = parseTime(s.window.end)
      return a === null || b === null || b <= a
    })()

  // The same count the ribbon draws, said in words — a schedule is easier to
  // trust once you know how many times it will actually speak.
  const perDay = firingsOnDay(s, new Date())

  return (
    <div
      className={
        'rounded-xl border bg-plaster-deep/40 p-5 ' +
        (ritual.enabled ? 'border-ink/25' : 'border-hairline')
      }
    >
      <div className="flex items-center gap-3">
        <input
          value={ritual.name}
          onChange={(e) => update(ritual.id, { name: e.target.value })}
          aria-label="Reminder name"
          className="min-w-0 flex-1 bg-transparent text-xl font-semibold tracking-[-0.02em] outline-none"
        />
        <label className="data-caps flex cursor-pointer items-center gap-2 text-ink-mute">
          <input
            type="checkbox"
            checked={ritual.enabled}
            onChange={(e) => update(ritual.id, { enabled: e.target.checked })}
            className="accent-[#2b33c9]"
          />
          On
        </label>
        <button
          onClick={() => remove(ritual.id)}
          className="data-caps text-ink-mute hover:text-ochre"
          aria-label={'Delete reminder ' + ritual.name}
        >
          Delete
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Repeat">
          <select
            value={s.kind}
            onChange={(e) =>
              update(ritual.id, {
                schedule:
                  e.target.value === 'interval'
                    ? {
                        kind: 'interval',
                        everyMinutes: 60,
                        window: { start: '09:00', end: '18:00' },
                        days: s.days,
                      }
                    : { kind: 'times', times: ['09:00'], days: s.days },
              })
            }
            className={inputCls}
          >
            <option value="interval">Every N minutes</option>
            <option value="times">At set times</option>
          </select>
        </Field>

        {s.kind === 'interval' ? (
          <>
            <Field label="Every (minutes)">
              <input
                type="number"
                min={1}
                value={s.everyMinutes}
                onChange={(e) => patchSchedule({ everyMinutes: Number(e.target.value) })}
                className={inputCls}
              />
            </Field>
            <Field label="From">
              <input
                type="time"
                value={s.window.start}
                onChange={(e) => patchSchedule({ window: { ...s.window, start: e.target.value } })}
                className={inputCls}
              />
            </Field>
            <Field label="Until">
              <input
                type="time"
                value={s.window.end}
                onChange={(e) => patchSchedule({ window: { ...s.window, end: e.target.value } })}
                className={inputCls}
              />
            </Field>
          </>
        ) : (
          <div className="sm:col-span-2">
            <Field label="Times (comma separated, 24h)">
              <input
                value={s.times.join(', ')}
                onChange={(e) =>
                  patchSchedule({
                    times: e.target.value
                      .split(',')
                      .map((t) => t.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="09:00, 13:30, 17:00"
                className={inputCls}
              />
            </Field>
          </div>
        )}
      </div>

      {windowInvalid && (
        <p className="data mt-3 text-ochre">
          The end time must be after the start time, or this reminder will never fire.
        </p>
      )}

      <div className="mt-5">
        <span className="data-caps mb-2 block text-ink-mute">Days</span>
        <div className="flex gap-1.5">
          {DAY_LABELS.map((label, i) => {
            const d = i as Weekday
            const on = s.days.includes(d)
            return (
              <button
                key={i}
                onClick={() => toggleDay(d)}
                aria-pressed={on}
                className={
                  'data-caps h-8 w-8 rounded-full transition-colors ' +
                  (on
                    ? 'bg-signal text-plaster'
                    : 'border border-hairline text-ink-mute hover:border-ink')
                }
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Field label="Pick nuggets">
          <select
            value={ritual.pick}
            onChange={(e) =>
              update(ritual.id, { pick: e.target.value as PickMode, cursor: 0, shuffle: [] })
            }
            className={inputCls}
          >
            {(Object.keys(PICK_LABELS) as PickMode[]).map((p) => (
              <option key={p} value={p}>
                {PICK_LABELS[p]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Chime">
          <select
            value={ritual.delivery.chimeId}
            onChange={(e) =>
              update(ritual.id, {
                delivery: { ...ritual.delivery, chimeId: e.target.value as ChimeId },
              })
            }
            className={inputCls}
          >
            {CHIME_IDS.map((c) => (
              <option key={c} value={c}>
                {CHIME_LABELS[c]}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="mt-5">
        <span className="data-caps mb-2 block text-ink-mute">Deliver with</span>
        <div className="flex flex-wrap gap-4">
          {(['chime', 'speak', 'notify', 'overlay'] as const).map((k) => (
            <label key={k} className="data flex cursor-pointer items-center gap-2 text-ink-mute">
              <input
                type="checkbox"
                checked={ritual.delivery[k]}
                onChange={(e) =>
                  update(ritual.id, { delivery: { ...ritual.delivery, [k]: e.target.checked } })
                }
                className="accent-[#2b33c9]"
              />
              {k === 'speak' ? 'voice' : k}
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
        <span className="data text-ink-mute">
          {ritual.nuggetIds === 'all' ? 'All ' + nuggets.length : ritual.nuggetIds.length} nuggets
          {' · '}
          {perDay.length} times today
        </span>
        {/* Essential: this is how a user confirms sound actually works before
            trusting the app for a whole workday. */}
        <button
          onClick={() => fireRitual(ritual.id)}
          className="data-caps rounded-full border border-ink px-4 py-2 hover:bg-ink hover:text-plaster"
        >
          Test now
        </button>
      </div>
    </div>
  )
}
