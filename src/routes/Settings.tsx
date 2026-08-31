import { useEffect, useRef, useState } from 'react'
import { playChime } from '../audio/chime'
import { unlockAudio } from '../audio/unlock'
import { voice } from '../audio/voice'
import type { VoiceInfo } from '../audio/voice'
import { notificationState, requestNotificationPermission } from '../notify/browserNotification'
import { migrate } from '../store/migrations'
import { snapshot, useAppStore } from '../store/useAppStore'
import { useSessionStore } from '../store/useSessionStore'

const inputCls =
  'w-full rounded-md border border-hairline bg-plaster px-2.5 py-2 text-sm outline-none focus:border-signal'

const buttonCls =
  'data-caps rounded-full border border-ink px-4 py-2 hover:bg-ink hover:text-plaster'

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2 py-4 sm:grid-cols-[8rem_1fr] sm:items-center sm:gap-6">
      <span className="data-caps text-ink-mute">{label}</span>
      <div>{children}</div>
    </div>
  )
}

export default function Settings() {
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const replaceAll = useAppStore((s) => s.replaceAll)
  const setAudioUnlocked = useSessionStore((s) => s.setAudioUnlocked)

  const [voices, setVoices] = useState<VoiceInfo[]>([])
  const [perm, setPerm] = useState(notificationState())
  const [note, setNote] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  // getVoices() is empty until the engine loads them, so this resolves async.
  useEffect(() => {
    let alive = true
    voice.listVoices().then((v) => {
      if (alive) setVoices(v)
    })
    return () => {
      alive = false
    }
  }, [])

  const patchVoice = (patch: Partial<typeof settings.voice>) =>
    updateSettings({ voice: { ...settings.voice, ...patch } })

  const preview = async () => {
    setAudioUnlocked(await unlockAudio())
    await voice.speak('Remember who you are.', {
      rate: settings.voice.rate,
      pitch: settings.voice.pitch,
      volume: settings.voice.volume,
      voiceId: settings.voice.voiceId,
    })
  }

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(snapshot(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `remember-who-you-are-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text())
      // Run the import through the same migration path as stored data, so an
      // older export file is upgraded rather than loaded half-formed.
      replaceAll(migrate(parsed, Number(parsed?.schemaVersion) || 1))
      setNote('Imported.')
    } catch {
      setNote('That file could not be read as a valid backup.')
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <h2 className="data-caps text-ink-mute">Settings</h2>
      <p className="mt-3 max-w-md text-2xl leading-snug tracking-[-0.02em]">
        How the voice sounds, and where your words are kept.
      </p>

      <section className="mt-10 divide-y divide-hairline border-y border-hairline">
        <Row label="Voice">
          <select
            value={settings.voice.voiceId ?? ''}
            onChange={(e) => patchVoice({ voiceId: e.target.value || null })}
            className={inputCls}
          >
            <option value="">System default</option>
            {voices.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label} ({v.lang})
              </option>
            ))}
          </select>
          {voices.length === 0 && (
            <p className="data mt-2 text-ink-mute">
              No voices reported yet — your browser loads them lazily. Reload if this stays empty.
            </p>
          )}
        </Row>

        <Row label="Speed">
          <input
            type="range"
            min={0.5}
            max={1.6}
            step={0.05}
            value={settings.voice.rate}
            onChange={(e) => patchVoice({ rate: Number(e.target.value) })}
            className="w-full accent-[#2b33c9]"
          />
        </Row>

        <Row label="Pitch">
          <input
            type="range"
            min={0.5}
            max={1.6}
            step={0.05}
            value={settings.voice.pitch}
            onChange={(e) => patchVoice({ pitch: Number(e.target.value) })}
            className="w-full accent-[#2b33c9]"
          />
        </Row>

        <Row label="Volume">
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.voice.volume}
            onChange={(e) => patchVoice({ volume: Number(e.target.value) })}
            className="w-full accent-[#2b33c9]"
          />
        </Row>

        <Row label="Preview">
          <div className="flex flex-wrap gap-2">
            <button onClick={preview} className={buttonCls}>
              Hear the voice
            </button>
            <button
              onClick={async () => {
                setAudioUnlocked(await unlockAudio())
                await playChime('bell', 0.6)
              }}
              className={buttonCls}
            >
              Hear a chime
            </button>
          </div>
        </Row>

        <Row label="Overlay">
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={60}
              value={settings.overlaySeconds}
              onChange={(e) => updateSettings({ overlaySeconds: Number(e.target.value) })}
              className="w-24 rounded-md border border-hairline bg-plaster px-2.5 py-2 text-sm outline-none focus:border-signal"
            />
            <span className="data text-ink-mute">seconds on screen</span>
          </div>
        </Row>

        <Row label="Notifications">
          <div className="flex flex-wrap items-center gap-3">
            <span className="data text-ink">{perm}</span>
            {perm === 'default' && (
              <button
                onClick={async () => setPerm(await requestNotificationPermission())}
                className={buttonCls}
              >
                Allow
              </button>
            )}
            {perm === 'denied' && (
              <span className="data text-ink-mute">
                Re-enable in your browser&rsquo;s site settings.
              </span>
            )}
          </div>
        </Row>
      </section>

      <section className="mt-12">
        <h3 className="data-caps text-ink-mute">Backup</h3>
        <p className="mt-3 max-w-lg leading-relaxed">
          Everything lives in this browser only. Clearing site data erases it, so keep a copy of
          anything you would not want to rewrite.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={exportJson} className={buttonCls}>
            Export a backup
          </button>
          <button onClick={() => fileRef.current?.click()} className={buttonCls}>
            Import a backup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void importJson(f)
              e.target.value = ''
            }}
          />
        </div>
        {note && <p className="data mt-4 text-ochre">{note}</p>}
      </section>
    </div>
  )
}
