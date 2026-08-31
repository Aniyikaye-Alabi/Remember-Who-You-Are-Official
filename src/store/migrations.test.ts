import { describe, it, expect } from 'vitest'
import { migrate, freshState } from './migrations'
import { SCHEMA_VERSION } from '../domain/types'

describe('migrate', () => {
  it('loads a current-version blob unchanged', () => {
    const state = freshState()
    const out = migrate(state, SCHEMA_VERSION)
    expect(out.nuggets).toEqual(state.nuggets)
    expect(out.rituals).toEqual(state.rituals)
    expect(out.schemaVersion).toBe(SCHEMA_VERSION)
  })

  it('falls back to a fresh seed for data from a newer build', () => {
    const out = migrate({ nuggets: [{ id: 'x' }] }, SCHEMA_VERSION + 1)
    expect(out.nuggets.length).toBeGreaterThan(0)
    expect(out.nuggets[0].id).not.toBe('x')
  })

  it('survives corrupt or non-object storage without throwing', () => {
    expect(() => migrate(null, SCHEMA_VERSION)).not.toThrow()
    expect(() => migrate('garbage', SCHEMA_VERSION)).not.toThrow()
    expect(migrate({ nuggets: 'not-an-array' }, SCHEMA_VERSION).nuggets).toEqual([])
  })

  it('backfills settings fields missing from older data', () => {
    const out = migrate({ nuggets: [], rituals: [], settings: { overlaySeconds: 3 } }, SCHEMA_VERSION)
    expect(out.settings.overlaySeconds).toBe(3)
    expect(out.settings.voice).toBeDefined()
    expect(out.settings.armed).toBe(false)
  })
})
