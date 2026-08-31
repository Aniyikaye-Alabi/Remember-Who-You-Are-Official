import { WebSpeechProvider } from './webSpeech'
import type { VoiceProvider } from './types'

/** Swap this for a neural provider in phase 2; call sites stay unchanged. */
export const voice: VoiceProvider = new WebSpeechProvider()

export type { VoiceInfo, SpeakOptions, VoiceProvider } from './types'
