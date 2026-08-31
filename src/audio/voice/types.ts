export type VoiceInfo = {
  id: string
  label: string
  lang: string
}

export type SpeakOptions = {
  rate?: number
  pitch?: number
  volume?: number
  voiceId?: string | null
}

/**
 * The phase-2 seam. A server-backed neural TTS provider implements this same
 * interface with per-nugget audio caching, and nothing else in the app changes.
 */
export interface VoiceProvider {
  readonly available: boolean
  listVoices(): Promise<VoiceInfo[]>
  speak(text: string, opts?: SpeakOptions): Promise<void>
  cancel(): void
}
