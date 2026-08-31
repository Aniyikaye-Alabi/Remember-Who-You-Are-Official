import { playChime } from '../audio/chime'
import { voice } from '../audio/voice'
import { showNotification } from '../notify/browserNotification'
import { useSessionStore } from '../store/useSessionStore'
import type { Nugget, Ritual, Settings } from '../domain/types'

/** Beat between the chime and the voice, so the words are not masked by the
 *  chime's attack. */
const CHIME_TO_VOICE_MS = 400

let delivering = false

/**
 * Play one reminder end to end: chime → pause → speech → notification → overlay.
 *
 * Serialized: if a second ritual comes due while one is still speaking, it is
 * dropped rather than layered, because two voices at once is unintelligible.
 */
export async function deliver(ritual: Ritual, nugget: Nugget, settings: Settings): Promise<void> {
  if (delivering) return
  delivering = true

  const session = useSessionStore.getState()
  const record = { nugget, ritualName: ritual.name, at: Date.now() }
  session.setLastDelivered(record)
  if (ritual.delivery.overlay) session.showOverlay(record)

  try {
    if (ritual.delivery.chime) {
      await playChime(ritual.delivery.chimeId, ritual.delivery.volume)
      await new Promise((r) => setTimeout(r, CHIME_TO_VOICE_MS))
    }

    if (ritual.delivery.speak) {
      await voice.speak(nugget.text, {
        rate: settings.voice.rate,
        pitch: settings.voice.pitch,
        volume: settings.voice.volume,
        voiceId: settings.voice.voiceId,
      })
    }

    if (ritual.delivery.notify) showNotification(ritual.name, nugget.text)
  } finally {
    delivering = false
  }
}

export function isDelivering(): boolean {
  return delivering
}
