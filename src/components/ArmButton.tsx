import { unlockAudio } from '../audio/unlock'
import { requestNotificationPermission } from '../notify/browserNotification'
import { useAppStore } from '../store/useAppStore'
import { useSessionStore } from '../store/useSessionStore'

/**
 * The master switch — and, deliberately, the audio unlock gesture. Browsers
 * only grant audio and speech from inside a real click handler, so arming and
 * unlocking are the same action rather than two things a user could get out of
 * order.
 */
export default function ArmButton() {
  const armed = useAppStore((s) => s.settings.armed)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const setAudioUnlocked = useSessionStore((s) => s.setAudioUnlocked)

  const onClick = async () => {
    if (armed) {
      updateSettings({ armed: false })
      return
    }
    updateSettings({ armed: true })
    const ok = await unlockAudio()
    setAudioUnlocked(ok)
    await requestNotificationPermission()
  }

  return (
    <button
      onClick={onClick}
      className={
        'data-caps rounded-full px-6 py-3 transition-colors ' +
        (armed
          ? 'bg-signal text-plaster hover:bg-ink'
          : 'border border-ink text-ink hover:bg-ink hover:text-plaster')
      }
    >
      {armed ? 'Armed — stop reminders' : 'Arm reminders'}
    </button>
  )
}
