# LiftTracker gym round 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Swipe between days on Home, give the workout its own `#workout` route so the Android back gesture returns Home with a live Resume card and a Discard sheet, and persist skipped, extra and chosen on the workout record.

**Architecture:** A tiny `nav.js` owns history pushes. `App.jsx` becomes the router from spec 3.2 and hosts the one `useRestWatcher` and the wake lock while a workout is active, passing `flash` down. Workout state that must survive (`skipped`, `extra`, `chosen`) moves into the Dexie workout record through `updateWorkoutState`. One pure `activeSummary` feeds both the workout header and the Resume card. Home renders a scroll-snap pager with one `DayPage` per program day and a `ResumeCard` while a workout runs.

**Tech Stack:** React 19, Vite 8, Tailwind 4, Dexie 4, Vitest 5 with jsdom, @testing-library/react, fake-indexeddb. All commands from `lifttracker/`.

**Spec:** `docs/superpowers/specs/2026-10-17-lifttracker-gym-round-2-design.md`

## Global Constraints

- Branch `feature/gym-round-2` from `main`; never commit to `main`.
- Run every command from `/Users/administrator/Documents/liftApp/Holiday/lifttracker`.
- Dexie schema stays at `db.version(1)`. No new index.
- Tokens only in JSX. Tap targets at least 44 px. Component tests start with `// @vitest-environment jsdom` and call `afterEach(cleanup)`.
- `npm test` and `npm run lint` pass before each commit. Commit messages plain English, imperative, one line.
- Copy fixed by the spec: `Resume Push A`, `Discard workout`, `Discard Push A?`, `7 logged sets are deleted. Cycle position stays.`, `1 logged set is deleted. Cycle position stays.`, `Nothing was logged. Cycle position stays.`, `Keep`, `Discard`, `Up next · day 2 of 4`, `Day 3 of 4`, `‹ Home`, caption `7 / 16 sets · 14 min · resting 0:42` / `· rest over +0:12`.
- Rest-end buzz while the screen is off, swiping between exercises, and iOS are out of scope.

## Review Focus

1. Cold open directly on `#workout` (reload while on the workout): `leaveWorkout()` must replace the hash, never `history.back()` out of the app. Tested in Task 1.
2. Finish workout then the router sees `#workout` with no active workout for a tick: Home must render, no blank screen, no double navigation. Tested in Task 5 (router) and Task 6 (finish calls `leaveWorkout` after the save).
3. A workout started before this release has no `skipped`/`extra`/`chosen`: the screen and Home must read them as empty. Tested in Task 3 (`skippedSets`, `resolveChosen` with `undefined`) and Task 2 (`getActiveView` on an old record).
4. Rest ends while Settings is open: the watcher fires from App, so the buzz happens with no screen showing it; returning to Home must not fire again. Tested in Task 4 (watcher fires once per `endsAt`) and Task 5 (App mounts the watcher whenever `active`).
5. Discard while a rest is running: the rest row and any notification must go with the workout, and Home must show the Start button again. Tested in Task 2 (`discardWorkout` clears `activeRest`) and Task 7 (card gone after discard).

---

### Task 1: `nav.js`

**Files:**
- Create: `src/lib/nav.js`
- Test: `src/test/nav.test.js`

**Interfaces:**
- Produces `enterWorkout()`: sets `window.location.hash = '#workout'` (pushes) and records `pushed = true` in module state.
- Produces `leaveWorkout()`: if `pushed`, sets `pushed = false` and calls `history.back()`; else `replaceHash('')`.
- Produces `replaceHash(hash)`: `history.replaceState(null, '', location.pathname + location.search + hash)` then `window.dispatchEvent(new HashChangeEvent('hashchange'))`.
- Produces `resetNav()` for tests (clears `pushed`).

- [ ] **Step 1: Write the failing tests** (`// @vitest-environment jsdom`)

