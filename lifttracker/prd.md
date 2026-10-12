# LiftTracker product requirements

**Status:** Phase 1 built. Waiting for Franklin's check on a real Android phone against the done criteria.
**Owner:** Franklin
**Last updated:** October 11, 2026

LiftTracker is a personal workout logger built around one fixed 4-day push/pull
program. You open it in the gym, see today's workout with last session's weight
and reps already filled in, log each set with your thumb, and decide for
yourself whether to add weight. It works without a network connection.

This document covers the full product vision briefly and Phase 1 in detail.

## Goals

- Log a set in at most two taps when last session's values are correct.
- Show, for every set, what you lifted last time so you can decide whether to
  go up.
- Work fully offline. Gym signal is unreliable.
- Keep the program fixed. Sets and rep ranges come from the template, not from
  the app's judgment.
- Handle equipment marked in kilograms and equipment marked in pounds in the
  same workout without conversion errors.

## Non-goals

- The app never suggests a weight or applies an automatic increment.
- No accounts, no social features, no multi-user support.
- No AI features.
- No general exercise library or program builder in Phase 1.

## The program

The program is seeded on first launch. Day order cycles Push A, Pull A,
Push B, Pull B, based on the last completed day, not the calendar.

Rep ranges are targets shown on screen. You log the reps you actually get,
which can be above or below the range.

### Day 1: Push A

| Order | Exercise | Sets | Reps | Unit | Rest |
|---|---|---|---|---|---|
| 1 | Barbell bench press | 4 | 5 to 8 | kg | 90 s |
| 2 | Machine chest press | 3 | 8 to 10 | kg* | 60 s |
| 3 | Dumbbell shoulder press | 3 | 8 to 10 | lb | 90 s |
| 4 | Dips, bodyweight or assisted | 3 | 8 to 12 | kg, added or assisted | 90 s |
| 5 | Weighted cable crunch | 3 | 10 to 12 | kg* | 60 s |

### Day 2: Pull A

| Order | Exercise | Sets | Reps | Unit | Rest |
|---|---|---|---|---|---|
| 1 | Assisted pull-ups | 4 | 6 to 8 | kg, assistance | 90 s |
| 2 | Row machine, seated cable or chest-supported | 3 | 8 to 10 | kg* | 60 s |
| 3 | Barbell or dumbbell shrugs | 4 | 10 to 12 | kg or lb | 60 s |
| 4 | Bicep curls, barbell or dumbbell | 3 | 8 to 10 | kg or lb | 60 s |
| 5 | Hanging knee raises or cable woodchoppers | 3 | 10 to 12 | kg, added | 60 s |

### Day 3: Push B

| Order | Exercise | Sets | Reps | Unit | Rest |
|---|---|---|---|---|---|
| 1 | Incline dumbbell press | 4 | 6 to 8 | lb | 90 s |
| 2 | Machine chest press | 3 | 8 to 10 | kg* | 60 s |
| 3 | Barbell overhead press | 3 | 6 to 8 | kg | 90 s |
| 4 | Tricep pushdowns, cable | 3 | 10 to 12 | kg* | 60 s |
| 5 | Weighted decline sit-ups | 3 | 10 to 12 | kg, added | 60 s |

### Day 4: Pull B

| Order | Exercise | Sets | Reps | Unit | Rest |
|---|---|---|---|---|---|
| 1 | Deadlift, conventional or Romanian | 3 | 5 | kg | 120 s |
| 2 | Lat pulldown | 4 | 8 to 10 | kg* | 60 s |
| 3 | Barbell bent-over row | 3 | 6 to 8 | kg | 90 s |
| 4 | Heavy dumbbell shrugs | 3 | 10 to 12 | lb | 60 s |
| 5 | Machine ab crunch | 3 | 12 | kg* | 60 s |

Notes on the tables:

- `kg*` means the exercise defaults to kilograms but the gym may mark that
  machine in pounds. You flip it once by tapping the unit label, and the app
  remembers.
- Weighted planks were removed from Pull B at Franklin's request so that every
  core exercise carries a weight that can progress. Machine ab crunch was the
  alternative already named in the original program.
- Two slots in the original program name alternatives: shrugs and curls
  (barbell or dumbbell), and Pull A core (hanging knee raises or cable
  woodchoppers). Each alternative is seeded as its own exercise with its own
  history. The slot shows both and you pick which one you're doing today. The
  app prefills from whichever you did last.
