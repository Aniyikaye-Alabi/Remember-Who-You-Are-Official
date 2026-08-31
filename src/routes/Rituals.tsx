import RitualEditor from '../components/RitualEditor'
import { useAppStore } from '../store/useAppStore'

export default function Rituals() {
  const rituals = useAppStore((s) => s.rituals)
  const createRitual = useAppStore((s) => s.createRitual)

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="data-caps text-ink-mute">Reminders</h2>
          <p className="mt-3 max-w-md text-2xl leading-snug tracking-[-0.02em]">
            When the words should find you.
          </p>
        </div>
        <button
          onClick={() => createRitual()}
          className="data-caps rounded-full bg-ink px-5 py-2.5 text-plaster hover:bg-signal"
        >
          Add reminder
        </button>
      </div>

      <div className="mt-10 space-y-4">
        {rituals.map((r) => (
          <RitualEditor key={r.id} ritual={r} />
        ))}
      </div>

      {rituals.length === 0 && (
        <p className="mt-10 border-t border-hairline pt-6 text-ink-mute">
          No reminders yet. A good first one: every hour, 9 to 6, weekdays.
        </p>
      )}
    </div>
  )
}
