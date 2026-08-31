# Remember Who You Are

Write down the things you need said back to you — *"I am better than who I was yesterday"*, *"get back to work, don't Slack"* — set when they should reach you, and the app chimes and **speaks them aloud** on a schedule.

No signup. No server. Everything lives in your browser.

## Running it

```bash
npm install
npm run dev      # http://127.0.0.1:3000
npm run test     # scheduling + selection + migration tests
npm run build
```

## How it works

**Nuggets** are the lines you write. **Reminders** are rules that decide which nuggets reach you and when — every N minutes inside a time window, or at fixed times, on chosen days.

Press **Arm reminders** to start. That button is also the audio unlock: browsers refuse to play sound or speak until a real click has happened, so arming and unlocking are deliberately the same action. After a page reload the browser revokes that permission, and a banner appears asking for one click to restore it — because a reminder app that looks armed while being silent is worse than one that is obviously off.

When a reminder fires: chime → short pause → the nugget spoken aloud → an OS notification → a full-screen card. Each of those four is toggleable per reminder.

### Things worth knowing

- **Phase 1 needs the tab open.** Closed-tab reminders need Web Push and a backend; the code is arranged for that (see below) but does not do it yet.
- **Missed reminders collapse into one.** If your laptop sleeps through three hours of hourly reminders, you get one on wake, not four. The next target is recomputed from the current time.
- **Your data is in this browser only.** Clearing site data erases it. Settings → Backup exports and re-imports a JSON file; use it.

## Layout

```
src/
  domain/      types, computeNextFire (pure), nugget selection (pure)
  scheduler/   planTick (pure decision), useScheduler (the clock), deliver (chime→voice→notify)
  audio/       gesture unlock, synthesized chimes, voice/ provider
  notify/      Notification API wrapper
  store/       persisted app store, session store, migrations, seed data
  components/  ArmButton, AudioBanner, Countdown, DayRibbon, RitualEditor, ReminderOverlay
  routes/      Now, Nuggets, Rituals, Settings
```

### Looking at it

The working screens sit in daylight — a cool limewash plaster, aubergine ink, ultramarine for anything live. The one dark surface in the app is the delivery overlay, so that losing the daylight means something. Times, counts and day letters are all set in mono because they have to align in a column.

The **day ribbon** under the header draws today: a tick for every moment an enabled reminder will speak, spent ones in ochre, coming ones in ultramarine, a hairline at now. `domain/schedule.ts` exports `firingsOnDay` for it — a pure function sharing its window arithmetic with `computeNextFire`, so the picture and the countdown cannot disagree.

The scheduler is one 1-second wall-clock tick for the whole app, not one `setTimeout` per reminder. Long timeouts drift, background tabs get throttled, and sleeping machines fire no timers at all — comparing `Date.now()` against an absolute target survives all three. The decision itself is a pure function (`scheduler/tick.ts`) so the catch-up behaviour is unit tested rather than hoped for.

## Built to be extended

Three seams exist so phase 2 is an addition, not a rewrite:

| Seam | Now | Later |
|---|---|---|
| `audio/voice/types.ts` — `VoiceProvider` | Web Speech API | Neural TTS with cached per-nugget audio |
| `store/useAppStore.ts` — persist adapter | `localStorage` | Server sync, anonymous device ID, optional accounts |
| `domain/schedule.ts` — `computeNextFire` | Runs in the tab | Same pure function run server-side to drive Web Push |
