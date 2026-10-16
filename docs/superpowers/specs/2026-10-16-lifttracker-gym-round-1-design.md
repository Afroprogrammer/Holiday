# LiftTracker gym feedback, round 1

**Status:** Approved in conversation on October 16, 2026 after the first gym
sessions. Round 1 ships first; round 2 follows.
**Owner:** Franklin
**Scope:** `lifttracker/` only. Phase 1 behaviour and data model unchanged
except where section 4 says so.

## 1. What the gym showed

Four things on the workout screen, two on navigation:

1. After Done, the next set appears instantly with the same numbers in the
   same boxes. Nothing marks the change. Franklin could not tell whether the
   set had been logged, and a second Done tap during the rest would log a set
   he had not done.
2. The reps field accepted `1.5`.
3. A logged set cannot be corrected. A typo stays.
4. Long exercise names ("Row machine, seated cable or chest-supported") wrap
   to three lines on the hero.
5. Home shows only the day up next. Seeing another day means the "Start a
   different day" sheet.
6. There is no way back to Home mid-workout. Finish is the only exit.

Items 1 to 4 are round 1. Items 5 and 6 are round 2.

## 2. Round 1: the workout screen

### 2.1 Rest state replaces the steppers

Decided option A on October 16, 2026.

While a rest is running (the dock shows a countdown), the active area shows
a **done card** instead of the steppers:

- Heading `SET 2 LOGGED` in Oswald 22, amber.
- The logged values at 44 px: `60 kg × 8`, with a range flag beside them if
  outside the target.
- Two actions in one row: **Edit** (ghost, opens the set editor, section
  2.3) and **Skip rest** (ghost, same as the dock's Skip).
- No Done button exists during a rest. Nothing on the screen can log a set
  until the rest ends or is skipped.

When the rest ends (countdown reaches zero) or Skip is tapped:

- The done card slides up and fades out (180 ms).
- The next set's steppers slide in from below and fade in (220 ms,
  ease-out). The `SET 3 OF 4` heading pulses amber once (background tint,
  600 ms).
- Done is enabled from the moment the steppers land.

With `prefers-reduced-motion: reduce` the swap is instant; the heading
still takes the amber tint for 600 ms.

Resuming the app mid-rest (reopened, or back from another app) shows the
done card for the running rest. Overtime (countdown below zero) counts as
"rest ended": the steppers are shown, in overtime colour on the dock as
today.

A rest that ends while the user is on a different exercise through the
"Up next" queue swaps that exercise's done card the same way; the rest
belongs to the exercise it was started on, and the done card is shown only
when that exercise is the active one.

### 2.2 Reps are whole numbers

The reps stepper strips everything but digits: no dot, no comma. `inputMode`
is `numeric`. The stepper's plus and minus never produce a decimal. A pasted
`1.5` becomes `15`? No: the field keeps only the characters typed in order
and drops the dot, so `1.5` becomes `15` only if typed as three keys; the
expected fix is that the dot key does nothing. `Stepper` gains a `integer`
prop; `ActiveSet` passes it for reps.

The weight stepper allows at most one dot and strips a second. A value of
`.` or `5.` is treated as empty or `5` for the Done check.

### 2.3 Edit or remove a logged set

Any logged set can be opened for editing:

- From the done card's **Edit** during a rest.
- From an `S1 60 kg × 8` row at any time: tapping the row opens it.

The set editor replaces the row (or the done card) in place: the same two
steppers prefilled with the stored values, in the stored unit, plus a row of
**Save** (amber), **Cancel** (ghost) and **Remove set** (ghost, flag text).

- Save writes `weight`, `unit`, `reps` on the existing set record
  (`updateSet(id, patch)`, `loggedAt` unchanged). The row collapses back,
  range flag recomputed.
- Cancel collapses without writing.
- Remove set deletes the record (`deleteSet(id)`) after a bottom sheet
  "Remove set 2? 60 kg × 8 is deleted." with "Keep" (amber) and "Remove"
  (ghost, flag). Later sets keep their numbers; the removed number becomes a
  pending row again. If the removed set was the one that started the running
  rest, the rest is cleared.

Only one editor is open at a time. Opening one while the steppers for the
next set are shown hides those steppers until the editor closes; nothing
else moves.

### 2.4 Short names on the hero

The workout hero, the "Up next" queue, the "Done" list, the rest dock and
notifications use `shortName(exercise.name)` (text before the first comma),
already defined in `src/lib/workoutProgress.js`. Settings and Exercise
settings keep the full name. The alternative segmented control already uses
short names.

## 3. Round 2: Home and navigation

### 3.1 Swipe between days on Home

Home becomes a horizontal pager with one page per program day, in cycle
order. It opens on the day up next. Swiping left or right moves one page;
the day name, illustration strip, "last completed" line (that day's most
recent finished workout), "<first exercise> last time" line and the Start
button all belong to the page. The cycle bar keeps its meaning (where the
cycle is) and does not move with the pager; the page's day name is the
indicator. Pages snap (`scroll-snap-type: x mandatory`), no custom gesture
code. The "Start a different day" button and sheet are removed from Home;
Settings "Cycle position" stays.