```js
import { afterEach, describe, expect, it, vi } from 'vitest'
import { enterWorkout, leaveWorkout, replaceHash, resetNav } from '../lib/nav.js'

afterEach(() => { resetNav(); window.location.hash = ''; vi.restoreAllMocks() })

describe('nav', () => {
  it('enterWorkout pushes #workout', () => {
    enterWorkout()
    expect(window.location.hash).toBe('#workout')
  })
  it('leaveWorkout goes back once after a push, then replaces', () => {
    const back = vi.spyOn(history, 'back').mockImplementation(() => {})
    enterWorkout()
    leaveWorkout()
    expect(back).toHaveBeenCalledTimes(1)
    window.location.hash = '#workout'
    leaveWorkout()
    expect(back).toHaveBeenCalledTimes(1)
    expect(window.location.hash).toBe('')
  })
  it('replaceHash fires hashchange', () => {
    const onChange = vi.fn()
    window.addEventListener('hashchange', onChange)
    replaceHash('#settings')
    expect(window.location.hash).toBe('#settings')
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 2: Run** `npm test -- src/test/nav.test.js` — expect module not found.
- [ ] **Step 3: Implement `src/lib/nav.js`** per Interfaces. One module-level `let pushed = false`.
- [ ] **Step 4: Run** the test — PASS.
- [ ] **Step 5: Commit** `Add nav helpers for the workout route`

---

### Task 2: Workout record fields, discard, active view

**Files:**
- Modify: `src/db/workouts.js`
- Modify: `src/db/queries.js`
- Test: `src/test/workouts-db.test.js` (new), `src/test/home-view.test.js` (new, the `getActiveView` part)

**Interfaces:**
- `startWorkout(programDayId)` writes `{ ..., skipped: {}, extra: {}, chosen: {} }`.
- Produces `updateWorkoutState(id, patch)`: `db.workouts.update(id, patch)` where `patch` holds any of `skipped`, `extra`, `chosen` (whole-field replace, not deep merge).
- Produces `discardWorkout(id)`: one `rw` transaction over `workouts`, `sets`, `settings`: delete sets `where('workoutId').equals(id)`, delete `activeRest`, delete the workout.
- Produces `getActiveView()` in `queries.js`: `null` with no active workout, else `{ workout, day, loggedSets, exercisesById }` (`loggedSets` = sets of that workout, `exercisesById` a `Map`).

- [ ] **Step 1: Write the failing tests** (`import 'fake-indexeddb/auto'`, `seedIfEmpty()` in `beforeEach` after `db.delete()`+`db.open()` as `sets-db.test.js` does)

```js
it('startWorkout writes empty skipped, extra and chosen', async () => {
  const w = await startWorkout('push-a')
  expect(w.skipped).toEqual({}); expect(w.extra).toEqual({}); expect(w.chosen).toEqual({})
})
it('updateWorkoutState replaces the given fields only', async () => {
  const w = await startWorkout('push-a')
  await updateWorkoutState(w.id, { skipped: { 'barbell-bench-press': [2] } })
  await updateWorkoutState(w.id, { extra: { 'barbell-bench-press': 1 } })
  const stored = await db.workouts.get(w.id)
  expect(stored.skipped).toEqual({ 'barbell-bench-press': [2] })
  expect(stored.extra).toEqual({ 'barbell-bench-press': 1 })
})
it('discardWorkout removes the workout, its sets and the running rest', async () => {
  const w = await startWorkout('push-a')
  const s = await logSet({ workoutId: w.id, exerciseId: 'barbell-bench-press', setNumber: 1, weight: 60, unit: 'kg', reps: 8 })
  await saveActiveRest(startRest({ exerciseId: 'barbell-bench-press', exerciseName: 'Bench press', restSeconds: 90, setId: s.id }))
  await discardWorkout(w.id)
  expect(await db.workouts.get(w.id)).toBeUndefined()
  expect(await db.sets.where('workoutId').equals(w.id).count()).toBe(0)
  expect(await getActiveRest()).toBeNull()
  expect(await getActiveWorkout()).toBeNull()
})
it('getActiveView is null without a workout and reads an old record as-is', async () => {
  expect(await getActiveView()).toBeNull()
  await db.workouts.add({ id: 'old', programDayId: 'push-a', startedAt: new Date().toISOString(), finishedAt: null })
  const view = await getActiveView()
  expect(view.workout.id).toBe('old'); expect(view.day.id).toBe('push-a')
  expect(view.workout.skipped).toBeUndefined()
  expect(view.exercisesById.get('barbell-bench-press').name).toMatch(/bench/i)
})
```

Check the real program day id in `src/db/program.js` (`push-a` or whatever the seed uses) before writing the tests.

- [ ] **Step 2: Run** `npm test -- src/test/workouts-db.test.js src/test/home-view.test.js` — FAIL on missing exports.
- [ ] **Step 3: Implement** per Interfaces.
- [ ] **Step 4: Run** — PASS. Run full `npm test` to confirm `seed`, `backup-db` untouched.
- [ ] **Step 5: Commit** `Persist workout state fields and add discard and active view queries`

---

### Task 3: Pure helpers: `skippedSets`, `resolveChosen`, `activeSummary`, `elapsedMinutes`

**Files:**
- Modify: `src/lib/workoutProgress.js`
- Test: `src/test/workoutProgress.test.js` (append)

**Interfaces:**
- `skippedSets(skipped)`: `{ id: number[] } | undefined` → `{ id: Set<number> }` (empty object for `undefined`).
- `resolveChosen(day, workout, loggedSets)`: array of exercise ids, one per slot: `workout.chosen?.[index]` if it is one of the slot's `exerciseIds`, else the slot option with a logged set this workout, else `slot.exerciseIds[0]`.
- `elapsedMinutes(startedAtIso, nowMs)`: `14 min`, `1 h 02 min` from 60 min on, `0 min` under a minute.
- `activeSummary({ day, workout, loggedSets, exercisesById, rest, now })`: builds entries `{ slot, exercise, previousSets: [], index }` from `resolveChosen`, calls `buildPlan(entries, loggedSets, skippedSets(workout.skipped), workout.extra ?? {}, null)`, returns `{ done, total, nextSet, elapsedText, restText }` where `nextSet` is `{ exerciseName: shortName(...), setNumber, total }` of the open row or `null`, `elapsedText` from `elapsedMinutes`, `restText` is `resting 0:42` / `rest over +0:12` / `''` using `restPhase` and `formatCountdown`.

- [ ] **Step 1: Write the failing tests**

```js
describe('round 2 helpers', () => {
  it('skippedSets converts arrays and tolerates undefined', () => {
    expect(skippedSets(undefined)).toEqual({})
    expect(skippedSets({ a: [1, 3] }).a.has(3)).toBe(true)
  })
  it('resolveChosen prefers chosen, then logged, then first', () => {
    const day = { slots: [{ exerciseIds: ['x', 'y'] }, { exerciseIds: ['p', 'q'] }, { exerciseIds: ['m'] }] }
    const logged = [{ exerciseId: 'q', setNumber: 1 }]
    expect(resolveChosen(day, { chosen: { 0: 'y' } }, logged)).toEqual(['y', 'q', 'm'])
    expect(resolveChosen(day, { chosen: { 0: 'zzz' } }, [])).toEqual(['x', 'p', 'm'])
    expect(resolveChosen(day, {}, [])).toEqual(['x', 'p', 'm'])
  })
  it('elapsedMinutes', () => {
    const t0 = new Date('2026-10-17T10:00:00Z').toISOString()
    expect(elapsedMinutes(t0, Date.parse('2026-10-17T10:14:30Z'))).toBe('14 min')
    expect(elapsedMinutes(t0, Date.parse('2026-10-17T11:02:00Z'))).toBe('1 h 02 min')
    expect(elapsedMinutes(t0, Date.parse('2026-10-17T10:00:20Z'))).toBe('0 min')
  })
  it('activeSummary agrees with buildPlan and names the next set', () => {
    // day with two slots: targetSets 3 and 2, same shape the existing buildPlan tests use
    const summary = activeSummary({ day, workout: { startedAt: t0, skipped: { a: [3] }, extra: { b: 1 }, chosen: {} }, loggedSets: [set('a', 1), set('a', 2)], exercisesById, rest: null, now })
    expect(summary.done).toBe(2)
    expect(summary.total).toBe(2 + 3) // a: 3 − 1 skipped; b: 2 + 1 extra
    expect(summary.nextSet).toEqual({ exerciseName: 'B', setNumber: 1, total: 3 })
    expect(summary.restText).toBe('')
    const running = startRest({ exerciseId: 'a', exerciseName: 'A', restSeconds: 90 }, now - 48_000)
    expect(activeSummary({ ...args, rest: running }).restText).toBe('resting 0:42')
    expect(activeSummary({ ...args, rest: startRest({ exerciseId: 'a', exerciseName: 'A', restSeconds: 90 }, now - 102_000) }).restText).toBe('rest over +0:12')
  })
})
```

Build the fixtures the way `workoutProgress.test.js` already does (`exercise`, `slot` helpers at the top of the file).

- [ ] **Step 2: Run** `npm test -- src/test/workoutProgress.test.js` — FAIL.
- [ ] **Step 3: Implement** the four functions per Interfaces, after `restPhase`.
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `Add pure helpers for the resume summary and persisted workout state`

---

### Task 4: `useRestWatcher` and a prop-driven `RestDock`

**Files:**
- Create: `src/lib/useRestWatcher.js`
- Modify: `src/components/RestDock.jsx`
- Test: `src/test/useRestWatcher.test.jsx` (new), `src/test/restdock.test.jsx` (modify the flash test)

**Interfaces:**
- `useRestWatcher(rest, { notify, nextSet })` → `flash: boolean`. Owns the 250 ms ticker (`useNow` moves here, `visibilitychange` tick kept), the `firedFor` ref (initialised to `rest.endsAt` when already over at mount), the fire effect (`showRestNotification` when `notify`, `signalRestOver()`, `setFlash(true)`), the `FLASH_MS` clear, and the reset on `rest?.endsAt` change.
- `RestDock({ rest, nextSlug, flash = false, onAdjust, onSkip })`: no `notify`/`nextSet` props, no firing effect, keeps its own `useNow` for the countdown display.

- [ ] **Step 1: Write the failing hook test** with a `Probe` component rendering `flash ? 'flash' : 'calm'`, `vi.useFakeTimers()`, `vi.mock('../lib/restNotification.js', ...)` to spy on `signalRestOver` and `showRestNotification`:

```js
it('fires once at zero, flashes for FLASH_MS, and not again for the same rest', ...)  // advance 2_250 → 'flash', signalRestOver 1 call; advance 2_500 → 'calm'; advance 5_000 → still 1 call
it('does not fire for a rest already over at mount', ...)                              // mount with endsAt in the past → signalRestOver 0 calls, 'calm'
it('sends the notification only when notify is true', ...)                             // notify false → showRestNotification 0 calls; notify true → 1 call with nextSet
it('resets for a new rest', ...)                                                       // rerender with a new rest → 'calm' immediately, fires again at its zero
```

- [ ] **Step 2: Update** `restdock.test.jsx` "flashes once at zero…" to render `<RestDock rest={rest} flash />` and assert `bg-act`, then `flash={false}` and assert not. Drop timer-driven flash assertions from that test (they now live in the hook test). Keep overtime and idle tests unchanged.
- [ ] **Step 3: Run** both files — FAIL (hook missing, dock ignores prop).
- [ ] **Step 4: Implement** hook and trim `RestDock` per Interfaces. `RestDock` still imports `useNow`-style ticking for the countdown; move `useNow` into `useRestWatcher.js` as a named export and import it in the dock.
- [ ] **Step 5: Run** — PASS. Full `npm test` — `restNotification`, `workout-screen` unaffected.
- [ ] **Step 6: Commit** `Move rest-end firing into a hook and let the dock take flash as a prop`

---

### Task 5: Router, App-level watcher and wake lock

**Files:**
- Modify: `src/App.jsx`
- Test: `src/test/router.test.jsx` (new)

**Interfaces:**
- `App` reads `active = useLiveQuery(getActiveView)` (replaces `getActiveWorkout`), `rest = useLiveQuery(getActiveRest)`, `keepScreenOn`, `notifyPref` settings.
- Routing per spec 3.2 table. `#workout` with `active === null`: call `replaceHash('')` in an effect and render `Home`.
- Cold open: effect `if (active && hash === '' && !bootPushed.current) { bootPushed.current = true; enterWorkout() }` where `bootPushed` is a `useRef(false)` and the effect runs once after the first resolved `active` (guard against StrictMode by the ref).
- `useWakeLock(Boolean(active) && keepScreenOn !== false)`.
- `const flash = useRestWatcher(active ? rest ?? null : null, { notify, nextSet })` with `notify = notifyPref !== false && notificationPermission() === 'granted'` and `nextSet = active ? activeSummary({ ...active, rest: rest ?? null, now: Date.now() }).nextSet : null`.
- Renders `<Workout workoutId={active.workout.id} flash={flash} />` and `<Home active={active} rest={rest ?? null} flash={flash} update={update} onStart={async (day) => { await startWorkout(day.id); enterWorkout() }} onResume={enterWorkout} />`.

