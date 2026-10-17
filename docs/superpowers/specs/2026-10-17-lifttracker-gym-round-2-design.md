# LiftTracker gym round 2: Home pager and leaving a workout

**Date:** October 17, 2026
**Status:** approved in conversation on October 16, 2026; this document is the written design
**Builds on:** `2026-10-16-lifttracker-gym-round-1-design.md` section 3 (the sketch this replaces)

## 1. Intent

Two things Franklin wanted after his first gym session with the app, plus
the gaps found while shaping them.

1. On Home, see the other program days by swiping, not through a sheet.
2. During a workout, the Android back gesture returns to Home with the
   workout still running, and Home offers a way back in (or a way to throw
   the workout away). Skipped sets and added sets must survive this.

Everything in this round is navigation and persistence. No change to the
program, the set logging rules, the rest timer rules, or the visuals of
the workout screen below its header.

## 2. Goals, non-goals, anti-goals

Goals

- Swipe between the four days on Home. Start whichever day is on screen.
- Back gesture (and a header link) leaves the workout without ending it.
- Home shows a live Resume card while a workout runs. Resume is one tap.
  Discard is two taps (sheet confirms).
- Skipped sets, added sets, and the alternative chosen for a slot survive
  leaving the screen, reloading, and reinstalling from a backup.
- A rest that ends while Home is showing still signals the way it does on
  the workout screen.

Non-goals

- Swiping between exercises inside a workout.
- Any iOS work.
- Push notifications for a locked screen (Phase 3).
- Changing "Cycle position" in Settings. It stays as it is.

Anti-goals

- A back gesture that silently ends or discards a workout.
- Discard reachable in one tap.
- A Start button that starts a day other than the one on screen.
- A rest that ends on Home with no buzz, no flash, and no notification.

## 3. Behaviour

### 3.1 Home day pager

Home keeps its header (LiftTracker, Settings), the update banner, the
cycle bar and the install row. Between the header and the Start button
sits a horizontal pager with one page per program day, in cycle order.

