import type { Nugget, Ritual, Settings, Weekday } from '../domain/types'

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}-${Date.now()}`

const STARTER_TEXTS = [
  'I am better than who I was yesterday.',
  'Get back to work. The scroll can wait.',
  'You have done hard things before. This is one of them.',
  'Slow is smooth. Smooth is fast.',
  'Nobody is coming to do it for you — and that is good news.',
  'Drink some water. Sit up. Breathe.',
  'Remember who you are.',
]

export function seedNuggets(): Nugget[] {
  const now = Date.now()
  return STARTER_TEXTS.map((text, i) => ({
    id: newId(),
    text,
    createdAt: now + i,
    archived: false,
  }))
}

export const WEEKDAYS: Weekday[] = [1, 2, 3, 4, 5]

export function defaultDelivery() {
  return {
    chime: true,
    chimeId: 'bell' as const,
    volume: 0.6,
    speak: true,
    notify: true,
    overlay: true,
  }
}

/** A ready-made ritual so the app is never an empty box. Disabled by default —
 *  nothing makes a sound until the user explicitly arms it. */
export function seedRituals(): Ritual[] {
  return [
    {
      id: newId(),
      name: 'Focus check',
      enabled: false,
      nuggetIds: 'all',
      pick: 'random-no-repeat',
      schedule: {
        kind: 'interval',
        everyMinutes: 60,
        window: { start: '09:00', end: '18:00' },
        days: WEEKDAYS,
      },
      delivery: defaultDelivery(),
      cursor: 0,
      shuffle: [],
      lastFiredAt: null,
    },
  ]
}

export function defaultSettings(): Settings {
  return {
    voice: { voiceId: null, rate: 1, pitch: 1, volume: 1 },
    armed: false,
    overlaySeconds: 8,
  }
}
