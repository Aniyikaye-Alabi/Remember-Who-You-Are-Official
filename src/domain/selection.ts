import type { Nugget, PickMode } from './types'

export type PickInput = {
  pool: Nugget[]
  pick: PickMode
  cursor: number
  shuffle: string[]
  /** Injected for deterministic tests. */
  rng?: () => number
}

export type PickResult = {
  nugget: Nugget | null
  cursor: number
  shuffle: string[]
}

function shuffled(ids: string[], rng: () => number): string[] {
  const out = [...ids]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((id) => set.has(id))
}

/**
 * Choose the next nugget to deliver. Pure: returns the updated cursor and
 * shuffle so the caller decides when to commit them to the store.
 */
export function pickNugget({ pool, pick, cursor, shuffle, rng = Math.random }: PickInput): PickResult {
  if (pool.length === 0) return { nugget: null, cursor, shuffle }

  if (pick === 'sequential') {
    const index = ((cursor % pool.length) + pool.length) % pool.length
    return { nugget: pool[index], cursor: index + 1, shuffle }
  }

  if (pick === 'random') {
    const index = Math.floor(rng() * pool.length)
    return { nugget: pool[Math.min(index, pool.length - 1)], cursor, shuffle }
  }

  // random-no-repeat: walk a shuffled cycle, reshuffling once it is exhausted
  // so every nugget is heard before any repeats.
  const ids = pool.map((n) => n.id)
  let deck = shuffle
  let at = cursor
  const lastPlayed = deck.length > 0 && at > 0 ? deck[at - 1] : null

  if (!sameSet(deck, ids) || at >= deck.length) {
    deck = shuffled(ids, rng)
    // Avoid hearing the same line twice across the cycle boundary.
    if (deck.length > 1 && lastPlayed !== null && deck[0] === lastPlayed) {
      ;[deck[0], deck[1]] = [deck[1], deck[0]]
    }
    at = 0
  }

  const id = deck[at]
  const nugget = pool.find((n) => n.id === id) ?? pool[0]
  return { nugget, cursor: at + 1, shuffle: deck }
}

/** The nuggets a ritual is allowed to draw from, in stable store order. */
export function resolvePool(all: Nugget[], nuggetIds: string[] | 'all'): Nugget[] {
  const live = all.filter((n) => !n.archived)
  if (nuggetIds === 'all') return live
  const wanted = new Set(nuggetIds)
  return live.filter((n) => wanted.has(n.id))
}
