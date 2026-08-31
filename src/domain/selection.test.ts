import { describe, it, expect } from 'vitest'
import { pickNugget, resolvePool } from './selection'
import type { Nugget } from './types'

const mk = (id: string): Nugget => ({ id, text: `nugget ${id}`, createdAt: 0, archived: false })
const pool = [mk('a'), mk('b'), mk('c')]

/** Deterministic rng cycling through the given values. */
const seq = (values: number[]) => {
  let i = 0
  return () => values[i++ % values.length]
}

describe('resolvePool', () => {
  it('returns every live nugget for "all"', () => {
    expect(resolvePool(pool, 'all').map((n) => n.id)).toEqual(['a', 'b', 'c'])
  })
  it('excludes archived nuggets', () => {
    const withArchived = [...pool, { ...mk('d'), archived: true }]
    expect(resolvePool(withArchived, 'all').map((n) => n.id)).toEqual(['a', 'b', 'c'])
    expect(resolvePool(withArchived, ['d']).map((n) => n.id)).toEqual([])
  })
  it('filters to the selected ids in store order', () => {
    expect(resolvePool(pool, ['c', 'a']).map((n) => n.id)).toEqual(['a', 'c'])
  })
})

describe('pickNugget — sequential', () => {
  it('walks the pool in order and wraps', () => {
    let cursor = 0
    const seen: string[] = []
    for (let i = 0; i < 5; i++) {
      const r = pickNugget({ pool, pick: 'sequential', cursor, shuffle: [] })
      seen.push(r.nugget!.id)
      cursor = r.cursor
    }
    expect(seen).toEqual(['a', 'b', 'c', 'a', 'b'])
  })

  it('survives a cursor left beyond a now-shorter pool', () => {
    const r = pickNugget({ pool, pick: 'sequential', cursor: 99, shuffle: [] })
    expect(r.nugget).not.toBeNull()
  })
})

describe('pickNugget — random-no-repeat', () => {
  it('covers the whole pool before repeating anything', () => {
    let cursor = 0
    let shuffle: string[] = []
    const seen: string[] = []
    for (let i = 0; i < 3; i++) {
      const r = pickNugget({ pool, pick: 'random-no-repeat', cursor, shuffle, rng: seq([0.1, 0.7, 0.4]) })
      seen.push(r.nugget!.id)
      cursor = r.cursor
      shuffle = r.shuffle
    }
    expect([...seen].sort()).toEqual(['a', 'b', 'c'])
  })

  it('does not repeat a nugget across the cycle boundary', () => {
    let cursor = 0
    let shuffle: string[] = []
    const seen: string[] = []
    for (let i = 0; i < 12; i++) {
      const r = pickNugget({ pool, pick: 'random-no-repeat', cursor, shuffle, rng: Math.random })
      seen.push(r.nugget!.id)
      cursor = r.cursor
      shuffle = r.shuffle
    }
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i]).not.toBe(seen[i - 1])
    }
  })

  it('reshuffles when the pool membership changes underneath it', () => {
    const first = pickNugget({ pool, pick: 'random-no-repeat', cursor: 0, shuffle: ['x', 'y', 'z'] })
    expect(pool.map((n) => n.id)).toContain(first.nugget!.id)
    expect([...first.shuffle].sort()).toEqual(['a', 'b', 'c'])
  })
})

describe('pickNugget — edge cases', () => {
  it('returns null for an empty pool', () => {
    expect(pickNugget({ pool: [], pick: 'random', cursor: 0, shuffle: [] }).nugget).toBeNull()
  })

  it('never indexes past the end when rng returns 1', () => {
    const r = pickNugget({ pool, pick: 'random', cursor: 0, shuffle: [], rng: () => 1 })
    expect(r.nugget!.id).toBe('c')
  })
})
