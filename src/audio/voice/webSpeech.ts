import type { SpeakOptions, VoiceInfo, VoiceProvider } from './types'

/** Chrome silently truncates long utterances. Nuggets are short, but a pasted
 *  paragraph would otherwise cut off mid-sentence with no error. */
const MAX_CHARS = 200

function voiceId(v: SpeechSynthesisVoice): string {
  return `${v.name}::${v.lang}`
}

export class WebSpeechProvider implements VoiceProvider {
  readonly available = typeof window !== 'undefined' && 'speechSynthesis' in window

  private cache: SpeechSynthesisVoice[] | null = null

  /**
   * getVoices() returns [] until the engine has loaded them, and fires
   * 'voiceschanged' when it has. Some builds never fire it if voices were
   * already warm, so we poll briefly as a backstop rather than hanging.
   */
  listVoices(): Promise<VoiceInfo[]> {
    if (!this.available) return Promise.resolve([])

    const read = () => window.speechSynthesis.getVoices()
    const immediate = read()
    if (immediate.length > 0) {
      this.cache = immediate
      return Promise.resolve(immediate.map(this.toInfo))
    }

    return new Promise((resolve) => {
      let settled = false
      const finish = () => {
        if (settled) return
        settled = true
        window.speechSynthesis.removeEventListener('voiceschanged', finish)
        window.clearInterval(poll)
        const list = read()
        this.cache = list
        resolve(list.map(this.toInfo))
      }
      window.speechSynthesis.addEventListener('voiceschanged', finish)
      const poll = window.setInterval(() => {
        if (read().length > 0) finish()
      }, 200)
      window.setTimeout(finish, 3000)
    })
  }

  private toInfo = (v: SpeechSynthesisVoice): VoiceInfo => ({
    id: voiceId(v),
    label: v.name,
    lang: v.lang,
  })

  private resolveVoice(id: string | null | undefined): SpeechSynthesisVoice | null {
    if (!id) return null
    const list = this.cache ?? window.speechSynthesis.getVoices()
    return list.find((v) => voiceId(v) === id) ?? null
  }

  speak(text: string, opts: SpeakOptions = {}): Promise<void> {
    if (!this.available) return Promise.resolve()
    const trimmed = text.trim().slice(0, MAX_CHARS)
    if (!trimmed) return Promise.resolve()

    return new Promise((resolve) => {
      const u = new SpeechSynthesisUtterance(trimmed)
      u.rate = opts.rate ?? 1
      u.pitch = opts.pitch ?? 1
      u.volume = opts.volume ?? 1
      const v = this.resolveVoice(opts.voiceId)
      if (v) {
        u.voice = v
        u.lang = v.lang
      }

      let settled = false
      const done = () => {
        if (settled) return
        settled = true
        window.clearTimeout(guard)
        resolve()
      }
      u.onend = done
      // An error must not wedge the delivery sequence — resolve, never reject.
      u.onerror = done

      // Backstop: if the engine drops the utterance without firing either
      // callback (it happens), the caller still continues.
      const guard = window.setTimeout(done, 15000)

      window.speechSynthesis.speak(u)
    })
  }

  cancel(): void {
    if (this.available) window.speechSynthesis.cancel()
  }
}
