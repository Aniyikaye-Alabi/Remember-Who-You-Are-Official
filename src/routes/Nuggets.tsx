import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'

export default function Nuggets() {
  const nuggets = useAppStore((s) => s.nuggets)
  const addNuggets = useAppStore((s) => s.addNuggets)
  const updateNugget = useAppStore((s) => s.updateNugget)
  const removeNugget = useAppStore((s) => s.removeNugget)
  const [draft, setDraft] = useState('')

  // People write these in batches — pasting a list should not mean seven
  // round-trips through a single-line input.
  const commit = () => {
    const lines = draft.split('\n')
    if (lines.some((l) => l.trim())) addNuggets(lines)
    setDraft('')
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <h2 className="data-caps text-ink-mute">Your nuggets</h2>
      <p className="mt-3 max-w-md text-2xl leading-snug tracking-[-0.02em]">
        One line each. These are the words you will hear read back to you.
      </p>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit()
        }}
        rows={3}
        placeholder={'I am better than who I was yesterday.\nGet back to work.'}
        className="mt-8 w-full resize-y rounded-lg border border-hairline bg-plaster-deep/50 p-4 leading-relaxed outline-none placeholder:text-ink-mute/55 focus:border-signal"
      />
      <div className="mt-3 flex items-center gap-4">
        <button
          onClick={commit}
          disabled={!draft.trim()}
          className="data-caps rounded-full bg-ink px-5 py-2.5 text-plaster hover:bg-signal disabled:bg-hairline disabled:text-ink-mute"
        >
          Add
        </button>
        <span className="data text-ink-mute">Ctrl / Cmd + Enter</span>
      </div>

      {nuggets.length > 0 && (
        <ul className="mt-14 border-t border-hairline">
          {nuggets.map((n) => (
            <li key={n.id} className="group flex items-start gap-4 border-b border-hairline py-3">
              <textarea
                value={n.text}
                onChange={(e) => updateNugget(n.id, { text: e.target.value })}
                rows={1}
                aria-label="Nugget text"
                className="min-h-[1.8rem] flex-1 resize-none bg-transparent leading-relaxed outline-none"
              />
              <button
                onClick={() => removeNugget(n.id)}
                aria-label={`Delete "${n.text}"`}
                className="data-caps mt-1 text-ink-mute opacity-0 transition-opacity hover:text-ochre focus-visible:opacity-100 group-hover:opacity-100"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {nuggets.length === 0 && (
        <p className="mt-14 border-t border-hairline pt-6 text-ink-mute">
          Nothing here yet. Write one thing you would want said to you at 3pm on a hard day.
        </p>
      )}
    </div>
  )
}