- [ ] **Step 1: Write the failing router test.** Mock `dexie-react-hooks` `useLiveQuery` to return values from a table keyed by the query function's name, mock `../lib/update.js`, `../lib/wakeLock.js`, `../lib/useRestWatcher.js` (return `false`), and stub `Home`, `Workout`, `Settings`, `ExerciseSettings` with `vi.mock` returning labelled `<div>`s. Cases from the 3.2 table:

```js
it.each([
  ['', null, 'home'], ['', ACTIVE, 'home'], ['#workout', ACTIVE, 'workout'],
  ['#workout', null, 'home'], ['#settings', ACTIVE, 'settings'], ['#settings/deadlift', null, 'exercise-settings'],
])('hash %s with active %s renders %s', ...)
it('replaces #workout with empty when no workout is active', ...)   // location.hash '' after render
it('pushes #workout once on cold open with an active workout', ...)  // hash '' + ACTIVE → hash becomes '#workout'; rerender does not push twice (history.length unchanged)
it('holds the wake lock only while a workout is active', ...)        // useWakeLock spy called with true for ACTIVE, false for null
it('mounts the rest watcher with the rest only while active', ...)   // useRestWatcher spy first arg null when no workout
```

- [ ] **Step 2: Run** `npm test -- src/test/router.test.jsx` — FAIL.
- [ ] **Step 3: Implement** `App.jsx` per Interfaces. Keep `useHash` as is.
- [ ] **Step 4: Run** — PASS. `update-placement.test.js` still passes (`useAppUpdate()` stays).
- [ ] **Step 5: Commit** `Route the workout under #workout and host the rest watcher and wake lock in App`

