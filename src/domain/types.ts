/** Persisted schema version. Bump whenever a stored shape changes. */
export const SCHEMA_VERSION = 1

export type Nugget = {
  id: string
  text: string
  createdAt: number
  archived: boolean
}

/** "HH:MM" in 24h local time. */
export type TimeOfDay = string

/** Day-of-week indices, 0 = Sunday .. 6 = Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export type IntervalSchedule = {
  kind: 'interval'
  everyMinutes: number
  window: { start: TimeOfDay; end: TimeOfDay }
  days: Weekday[]
}

export type TimesSchedule = {
  kind: 'times'
  times: TimeOfDay[]
  days: Weekday[]
}

export type Schedule = IntervalSchedule | TimesSchedule

export type ChimeId = 'bell' | 'twoTone' | 'gong'

export type Delivery = {
  chime: boolean
  chimeId: ChimeId
  volume: number
  speak: boolean
  notify: boolean
  overlay: boolean
}

export type PickMode = 'sequential' | 'random' | 'random-no-repeat'

/** A reminder rule: which nuggets, when, and how loud. */
export type Ritual = {
  id: string
  name: string
  enabled: boolean
  nuggetIds: string[] | 'all'
  pick: PickMode
  schedule: Schedule
  delivery: Delivery
  /** Walk position for sequential / random-no-repeat picking. */
  cursor: number
  /** Shuffled nugget ids for random-no-repeat; regenerated when the cycle ends. */
  shuffle: string[]
  lastFiredAt: number | null
}

export type VoiceSettings = {
  voiceId: string | null
  rate: number
  pitch: number
  volume: number
}

export type Settings = {
  voice: VoiceSettings
  /** Master switch. Persisted so a reload restores intent — but audio still
   *  needs a fresh user gesture, which is what the unlock banner is for. */
  armed: boolean
  /** Seconds the full-screen overlay stays up before auto-dismissing. */
  overlaySeconds: number
}

export type PersistedState = {
  schemaVersion: number
  nuggets: Nugget[]
  rituals: Ritual[]
  settings: Settings
}
