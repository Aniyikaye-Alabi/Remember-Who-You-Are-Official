let ctx: AudioContext | null = null

/** The shared AudioContext. Created lazily — constructing one before a user
 *  gesture starts it in a 'suspended' state on most browsers. */
export function audioContext(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctor()
  }
  return ctx
}

export function isAudioUnlocked(): boolean {
  return ctx !== null && ctx.state === 'running'
}

/**
 * Must be called synchronously inside a real user gesture (a click), or the
 * browser will refuse both Web Audio playback and speechSynthesis for the rest
 * of the page's life. This is the single most common way a browser-based
 * reminder app ends up silently doing nothing, so the master Arm button
 * doubles as the unlock.
 */
export async function unlockAudio(): Promise<boolean> {
  try {
    const ac = audioContext()
    if (ac.state === 'suspended') await ac.resume()

    // A one-sample silent buffer is enough to mark the context as user-started.
    const buf = ac.createBuffer(1, 1, ac.sampleRate)
    const src = ac.createBufferSource()
    src.buffer = buf
    src.connect(ac.destination)
    src.start(0)

    // speechSynthesis is unlocked separately from Web Audio. An empty utterance
    // is inaudible but counts as the gesture-initiated first speak.
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance('')
      u.volume = 0
      window.speechSynthesis.speak(u)
    }

    return ac.state === 'running'
  } catch {
    return false
  }
}