---

### Task 6: Workout screen: persisted state, Home link, leave on finish, flash prop

**Files:**
- Modify: `src/screens/Workout.jsx`
- Test: `src/test/workout-screen.test.jsx` (append source-level assertions), `src/test/workout-state.test.js` (new, db-level)

**Interfaces:**
- Props become `{ workoutId, flash = false }`. `onFinished` removed.
- Remove `useState` for `chosen`, `skipped`, `extra`; read `view.workout.chosen ?? {}`, `skippedSets(view.workout.skipped)`, `view.workout.extra ?? {}`.
- Remove `useWakeLock`, `notify`, `nextSet`, `getRegistration().then(closeRestNotifications)` stays. `RestDock` gets `flash={flash}`.
- Entries: `const ids = resolveChosenWithHistory(...)`: keep `defaultExerciseId(slot, loggedSets)` for slots missing from `workout.chosen`; an effect after the first render with `view` writes `updateWorkoutState(workout.id, { chosen: resolvedMap })` when any slot was missing (once per mount, guarded by a ref keyed on `workout.id`).
- Tapping an alternative: `updateWorkoutState(workout.id, { chosen: { ...workout.chosen, [slotIndex]: option.id } })`.
- Skip/Unskip: `updateWorkoutState(workout.id, { skipped: { ...workout.skipped, [exerciseId]: nextArray } })`. Add set: `extra` likewise.
- Header left becomes `<a href="#" onClick={(e) => { e.preventDefault(); leaveWorkout() }} className="inline-flex h-11 items-center gap-1 font-semibold text-act">‹ Home</a>` followed by `{day.name} · {elapsed}`; right side unchanged.
- `finish`: `await saveActiveRest(null); await finishWorkout(workout.id); setConfirming(false); leaveWorkout()`.

