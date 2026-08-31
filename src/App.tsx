import { useState } from 'react'
import AudioBanner from './components/AudioBanner'
import DayRibbon from './components/DayRibbon'
import ReminderOverlay from './components/ReminderOverlay'
import Now from './routes/Now'
import Nuggets from './routes/Nuggets'
import Rituals from './routes/Rituals'
import Settings from './routes/Settings'
import { useScheduler } from './scheduler/useScheduler'
import { useAppStore } from './store/useAppStore'

const TABS = ['Now', 'Nuggets', 'Reminders', 'Settings'] as const
type Tab = (typeof TABS)[number]

export default function App() {
  // One clock for the whole app, mounted once at the root.
  useScheduler()
  const [tab, setTab] = useState<Tab>('Now')
  const armed = useAppStore((s) => s.settings.armed)

  return (
    <div className="min-h-full">
      <AudioBanner />

      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <span className="flex items-center gap-2.5">
            <span
              className={
                'h-2 w-2 rounded-full ' + (armed ? 'bg-signal' : 'border border-ink-mute/60')
              }
              aria-hidden
            />
            <span className="data-caps text-ink">Remember who you are</span>
          </span>
          <nav className="flex gap-0.5">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                aria-current={tab === t ? 'page' : undefined}
                className={
                  'data-caps rounded px-2.5 py-1.5 transition-colors ' +
                  (tab === t
                    ? 'bg-ink text-plaster'
                    : 'text-ink-mute hover:bg-plaster-deep hover:text-ink')
                }
              >
                {t}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <DayRibbon />

      <main>
        {tab === 'Now' && <Now />}
        {tab === 'Nuggets' && <Nuggets />}
        {tab === 'Reminders' && <Rituals />}
        {tab === 'Settings' && <Settings />}
      </main>

      <ReminderOverlay />
    </div>
  )
}
