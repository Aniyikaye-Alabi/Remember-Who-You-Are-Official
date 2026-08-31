import { create } from 'zustand'
import type { Nugget } from '../domain/types'
import type { FireSlot } from '../scheduler/tick'

export type Delivered = { nugget: Nugget; ritualName: string; at: number }

type SessionState = {
  /** Web Audio + speechSynthesis are gesture-gated; this is never persisted,
   *  because a reload revokes the unlock even though `settings.armed` survives. */
  audioUnlocked: boolean
  nextFire: Record<string, FireSlot>
  overlay: Delivered | null
  lastDelivered: Delivered | null

  setAudioUnlocked: (v: boolean) => void
  setNextFire: (map: Record<string, FireSlot>) => void
  showOverlay: (d: Delivered) => void
  dismissOverlay: () => void
  setLastDelivered: (d: Delivered) => void
}

export const useSessionStore = create<SessionState>()((set) => ({
  audioUnlocked: false,
  nextFire: {},
  overlay: null,
  lastDelivered: null,

  setAudioUnlocked: (v) => set({ audioUnlocked: v }),
  setNextFire: (map) => set({ nextFire: map }),
  showOverlay: (d) => set({ overlay: d }),
  dismissOverlay: () => set({ overlay: null }),
  setLastDelivered: (d) => set({ lastDelivered: d }),
}))