- [ ] **Step 1: Write the failing tests.**

`workout-state.test.js` (fake-indexeddb): start a workout, call `updateWorkoutState` the way the screen will (skipped `[2]`, extra `1`, chosen `{1: 'dumbbell-...'}`), reload via `getWorkoutView`, assert `buildPlan(..., skippedSets(workout.skipped), workout.extra)` yields a `skipped` row 2 and `total` +1 — proving the persisted shape drives the plan.

Source-level, appended to `workout-screen.test.jsx` (read `screens/Workout.jsx` as text like `update-placement.test.js`):

```js
it('persists skipped, extra and chosen through updateWorkoutState and never keeps them in state', () => {
  expect(src).toMatch(/updateWorkoutState\(/)
  expect(src).not.toMatch(/useState\(\{\}\)/)
})
it('leaves through nav after finishing and from the header link', () => {
  expect(src).toMatch(/await finishWorkout\(workout\.id\)[\s\S]*leaveWorkout\(\)/)
  expect(src).toMatch(/‹ Home/)
})
it('passes flash to the dock and has no watcher or wake lock of its own', () => {
  expect(src).toMatch(/<RestDock[^>]*flash=\{flash\}/)
  expect(src).not.toMatch(/useWakeLock|useRestWatcher|notify=\{/)
})
```

- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** per Interfaces.
- [ ] **Step 4: Run** full `npm test` and `npm run lint` — PASS. `hero-names`, `notify-sheet` tests still pass.
- [ ] **Step 5: Commit** `Persist skipped, extra and chosen on the workout and leave through the Home link`

---

### Task 7: Home pager, Resume card, Discard sheet

**Files:**
- Create: `src/components/DayPage.jsx`, `src/components/ResumeCard.jsx`
- Modify: `src/screens/Home.jsx`, `src/db/queries.js` (`getHomeView`), `src/index.css` (scrollbar hide utility)
- Test: `src/test/home-view.test.js` (append), `src/test/home-pager.test.jsx` (new)

**Interfaces:**
- `getHomeView()` → `{ nextDay, days: [{ day, stripSlugs, firstExercise, firstSession, lastWorkout }], exercisesById }`. `lastWorkout` per day = newest finished workout with that `programDayId` or `null`. Strip and first-session logic as today, computed per day.
- `DayPage({ entry, index, count, upNext })`: `<section aria-label={day.name} className="w-full shrink-0 snap-start px-5">` with the poster (`Up next · day N of 4` when `upNext`, else `Day N of 4`), the illustration strip, and the `dl` (Last completed, `<first> last time`).
- `ResumeCard({ summary, dayName, flash, onResume, onDiscard })`: primary button `Resume {dayName}` 60 px with caption line `{done} / {total} sets · {elapsedText}{restText ? ' · ' + restText : ''}` inside; classes `bg-act text-on-act` normally and, when `flash`, `bg-act text-on-act ring-4 ring-act/40` plus caption `font-semibold` (the spec says amber for `FLASH_MS`; the button is already amber, so flash is a ring and bolder caption). Ghost button `Discard workout` 52 px.
- `Home({ active, rest, flash, update, onStart, onResume })`: pager `<div ref className="-mx-5 flex snap-x snap-mandatory overflow-x-auto no-scrollbar" aria-roledescription="carousel">`, `onScroll` sets `page = Math.round(scrollLeft / clientWidth)`; `useEffect` after `view` resolves scrolls to the `nextDay` index with `behavior: 'instant'` once. Cycle bar and install row render below the pager, outside it. Bottom area: `Start {days[page].day.name}` when `!active`, else `<ResumeCard>`; a `useTicker(1000)` drives `activeSummary` for the caption. `UpdateBanner` only when `!active`. Discard sheet: `BottomSheet` titled `Discard {day.name}?` with the copy rule from Global Constraints and `Keep` / `Discard`; `Discard` calls `discardWorkout(active.workout.id)` then `getRegistration().then(closeRestNotifications)`.
- `index.css`: `.no-scrollbar { scrollbar-width: none } .no-scrollbar::-webkit-scrollbar { display: none }`.

- [ ] **Step 1: Write the failing `getHomeView` test** (append to `home-view.test.js`): seed, finish one Push A workout with a bench set, assert `days.length === 4`, `days[0].lastWorkout.programDayId === 'push-a'`, `days[1].lastWorkout === null`, `days[0].firstSession.sets.length === 1`, `days[0].stripSlugs.length === days[0].day.slots.length`, and `nextDay.id === 'pull-a'`.
- [ ] **Step 2: Write the failing `home-pager.test.jsx`.** Mock `dexie-react-hooks` `useLiveQuery` to return a fixed home view (4 days, next = day 2), mock `../lib/install.js` (`canInstall false`), mock `../db/workouts.js` `discardWorkout`. Assertions:

