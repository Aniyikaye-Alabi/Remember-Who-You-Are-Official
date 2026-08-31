import { unlockAudio } from '../audio/unlock'
import { requestNotificationPermission } from '../notify/browserNotification'
import { useAppStore } from '../store/useAppStore'
import { useSessionStore } from '../store/useSessionStore'

/**
 * `settings.armed` survives a reload but the audio unlock does not — the
 * browser revokes it on every fresh page load. Without this banner the app
 * would look armed while being completely silent, which is the worst possible
 * failure for a reminder tool: it fails in the direction of false confidence.
 */
export default function AudioBanner() {
  const armed = useAppStore((s) => s.settings.armed)
  const unlocked = useSessionStore((s) => s.audioUnlocked)
  const setAudioUnlocked = useSessionStore((s) => s.setAudioUnlocked)

  if (!armed || unlocked) return null

  return (
    <button
      onClick={async () => {
        setAudioUnlocked(await unlockAudio())
        await requestNotificationPermission()
      }}
      className="data-caps w-full bg-ochre px-4 py-2.5 text-center text-plaster hover:bg-ink"
    >
      This tab is silent until you click once — click here to restore sound
    </button>
  )
}