Starting a swiped day behaves as today: the cycle position moves only when
that workout is finished.

### 3.2 Leave a workout and come back

The workout screen gets a hash route, `#workout`. Starting or resuming a
workout navigates to it. The Android back gesture, the browser back button
and a new `‹ Home` link in the workout header all return to Home. Settings
opened from the workout returns to the workout.

Home with a workout in progress shows a **Resume card** in place of the
Start button: `Resume Push A` as the primary button, caption
`7 / 16 sets · 14 min · resting 0:42` (live). The day pager is still
swipeable but every page's Start button is replaced by the Resume card, with
a second ghost action **Discard workout** behind a sheet: "Discard Push A?
7 logged sets are deleted." Buttons "Keep" (amber) and "Discard" (ghost,
flag). Discard deletes the workout and its sets and clears the rest.

Skipped set numbers and added sets move from React state into the workout
record: `workout.skipped` (`{ [exerciseId]: number[] }`) and
`workout.extra` (`{ [exerciseId]: number }`), written on each change. The
Dexie schema stays at version 1 (no new index). Existing in-progress
workouts without these fields read as empty.

The rest dock is not shown on Home; the Resume card's caption carries the
countdown. The background notification still fires from the dock's effect
only while the workout screen is mounted, so a rest that ends while the
user is on Home signals through the Resume card turning amber for 2.5 s and
the in-app vibration; the system notification is also sent from Home when
permitted (same `showRestNotification` call, driven by a small
`useRestWatcher` hook that both screens use).

## 4. Data changes

- `sets`: `updateSet(id, { weight, unit, reps })` and `deleteSet(id)` in
  `src/db/workouts.js`. Append-only is dropped for the user's own
  corrections; nothing else writes to sets.
- `workouts`: optional `skipped` and `extra` fields (round 2). No schema
  version change.
- No change to `exercises`, `programDays`, `settings`.

## 5. Architecture

Round 1:

| Unit | Responsibility |
|---|---|
| `src/lib/workoutProgress.js` | `buildPlan` unchanged; new `restPhase(rest, now)` → `'none' \| 'running' \| 'over'`. |
| `src/components/DoneCard.jsx` | The rest-state card: logged values, Edit, Skip rest. |
| `src/components/SetEditor.jsx` | Steppers prefilled from a stored set; Save, Cancel, Remove. Used by DoneCard's Edit and by logged rows. |
| `src/components/Stepper.jsx` | `integer` prop; one-dot rule for decimals. |
| `src/screens/Workout.jsx` | Chooses DoneCard vs ActiveSet by `restPhase`; owns the single `editing` set id; runs the swap transition (CSS classes, `onAnimationEnd`). |
| `src/db/workouts.js` | `updateSet`, `deleteSet`. |
| `src/index.css` | Keyframes `set-out`, `set-in`, `heading-pulse`; reduced-motion guard. |

Round 2:

| Unit | Responsibility |
|---|---|
| `src/screens/Home.jsx` | Day pager, Resume card, Discard sheet. |
| `src/components/DayPage.jsx` | One pager page. |
| `src/App.jsx` | `#workout` route; active workout no longer forces the workout screen. |
| `src/lib/useRestWatcher.js` | Shared zero-crossing effect for both screens. |
| `src/db/workouts.js` | `discardWorkout(id)`, `setSkipped`, `setExtra`, `getHomeView` per-day data. |

Tests: `restPhase`, Stepper integer and one-dot rules, `updateSet` and
`deleteSet` round trips with fake-indexeddb, DoneCard and SetEditor render
tests, transition class sequencing with fake timers. Round 2 adds pager
page selection, Resume caption formatting, discard round trip, skipped and
extra persistence.

## 6. Anti-goals

- No per-set notes, RPE, or timers per set.
- No undo stack beyond Edit and Remove.
- No custom swipe gesture code; native scroll snap only.
- No change to the visual system beyond the new card, editor and
  animations.

## 7. Done criteria, on the phone

Round 1:

1. Tap Done: the done card appears with the logged numbers; no Done button
   anywhere during the rest.
2. Rest ends: card slides out, next set slides in, heading pulses amber.
3. Skip in the dock or on the card: same transition at once.
4. Type `1.5` in reps: the dot does nothing.
5. Tap `S1 60 kg × 8`, change to 62.5 × 7, Save: row updates; Exercise
   settings history shows the new numbers.
6. Remove a set: row returns to pending; header count drops by one.
7. "Row machine" on the hero, full name in Settings.

Round 2:

8. Swipe Home to Pull B and back; Start on a swiped page starts that day.
9. Mid-workout, Android back gesture returns to Home with a Resume card;
   Resume returns to the same set with skips intact.
10. Discard removes the workout; Home shows Start again.
