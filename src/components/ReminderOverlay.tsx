import { useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { useSessionStore } from '../store/useSessionStore'

/**
 * A full-screen moment, not a toast. The whole premise of the product is that
 * the line should land — a 4px corner notification does not interrupt a person
 * who is deep in something else.
 *
 * This is the only dark surface in the app. The working screens stay in
 * daylight so that losing the daylight means something.
 */
export default function ReminderOverlay() {
  const overlay = useSessionStore((s) => s.overlay)
  const dismiss = useSessionStore((s) => s.dismissOverlay)
  const seconds = useAppStore((s) => s.settings.overlaySeconds)

  useEffect(() => {
    if (!overlay) return
    const h = window.setTimeout(dismiss, Math.max(1, seconds) * 1000)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.clearTimeout(h)
      window.removeEventListener('keydown', onKey)
    }
  }, [overlay, seconds, dismiss])

  if (!overlay) return null

  return (
    <div
      onClick={dismiss}
      role="dialog"
      aria-live="assertive"
      className="fixed inset-0 z-50 flex cursor-pointer flex-col justify-center bg-ink px-8 py-10 sm:px-16"
    >
      <div className="rwya-arrive mx-auto w-full max-w-4xl">
        <p className="data-caps text-signal-lift">{overlay.ritualName}</p>
        <p className="mt-8 text-4xl font-semibold leading-[1.05] tracking-[-0.03em] text-plaster sm:text-7xl">
          {overlay.nugget.text}
        </p>
        <p className="data mt-12 text-plaster/45">Click anywhere, or press Esc</p>
      </div>
    </div>
  )
}