Each page is the poster for that day: the "day N of 4" line, the big day
name, the illustration strip for that day's slots, the "Last completed"
line (that day's most recent finished workout, or `–`), and the
"<first exercise> last time" line for that day's first exercise.

The pager uses native horizontal scrolling with `scroll-snap-type: x
mandatory` and one snap point per page. No custom gesture code. Home
opens on the page for the day up next. The current page is the page
nearest the scroll position.

The "day N of 4" line reads `Up next · day 2 of 4` on the up-next page and
`Day 3 of 4` on the others. The cycle bar below the day name stays where
it is and keeps its meaning (position in the cycle); it does not move
with the pager. There is no dot indicator. The day name and the "Up next"
wording tell the user where they are.

The Start button is pinned at the bottom as today and reads
`Start <day on screen>`. Starting a day that is not up next behaves as
today: the cycle position moves only when that workout is finished. The
"Start a different day" button and its sheet are removed from Home.
`DaySheet` stays for Settings "Cycle position".

Keyboard and screen-reader users: each page is a `section` with
`aria-label` of the day name, and the pager has `aria-roledescription`
`carousel`. Nothing more.

### 3.2 Routes and the back gesture

The workout screen gets a hash route, `#workout`. The router in `App.jsx`
becomes:

| Hash | Active workout | Screen |
|---|---|---|
| `` (empty) | none | Home |
| `` (empty) | yes | Home with Resume card (see 3.3) |
| `#workout` | yes | Workout |
| `#workout` | none | Home (and the hash is replaced with ``) |
| `#settings` | any | Settings |
| `#settings/<id>` | any | ExerciseSettings |

Entering the workout always pushes a history entry, so one back gesture
returns to Home:

- Start on Home: create the workout, then push `#workout`.
- Resume on Home: push `#workout`.
- Cold open with a workout already running and an empty hash: push
  `#workout` once, so the app opens on the workout (as today) and back
  still goes Home.

Leaving the workout: the Android back gesture and the browser back button
pop that entry. A `‹ Home` link in the workout header does the same
through `history.back()` when this session pushed the entry, otherwise it
replaces the hash with `` (a cold open directly on `#workout`). Finishing
a workout leaves the same way after the finish is saved.

Settings' Back link stays `#` (Home). Settings is not reachable from the
workout screen, so nothing else changes.

A small module `src/lib/nav.js` owns this: `enterWorkout()`,
`leaveWorkout()`, `replaceHash(hash)`. `replaceHash` uses
`history.replaceState` and dispatches a `hashchange` event so `useHash`
updates.

### 3.3 Resume card and Discard

With a workout running, Home's pinned bottom area shows the Resume card
instead of the Start button:

- Primary button (amber, 60 px): `Resume Push A`.
- Caption under the day name inside the button area, live:
  `7 / 16 sets · 14 min · resting 0:42` while a rest runs,
  `7 / 16 sets · 14 min · rest over +0:12` in overtime,
  `7 / 16 sets · 14 min` with no rest. Minutes come from `formatElapsed`
  trimmed to minutes (`14 min`, `1 h 02 min` past an hour).
- Ghost button (52 px, border, ink-2): `Discard workout`.

The pager is still swipeable and still shows every day, but no Start
button exists anywhere on Home while a workout runs.

Discard opens a sheet: title `Discard Push A?`, copy
`7 logged sets are deleted. Cycle position stays.` (singular `1 logged set
is deleted.`, and `Nothing was logged.` at zero). Buttons: `Keep` (amber,
60 px) and `Discard` (ghost, flag text, 52 px). Discard deletes the workout,
its sets and the running rest in one transaction and closes any rest
notification. The sheet closes on backdrop or Escape without discarding.

The Resume card's set count and the workout header use one pure function,
`activeSummary(day, workout, loggedSets, exercisesById, now)` in
`workoutProgress.js`, which resolves each slot's exercise from
`workout.chosen` (see 3.4) and runs `buildPlan`. It returns `{ done, total,
nextSet, elapsedText, restText }`. Both screens therefore always agree.

### 3.4 Workout state that must survive

Three pieces of screen state move into the workout record, written on
each change:

| Field | Shape | Meaning |
|---|---|---|
| `workout.skipped` | `{ [exerciseId]: number[] }` | set numbers skipped |
| `workout.extra` | `{ [exerciseId]: number }` | sets added by "Add set" |
| `workout.chosen` | `{ [slotIndex]: exerciseId }` | alternative picked for a slot |

`chosen` is the gap-fill: today the choice is recomputed from logged sets
and history, so a chosen alternative with no set logged yet is lost on
reload. The workout screen keeps its current default rule (logged today,
else most recent history, else first option) but writes the resolved
exercise id into `workout.chosen` for every slot the first time it mounts
for that workout, and again whenever the user taps an alternative. From
then on `chosen` is the single source. Home resolves a slot missing from
`chosen` (a workout started but never opened) as the logged exercise,
else the first option.

The Dexie schema stays at version 1; no index is added. Workouts without
these fields read as empty objects. `buildPlan` keeps taking `Set`s for
skipped; a helper `skippedSets(workout)` converts the stored arrays.

Backups: `serializeBackup` already writes whole workout records, so the
fields ride along. `parseBackup` keeps unknown fields and does not require
them, so older backups import unchanged.

### 3.5 Rest end on any screen

Home's Settings link is live while a workout runs, so three screens can be
showing when a rest ends: Workout, Home, Settings. The firing logic moves
out of `RestDock` into a hook `useRestWatcher(rest, { notify, nextSet })`
that returns `flash`, mounted once in `App.jsx` whenever a workout is
active. It fires once when the countdown crosses zero, sends the system
notification when permitted, runs `signalRestOver()`, and holds `flash`
for `FLASH_MS`. A rest that was already over at mount does not fire.
`App` computes `notify` (setting plus permission) and `nextSet` (from
`activeSummary`) and passes `flash` to the Workout screen (for the dock's
amber flash) and to Home (the Resume card's primary button and caption
turn amber for the same period). Settings shows nothing; the buzz and
notification still happen.

`RestDock` loses its own firing effect and takes `flash` as a prop.

The wake lock moves from the workout screen to `App.jsx`: held while a
workout is active and "Keep screen on" is on, whichever screen shows. The
rest dock is not shown on Home; the Resume caption carries the countdown.

The update banner on Home is hidden while a workout is active (the Android
install spec's "never mid-workout" rule now has to be enforced on Home).

The "Buzz when a rest ends?" permission sheet stays on the workout screen
only. Settings' backup export and import already refuse while a workout
is active; nothing else in Settings is gated.

Bottom sheets (Finish?, Remove set?, Buzz?, Discard?) do not push history.
A back gesture with a sheet open leaves the screen and drops the sheet.
Every sheet only confirms a destructive action, so the dropped sheet is
the safe outcome. Accepted.

## 4. Data changes

- `startWorkout(programDayId)` writes `skipped: {}`, `extra: {}`,
  `chosen: {}` on new workouts.
- New `updateWorkoutState(id, patch)` merges any of the three fields.
- New `discardWorkout(id)`: one transaction over `workouts`, `sets`,
  `settings` that deletes the workout, its sets and `activeRest`.
- `getHomeView()` returns `{ nextDay, days: [{ day, stripSlugs,
  firstExercise, firstSession, lastWorkout }], exercisesById }`.
- New `getActiveView()` returns `{ workout, day, loggedSets, exercisesById }`
  for the running workout or `null`. `App` and Home both read it; it needs
  no previous-session history because `chosen` is resolved.

## 5. Visual notes

Tokens only. The pager pages are full-width (`w-full shrink-0 snap-start`),
the container `flex overflow-x-auto snap-x snap-mandatory` with the
scrollbar hidden. The poster typography is unchanged. The Resume card's
flash uses `bg-act text-on-act` like the dock. Reduced motion: scroll-snap
is not an animation; nothing to guard.

## 6. Tests

- `nav.test.js`: `enterWorkout` pushes, `leaveWorkout` goes back when
  pushed and replaces otherwise, `replaceHash` fires `hashchange`.
- `router.test.jsx`: the table in 3.2, with `useLiveQuery` mocked.
- `home-pager.test.jsx`: one page per day, Start label follows the page,
  no "Start a different day"; Resume card and Discard sheet copy with an
  active workout; no Start button while active; update banner hidden.
- `workouts-db.test.js`: `startWorkout` writes the three fields;
  `updateWorkoutState` merges; `discardWorkout` deletes workout, sets and
  rest in one go.
- `workoutProgress.test.js`: `skippedSets`, `elapsedMinutes`.
- `useRestWatcher.test.jsx`: fires once at zero, not when already over at
  mount, `flash` clears after `FLASH_MS`. `RestDock` tests change to pass
  `flash` as a prop.
- `workoutProgress.test.js`: `activeSummary` agrees with `buildPlan`
  counts and resolves `chosen`; Workout writes resolved defaults into
  `chosen` on mount (source-level or db-level test).
- `home-view.test.js`: per-day last completed and first-exercise session;
  `active` present with a running workout.
- `backup.test.js`: a workout with `skipped`/`extra`/`chosen` round-trips;
  an old backup without them imports.

## 7. Out of scope, noted for later

- Rest-end buzz while the screen is off or the app is closed (needs a push
  server; Phase 3).
- The round 1 deferred minors (editor resets typed next-set values; editor
  opened from the card jumps on dock Skip).
