import { SCHEMA_VERSION } from '../domain/types'
import type { PersistedState } from '../domain/types'
import { defaultSettings, seedNuggets, seedRituals } from './seed'

export function freshState(): PersistedState {
  return {
    schemaVersion: SCHEMA_VERSION,
    nuggets: seedNuggets(),
    rituals: seedRituals(),
    settings: defaultSettings(),
  }
}

/**
 * Bring a persisted blob up to the current schema.
 *
 * v1 is the first version so there is nothing to transform yet — but the
 * dispatch lives here from day one because retrofitting migrations onto data
 * already in users' browsers is the expensive version of this problem.
 */
export function migrate(persisted: unknown, version: number): PersistedState {
  if (persisted === null || typeof persisted !== 'object') return freshState()

  // Data written by a NEWER build than this one (user rolled back, or two tabs
  // on different deploys). We cannot know its shape, so fail safe rather than
  // render undefined fields.
  if (version > SCHEMA_VERSION) return freshState()

  const state = persisted as Partial<PersistedState>

  // Future versions chain here, e.g.:
  //   if (version < 2) state = v1ToV2(state)

  return {
    schemaVersion: SCHEMA_VERSION,
    nuggets: Array.isArray(state.nuggets) ? state.nuggets : [],
    rituals: Array.isArray(state.rituals) ? state.rituals : [],
    settings: { ...defaultSettings(), ...(state.settings ?? {}) },
  }
}
