import ArmButton from '../components/ArmButton'
import Countdown from '../components/Countdown'
import { describeSchedule } from '../domain/schedule'
import { fireRitual } from '../scheduler/useScheduler'
import { useAppStore } from '../store/useAppStore'
import { useSessionStore } from '../store/useSessionStore'

const clock = (at: number) =>
  new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

export default function Now() {
  const rituals = useAppStore((s) => s.rituals)
  const nuggets = useAppStore((s) => s.nuggets)
  const armed = useAppStore((s) => s.settings.armed)
  const nextFire = useSessionStore((s) => s.nextFire)
  const last = useSessionStore((s) => s.lastDelivered)

  const active = rituals.filter((r) => r.enabled)

  // The soonest pending delivery across every enabled ritual — the one number
  // a user actually wants on this screen.
  const soonest = active
    .map((r) => nextFire[r.id]?.at ?? null)
    .filter((t): t is number => t !== null)
    .sort((a, b) => a - b)[0]

  const upNext = active.find((r) => (nextFire[r.id]?.at ?? null) === soonest)

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      {/* The last thing said, held at reading size. Left-aligned against the
          mono rail: this is a control surface you glance at, not a poster. */}
      <p className="data-caps text-ink-mute">
        {last ? `Last spoken ${clock(last.at)} · ${last.ritualName}` : 'Nothing spoken yet'}
      </p>
      <p className="mt-4 max-w-[19ch] text-4xl font-semibold leading-[1.08] tracking-[-0.03em] text-ink sm:max-w-[22ch] sm:text-6xl">
        {last ? last.nugget.text : 'Remember who you are.'}
      </p>

      <div className="mt-12 flex flex-wrap items-center gap-x-6 gap-y-4">
        <ArmButton />
        <div className="data text-ink-mute">
          {!armed && <span>Nothing sounds until you arm reminders.</span>}
          {armed && active.length === 0 && <span>No reminders are switched on.</span>}
          {armed && active.length > 0 && soonest !== undefined && (
            <span>
              Next in{' '}
              <span className="text-signal">
                <Countdown at={soonest} />
              </span>
              {upNext && <> · {upNext.name}</>}
            </span>
          )}
          {armed && active.length > 0 && soonest === undefined && (
            <span className="text-ochre">
              Enabled reminders have no valid schedule — check their days and time window.
            </span>
          )}
        </div>
      </div>

      {active.length > 0 && (
        <ul className="mt-14 border-t border-hairline">
          {active.map((r) => (
            <li
              key={r.id}
              className="flex items-baseline justify-between gap-4 border-b border-hairline py-3.5"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{r.name}</p>
                <p className="data mt-0.5 text-ink-mute">{describeSchedule(r.schedule)}</p>
              </div>
              <span className="data shrink-0 text-ink-mute">
                <Countdown at={nextFire[r.id]?.at ?? null} />
              </span>
            </li>
          ))}
        </ul>
      )}

      <button
        onClick={() => {
          const target = upNext ?? rituals[0]
          if (target) fireRitual(target.id)
        }}
        disabled={rituals.length === 0 || nuggets.length === 0}
        className="data-caps mt-8 text-signal underline underline-offset-4 hover:text-ink disabled:text-ink-mute/50 disabled:no-underline"
      >
        Speak one now
      </button>
    </div>
  )
}