- Rest times in the tables are starting defaults. Every exercise's rest time
  is configurable. See [Rest timer](#rest-timer).

## Phases

| Phase | Deliverable | Status |
|---|---|---|
| 1 | Offline-first PWA: today's workout, prefilled sets, logging, rest timer, local storage | This document |
| 2 | History view, progress charts, export, swap exercise for today, exercise editor | Later |
| 3 | FastAPI and SQLite backend behind Docker Compose for sync and multi-device use | Later |

## Phase 1 requirements

### User flow

1. Open the app. The home screen shows the next day in the cycle, for example
   "Next: Push A", and the date of the last completed workout.
2. Tap **Start**. The workout screen lists the day's five exercises in order,
   each with its set count and target rep range.
3. For each set, the weight and reps fields start at the values from your last
   session of that exercise. Adjust with the plus and minus buttons or type a
   value, then tap **Done**.
4. The rest timer starts. It counts down on screen and vibrates when it ends,
   if the device supports it.
5. After the last set, tap **Finish**. The app records the end time, saves the
   workout, and advances the cycle.

You can leave the app mid-workout. The active workout is saved as you go and
resumes when you return.

### Home screen

- Shows the next day name and a **Start** button.
- Shows the last completed workout's day name and date.
- Shows a small override to start a different day if you want to break the
  cycle. Starting a day out of order doesn't change the stored cycle position
  until that workout is finished.
- Has a **Settings** link.

### Workout screen

- One card per exercise, in program order.
- The card header shows the exercise name, target sets and reps, and the
  exercise's display unit.
- For slots with alternatives, the header has a two-way toggle for which
  exercise you're doing today.
- Each set row shows:
  - The set number.
  - Last time's weight and reps for this set number, for example
    `last: 60 kg × 6`. If there's no history, a dash.
  - A weight field with plus and minus buttons that step in the exercise's
    native increment.
  - A reps field with plus and minus buttons that step by one.
  - A **Done** button.
- A completed set row collapses to a single line and shows a marker when the
  logged reps are above the top of the target range or below the bottom.
- An extra set can be added to any exercise, and an unfinished set can be
  skipped.
- A **Finish** button at the bottom. If sets remain, it asks for confirmation.

### Set logging

Each logged set records:

| Field | Meaning |
|---|---|
| exercise | Which exercise, including which alternative in a slot |
| set number | 1-based position within the exercise |
| weight | The number as entered |
| unit | `kg` or `lb`, the unit the weight was entered in |
| reps | Reps completed. For time-based exercises, seconds |
| logged at | Timestamp |

Rules:

- The weight is stored exactly as entered, with its unit. The app never stores
  a converted value. This keeps history exact when a machine is marked in
  pounds.
- Zero weight is valid and means bodyweight only, for dips and knee raises.
- For assisted exercises, the weight is the assistance. The exercise carries a
  "lower is better" flag so later phases chart it correctly.

### Prefill

For each set number of an exercise, the prefill is the weight and reps from the
most recent finished workout that contains that exercise and set number. If
the previous session had fewer sets, the missing set numbers prefill from the
last set that exists. If there's no history, the fields start empty and the
"last" column shows a dash.

The prefill shows the previous value in the unit it was entered in. If you've
since flipped the exercise's display unit, the previous value is shown
converted and marked, for example `last: 90 lb (40.8 kg)`.

### Units

- Every exercise has a display unit, `kg` or `lb`, set in the seed data and
  changeable in the exercise's settings or by tapping the unit label on the
  workout screen. The change is remembered.
- The weight field shows the display unit as primary and the other unit small
  beside it, for example `90 lb (40.8 kg)`.
- Increments by unit: 2.5 kg on kilogram equipment, 5 lb on pound equipment.
  Both are editable per exercise in settings.
- Conversion uses 1 lb = 0.45359237 kg and rounds to one decimal place for
  display only.

### Rest timer

- Every exercise has its own rest duration. Seed values are in the program
  tables and are starting points only. No exercise has a fixed rest time.
- You can change the duration in three places:
  - Per exercise, in that exercise's settings. Saved permanently. This covers
    all 20 exercises and both alternatives in each alternative slot.
  - During a workout, on the running timer, with plus and minus 15 second
    buttons and a **Skip** button. This affects the current rest only.
  - Globally, in settings, for the two defaults used by new exercises: one for
    compound lifts and one for isolation and core work.
- The timer starts automatically when a set is marked done.
- The timer keeps counting if the screen locks or the app is backgrounded, by
  storing the end timestamp rather than a running counter.
- At zero, the device vibrates if it can, and the timer shows elapsed overtime
  so you know how long past the rest you are.

### Settings

- Default rest durations for compound and isolation work.
- Per-exercise overrides: display unit, increment, rest duration.
- A **Reset cycle** action that sets the next day explicitly.

### Offline and installability

- All reads and writes go to local storage on the device. There are no network
  calls in Phase 1.
- The app is a Progressive Web App with a manifest and a service worker that
  caches the app shell, so it opens with no connection.
- On iOS, the app must be added to the home screen to be exempt from Safari's
  seven-day storage eviction. The first-run screen says so.

## Data model

Four collections in IndexedDB. LocalStorage is not used for workout data
because of its size cap and synchronous API.

| Collection | Fields | Notes |
|---|---|---|
| `exercises` | id, name, category, displayUnit, incrementKg, incrementLb, restSeconds, lowerIsBetter, isTimeBased | Seeded. Settings fields are editable. |
| `programDays` | id, name, order, slots[] | Each slot has exerciseIds[] (one, or two for alternatives), targetSets, repMin, repMax. Read-only in Phase 1. |
| `workouts` | id, programDayId, startedAt, finishedAt | `finishedAt` is null while active. At most one active workout. |
| `sets` | id, workoutId, exerciseId, setNumber, weight, unit, reps, loggedAt | Append-only. |
| `settings` | key, value | Default rest durations, cycle position, first-run flags. |

This shape maps directly onto the SQLite tables in the original specification
(`exercises`, `workouts`, `workout_sets`) plus the program tables that
specification lacked, so Phase 3 can sync without remodeling.

## Technical approach

| Concern | Choice | Reason |
|---|---|---|
| Frontend | React with Vite | Matches the `wanderai-react` project in this repository |
| Styling | Tailwind CSS | As in the original specification |
| Storage | IndexedDB through Dexie | Readable queries, handles growth |
| PWA | Vite PWA plugin | Manifest and service worker with little configuration |
| Tests | Vitest | Unit tests for cycle advance, prefill lookup, and unit conversion |
| Hosting | Static files | Any static host, including GitHub Pages |

No backend, no Docker, no environment variables in Phase 1.

## Done criteria

Phase 1 is complete when all of these are true on a real phone:

- You can complete a full Push A session in airplane mode, close the app,
  reopen it, and the session is still there with every set.
- The next Push A session shows last week's weight and reps on every set.
- Finishing Push A makes the home screen show Pull A.
- A set with correct prefilled values takes two taps: **Done** and nothing
  else, since the timer starts on its own.
- Flipping a machine from kg to lb persists across app restarts, and the
  previous session's value shows converted.
- A rest timer survives the screen locking and reports overtime correctly.
- The app installs to an Android or iOS home screen and launches full screen.
- Unit tests cover cycle advance, prefill with missing set numbers, and
  kg to lb rounding.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| iOS evicts site storage after seven days of non-use | First-run prompt to add to home screen. Export arrives in Phase 2. |
| Vibration isn't available on iOS web apps | Timer also flashes the screen and plays a short tone if audio is allowed. |
| A machine is replaced or you change gyms | Display unit is flippable per exercise at any time. History stays exact. |
| Data lives on one device only | Accepted for Phase 1. Phase 3 adds sync. |

## Decisions log

| Date | Decision |
|---|---|
| October 11, 2026 | Build option 1, a program-first logger, rather than the generic tracker in the original specification. |
| October 11, 2026 | Primary unit is kilograms. Dumbbells at Franklin's gym are marked in pounds. The assisted pull-up stack shows both. |
| October 11, 2026 | Progression is manual. The app shows last time's numbers and never suggests a weight. |
| October 11, 2026 | Reps are logged per set and may be above or below the target range. |
| October 11, 2026 | Rest timers are user-adjustable per exercise, during a workout, and globally. |
| October 11, 2026 | Weighted planks removed from Pull B. Machine ab crunch takes the slot. |
| October 11, 2026 | Swap exercise for today is deferred to Phase 2. |
| October 11, 2026 | Plan lives in `lifttracker/` in the Holiday repository. |
| October 11, 2026 | Deadlift rest default is 120 seconds. |
| October 11, 2026 | The app name stays LiftTracker. |
| October 11, 2026 | Rest time is configurable for every exercise, not only a global default. |
| October 11, 2026 | Visual direction, from the accepted wireframe: dark base with one cyan action color, a light theme that follows the device setting, Barlow for text and Barlow Condensed for numerals. |
| October 11, 2026 | The rest timer sits at the bottom of the workout screen so the open set stays visible above it. |
| October 12, 2026 | The first iteration targets Android phones. The iOS add-to-home-screen notice is deferred until iOS is in scope. |
| October 12, 2026 | The app is published to GitHub Pages from `main` by a GitHub Actions workflow. |
| October 12, 2026 | "Night shift" visual redesign accepted: navy and amber, Oswald and Source Sans 3 self-hosted, animated motion-ghost exercise illustrations (Workout Guide, CC BY-SA 4.0). Phase 1 behaviour unchanged. See `docs/superpowers/specs/2026-10-12-lifttracker-visual-redesign-design.md`. |
| October 12, 2026 | Exercise settings gained a read-only list of the last five sessions. |
| October 12, 2026 | With no previous session, set rows prefill from the latest set logged for that exercise today, so a first workout still needs only Done per set. |
| October 12, 2026 | Android install work accepted: wake lock, background rest notification, in-app install, update banner on Home only, JSON backup. No iOS work. See `docs/superpowers/specs/2026-10-12-lifttracker-android-install-design.md`. |

## Open items

None. All Phase 1 decisions are recorded in the decisions log.
