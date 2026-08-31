import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { SCHEMA_VERSION } from '../domain/types'
import type { Nugget, PersistedState, Ritual, Settings } from '../domain/types'
import { freshState, migrate } from './migrations'
import { defaultDelivery, newId, WEEKDAYS } from './seed'

export const STORAGE_KEY = 'rwya:v1'

type Actions = {
  addNuggets: (texts: string[]) => void
  updateNugget: (id: string, patch: Partial<Nugget>) => void
  removeNugget: (id: string) => void

  createRitual: () => string
  updateRitual: (id: string, patch: Partial<Ritual>) => void
  removeRitual: (id: string) => void

  /** Commit the picker's walk state after a delivery. */
  recordFire: (id: string, cursor: number, shuffle: string[], firedAt: number) => void

  updateSettings: (patch: Partial<Settings>) => void

  replaceAll: (state: PersistedState) => void
  resetAll: () => void
}

export type AppState = PersistedState & Actions

/**
 * Single source of truth. Every read and write goes through here — no component
 * touches localStorage directly, so phase 2 can swap the storage adapter below
 * for one that also syncs to a server without touching any component.
 */
export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...freshState(),

      addNuggets: (texts) =>
        set((s) => {
          const now = Date.now()
          const added = texts
            .map((t) => t.trim())
            .filter(Boolean)
            .map((text, i) => ({ id: newId(), text, createdAt: now + i, archived: false }))
          return added.length ? { nuggets: [...s.nuggets, ...added] } : {}
        }),

      updateNugget: (id, patch) =>
        set((s) => ({ nuggets: s.nuggets.map((n) => (n.id === id ? { ...n, ...patch } : n)) })),

      removeNugget: (id) =>
        set((s) => ({
          nuggets: s.nuggets.filter((n) => n.id !== id),
          // Keep rituals consistent: drop the dead reference rather than
          // leaving a ritual pointing at a nugget that no longer exists.
          rituals: s.rituals.map((r) =>
            r.nuggetIds === 'all' ? r : { ...r, nuggetIds: r.nuggetIds.filter((x) => x !== id) },
          ),
        })),

      createRitual: () => {
        const id = newId()
        set((s) => ({
          rituals: [
            ...s.rituals,
            {
              id,
              name: 'New reminder',
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
          ],
        }))
        return id
      },

      updateRitual: (id, patch) =>
        set((s) => ({ rituals: s.rituals.map((r) => (r.id === id ? { ...r, ...patch } : r)) })),

      removeRitual: (id) => set((s) => ({ rituals: s.rituals.filter((r) => r.id !== id) })),

      recordFire: (id, cursor, shuffle, firedAt) =>
        set((s) => ({
          rituals: s.rituals.map((r) =>
            r.id === id ? { ...r, cursor, shuffle, lastFiredAt: firedAt } : r,
          ),
        })),

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      replaceAll: (state) =>
        set({ nuggets: state.nuggets, rituals: state.rituals, settings: state.settings }),

      resetAll: () => set(freshState()),
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, version) => migrate(persisted, version) as AppState,
      partialize: (s) => ({
        schemaVersion: s.schemaVersion,
        nuggets: s.nuggets,
        rituals: s.rituals,
        settings: s.settings,
      }),
    },
  ),
)

/** Serializable snapshot for the export/import escape hatch. */
export function snapshot(): PersistedState {
  const s = useAppStore.getState()
  return {
    schemaVersion: SCHEMA_VERSION,
    nuggets: s.nuggets,
    rituals: s.rituals,
    settings: s.settings,
  }
}