```js
it('renders one page per day and no "Start a different day"', ...)                // 4 sections by aria-label; queryByText('Start a different day') null
it('opens on the up-next page and labels it', ...)                                 // getByText('Up next · day 2 of 4'); getByText('Day 3 of 4'); Start button name 'Start Pull A'
it('Start follows the page on scroll', ...)                                         // set scrollLeft/clientWidth on the pager (Object.defineProperty), fireEvent.scroll → 'Start Push B'; onStart called with that day
it('shows the Resume card, hides Start and the update banner while active', ...)   // render with active + rest; getByRole('button', {name: /Resume Push A/}); caption matches /\d+ \/ \d+ sets · \d+ min · resting \d:\d\d/; queryByRole('button', {name: /^Start /}) null; UpdateBanner text absent even with update.ready true
it('Discard confirms through a sheet with the set count', ...)                     // click 'Discard workout' → dialog 'Discard Push A?' with '2 logged sets are deleted. Cycle position stays.'; 'Keep' closes without calling discardWorkout; reopen, 'Discard' calls discardWorkout(id)
it('singular and empty discard copy', ...)                                           // 1 set → '1 logged set is deleted…'; 0 → 'Nothing was logged. Cycle position stays.'
it('flash rings the resume button', ...)                                             // flash prop → className contains 'ring-4'
```

- [ ] **Step 3: Run** both — FAIL.
- [ ] **Step 4: Implement** `getHomeView`, `DayPage`, `ResumeCard`, `Home`, the CSS utility per Interfaces. Remove the `DaySheet` import and `picking` state from Home.
- [ ] **Step 5: Run** full `npm test`, `npm run lint`, and `npx vitest run src/test/tap-targets.test.js src/test/contrast.test.js` explicitly — PASS.
- [ ] **Step 6: Commit** `Swipe between days on Home and resume or discard a running workout`

---

### Task 8: Backup round-trip, decisions log, docs

**Files:**
- Test: `src/test/backup.test.js` (append)
- Modify: `prd.md` (decisions log), `PRODUCT.md` (Home and navigation paragraphs), `../docs/superpowers/specs/2026-10-16-lifttracker-gym-round-1-design.md` (section 3 gets a one-line pointer to the round 2 spec)

- [ ] **Step 1: Write the failing backup test**

```js
it('keeps skipped, extra and chosen on workouts and accepts old backups without them', () => {
  const withFields = { ...valid, workouts: [{ id: 'w', programDayId: 'push-a', startedAt: t, finishedAt: null, skipped: { a: [2] }, extra: { a: 1 }, chosen: { 0: 'a' } }] }
  const parsed = parseBackup(JSON.stringify(withFields))
  expect(parsed.ok).toBe(true)
  expect(parsed.data.workouts[0].chosen).toEqual({ 0: 'a' })
  expect(parseBackup(JSON.stringify(valid)).ok).toBe(true)
})
```

- [ ] **Step 2: Run** — expected to PASS already (parser keeps unknown fields). If it fails, fix `parseBackup` to keep whole records.
- [ ] **Step 3: Add to `prd.md` decisions log:** `| October 17, 2026 | Gym round 2: Home is a swipe pager over the four days; the workout lives under `#workout` so the back gesture returns Home, which shows a live Resume card and a Discard sheet; skipped, extra and chosen sets are stored on the workout. See `docs/superpowers/specs/2026-10-17-lifttracker-gym-round-2-design.md`. |`. Update `PRODUCT.md` Home and Workout paragraphs in two or three sentences each. Replace the round 1 spec's section 3 body with `Superseded by 2026-10-17-lifttracker-gym-round-2-design.md.`
- [ ] **Step 4: Run** `npm test` and `npm run lint` — PASS.
- [ ] **Step 5: Commit** `Record the gym round 2 decisions`

---

## Self-review notes

- Spec 3.1 → Task 7. 3.2 → Tasks 1, 5, 6. 3.3 → Tasks 3, 7. 3.4 → Tasks 2, 3, 6, 8. 3.5 → Tasks 4, 5, 6, 7 (banner hidden). Section 4 → Task 2 and 7. Section 6 tests all placed.
- Names used across tasks: `enterWorkout`, `leaveWorkout`, `replaceHash`, `updateWorkoutState`, `discardWorkout`, `getActiveView`, `skippedSets`, `resolveChosen`, `elapsedMinutes`, `activeSummary`, `useRestWatcher`, `flash`, `DayPage`, `ResumeCard`.
- Review Focus 1–5 each have an owning test (Tasks 1, 5/6, 2/3, 4/5, 2/7).
