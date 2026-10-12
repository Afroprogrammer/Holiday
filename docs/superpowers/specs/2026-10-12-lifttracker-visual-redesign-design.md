# LiftTracker visual redesign: Night shift

**Status:** Approved in conversation on October 12, 2026. Awaiting written review.
**Owner:** Franklin
**Scope:** `lifttracker/` only. Phase 1 behaviour is unchanged.

Wireframes that this spec describes:

- Chosen world, every screen: https://claude.ai/artifact/LeoFDz8Uff2qn7S6mKMPUs
- Screen layout alternatives (A/B): https://claude.ai/artifact/R3qdPiTspkjKP4LiKbBZsV
- Visual world alternatives: https://claude.ai/artifact/Ag9wsXw8gJrZMWr7x9EMrB

Local copies live in `wireframes/` next to the repository (not committed).

## 1. Job and audience

Franklin, in the gym, phone in one hand, between sets. The screen must answer
three things at a glance: what set is next, what he lifted last time, and how
long until the next set. Visitor mode is Operate: scanability and thumb reach
outrank expression. The identity lives in type, one accent colour, and the
exercise illustrations.

## 2. Visual world

Decided October 12, 2026 after comparing four worlds and five illustration
treatments.

**Palette.** Dark-first. Deep navy ground, cool white ink, one amber accent for
action and "now", coral only for the out-of-range flag. Light theme keeps the
same roles with a cool off-white ground and a darker amber so contrast holds.

| Token | Dark | Light | Role |
|---|---|---|---|
| canvas | `#0a1020` | `#f2f4fa` | page ground |
| card | `#101a30` | `#ffffff` | docked timer, stepper fields |
| raised | `#15213a` | `#e6eaf4` | segmented control track, pressed states |
| rule | `#1f2b48` | `#d3d9e8` | hairlines |
| ink | `#eaf0ff` | `#121a2c` | primary text |
| ink-2 | `#9aa8c8` | `#4f5c7a` | secondary text |
| ink-3 | `#5a6a90` | `#8591ad` | tertiary text, idle illustrations |
| act | `#ffb000` | `#a86a00` | primary action, current set, cycle position |
| on-act | `#231800` | `#ffffff` | text on act |
| flag | `#ff6f61` | `#c23b2e` | reps outside target range |

Tokens stay in `src/index.css` under Tailwind's `@theme`, renamed where the
role changed (`act` stays; `up`/`down` collapse into `flag`). Components refer
to tokens only. No literal colours in JSX.

**Type.** Oswald 500/600/700 for display and numerals, Source Sans 3 400/600
for text. Both self-hosted as woff2 in `public/fonts/` with `@font-face` and
`font-display: swap`, so the app renders correctly offline and on first
install. Google Fonts is not used at runtime. Fallback stacks: `Oswald, "Arial
Narrow", sans-serif` and `"Source Sans 3", system-ui, sans-serif`.

Type scale (px, mobile):

| Role | Face | Size / weight | Where |
|---|---|---|---|
| day name | Oswald | 92 / 700 uppercase | Home |
| exercise title | Oswald | 40 / 700 uppercase | Workout hero, Exercise settings |
| screen title | Oswald | 40 / 700 uppercase | Settings |
| active weight | Oswald | 56 / 700 | Workout stepper |
| active reps | Oswald | 44 / 700 | Workout stepper |
| countdown | Oswald | 72 / 700 | Rest dock, resting |
| countdown, idle | Oswald | 44 / 700 | Rest dock, idle |
| set label | Oswald | 22 / 700 uppercase | "SET 3 OF 4" |
| list numerals | Oswald | 17 to 24 / 600 | done sets, settings values |
| body | Source Sans 3 | 15 to 16 / 400 | everything else |
| caption | Source Sans 3 | 13 / 500 | targets, hints |
| label | Source Sans 3 | 12 / 600, 0.08em tracking, uppercase | group headings |

Numerals everywhere use `font-variant-numeric: tabular-nums`.

**Illustrations.** Line-art exercise figures from
[bryllim/workout-guide](https://github.com/bryllim/workout-guide), three frames
per exercise (start, middle, end), 512×512 SVG, single white fill. Shown as a
CSS mask over `currentColor`, so they take any token colour. Rendered as a
"motion ghost": three stacked layers, current pose at full opacity, previous
pose at 14%, the one before at 8%.

Animation, where enabled: the layers cycle 1 → 2 → 3 → 2 → 1 over 2.6 s with
`cubic-bezier(.65,0,.35,1)` so poses linger and transitions are quick. An amber
radial glow behind the figure pulses in time. The current pose in the rest dock
has an amber drop shadow. Pure CSS keyframes, no JavaScript per frame.
`prefers-reduced-motion: reduce` disables the keyframes and shows the static
ghost.

Animated: workout hero figure, rest dock figure while resting. Static:
everything else (home strip, up-next queue, settings rows, exercise settings
hero).

Asset mapping, exercise id to Workout Guide slug:

| Exercise id | Slug |
|---|---|
| barbell-bench-press | bench-press |
| machine-chest-press | machine-chest-press |
| dumbbell-shoulder-press | seated-dumbbell-press |
| dips | dip |
| weighted-cable-crunch | cable-crunch |
| assisted-pull-ups | assisted-pull-up |
| row-machine | seated-row |
| barbell-shrugs | shrug |
| dumbbell-shrugs | dumbbell-shrug |
| barbell-curls | bicep-curl |
| dumbbell-curls | bicep-curl |
| hanging-knee-raises | hanging-knee-raise |
| cable-woodchoppers | cable-woodchop |
| incline-dumbbell-press | incline-dumbbell-press |
| barbell-overhead-press | overhead-press |
| tricep-pushdowns | tricep-pushdown |
| weighted-decline-sit-ups | decline-sit-up |
| deadlift | deadlift |
| lat-pulldown | lat-pulldown |
| barbell-bent-over-row | barbell-row |
| heavy-dumbbell-shrugs | dumbbell-shrug |
| machine-ab-crunch | weighted-crunch |

Files are copied, not fetched at runtime: `public/illustrations/<slug>/1.svg`,
`2.svg`, `3.svg`. Only the 20 slugs above are shipped (about 1 MB raw, served
compressed and precached by the service worker). The mapping lives in
`src/db/program.js` as an `illustration` field on each seeded exercise.

Licence: the artwork is CC BY-SA 4.0 (Everkinetic, expanded by Bryl Lim).
Attribution appears in Settings under "About" and in
`lifttracker/ATTRIBUTION.md`. Font licences (OFL) are noted in the same file.

## 3. Screens

All screens are 375 px wide first. Nothing scrolls horizontally. Every tap
target is at least 44×44 px. Contrast of text on its surface is at least 4.5:1,
large display text at least 3:1.

### Home ("Poster")

Top bar: wordmark left in Oswald, Settings link right in amber.

Body: "Up next · day N of 4" caption, then the day name at 92 px with the
letter (A or B) in amber. Below it a cycle bar of four 4 px segments; the
current day's segment is amber, completed days in the current cycle are dim
amber, the rest are rule-coloured. Then a strip of today's exercises as
illustrations (static ghost, ink-2), one per slot, equal width. For slots with
two alternatives the strip shows the alternative that was done most recently,
or the first.

Below the strip, two lines separated by a hairline: "Last completed" with day
name and date, and "<first exercise> last time" with that exercise's set
weights and reps from its last finished session, formatted `60 kg × 8 · 8 · 7 ·
6`. If there is no history both lines show a dash.

Pinned to the bottom: "Start <day>" (60 px, amber) and "Start a different day"
(52 px, ghost). The bottom group fades the content behind it with a gradient
to canvas.

### Pick a day (bottom sheet)

Opens from "Start a different day". Scrim over the home screen, sheet with a
grab handle, title "Start a different day", one line of copy: "Cycle position
moves only when you finish the workout." Four rows, each with the day name in
Oswald 24 and a caption listing its exercises in short form. The day that is
up next carries an "up next" tag in amber. Tapping a row starts that day and
closes the sheet. Tapping the scrim or swiping down closes the sheet.

### Workout ("Current set hero")

Header: day name and elapsed time left, `<done> / <total> sets` right in
Oswald, the done count in ink and the rest in ink-2. Total counts target sets
plus added sets minus skipped sets.

Hero: "Exercise N of 5" caption in amber, exercise name at 40 px, targets line
"4 sets · 5–8 reps · rest 90 s", illustration (animated ghost, 96 px) on the
right. For slots with alternatives, a two-option segmented control sits under
the targets line.

Active set block: "SET N OF M" left, "last 60 kg × 7" right (dash when no
history, converted and marked when the unit was flipped since). Weight
stepper: 92 px tall, minus and plus columns 64 px wide, the value at 56 px with
the unit in amber beside it, and under it the converted value and the step
size (`132 lb · ±2.5`). Reps stepper: 76 px tall, same layout, value at 44 px,
caption `reps · target 5–8`. Both values are editable by tapping the number
(numeric keyboard). Done button: 64 px, amber, label "Done · start rest". After
Done the active block becomes the next set and the previous one collapses.

Done sets list: one 44 px row per logged set, `S1` in amber, then
`60 kg × 8` in Oswald 17. A row logged outside the target range shows "above
range" or "below range" in flag colour on the right. Rows for remaining sets
show `last 60 kg × 6` in ink-2 with a "Skip" action; a final row offers "Add
set". Skipped sets show "skipped" and can be un-skipped by tapping.

Up next: label, then one 56 px row per remaining exercise with its illustration
(static ghost, ink-3, 40 px), name, and `3 × 8–10`. Tapping a row jumps to that
exercise without logging anything; the hero updates and the previous exercise
moves into the queue if it still has sets. The last block is a 52 px ghost
"Finish workout" button.

Rest dock, pinned to the bottom above the safe area. Idle: a single 60 px row
with a dash in Oswald 44 and the text "Rest timer idle / starts when you tap
Done". Resting: a 13 px meta line "Rest · <exercise>" and "of 1:30", the
countdown at 72 px, a 4 px progress bar that drains left to right, the next
set's exercise illustration (animated ghost with glow, 64 px, amber) on the
right of the countdown, and three 48 px buttons: −15 s, +15 s, Skip. Skip is
outlined in amber. At zero the dock flashes amber once, vibrates and tones as
today, then shows overtime as `+0:07` in flag colour with the bar full.

The page's bottom padding equals the dock's height so the Finish button is
never hidden under it.

### Finish with sets remaining (bottom sheet)

Replaces `window.confirm`. Title "Finish <day>?", copy that names the count
and which sets ("5 sets not logged: dips 2 and 3, cable crunch 1 to 3. They
stay unlogged."), then "Keep going" (amber, primary) and "Finish anyway"
(ghost). With no sets remaining, Finish completes immediately without a sheet.

### Settings

Back link "‹ Home" top left. Title "Settings" at 40 px.

Group "Default rest": two rows, "Compound lifts" with caption "bench, press,
deadlift, rows, pull-ups" and "Isolation and core" with caption "curls, shrugs,
pushdowns, crunches". Each has a 44 px numeric field showing the seconds in
Oswald 24 and a unit suffix.

Group "Exercises": one 56 px row per exercise, alphabetical: illustration
(static ghost, ink-3, 36 px), name, then on the right the unit in Oswald 18 on
one line and `2.5 · 90 s` under it in ink-2, then a chevron. Tapping opens
Exercise settings.

Group "Program": "Cycle position" row with caption "next: Push A · day 1 of 4"
and a chevron that opens the pick-a-day sheet in a mode that only sets the
position; then "Reset cycle to Push A" in flag colour, which asks for
confirmation in a bottom sheet.

Group "About": one caption-sized row: "Exercise illustrations: Workout Guide
and Everkinetic, CC BY-SA 4.0. Fonts: Oswald and Source Sans 3, SIL Open Font
License."

### Exercise settings

Back link "‹ Settings". Hero as on the workout screen with a static ghost
illustration: caption "<Day> · exercise N" (or "Push A and Push B" for the
shared machine chest press), name at 40 px, targets line.

Group "Units": "Display unit" row with caption "equipment is marked in" and a
two-way segmented control kg / lb; "Step on kg equipment" and "Step on lb
equipment" rows with numeric fields.

Group "Rest": "Rest after a set" with caption "default for compound lifts is
90 s" and a numeric field.

Group "History": the last five finished sessions that contain this exercise,
newest first, each a row with the date on the left and the sets on the right
as `60 kg × 8 · 8 · 7 · 6` in Oswald 17. Weights are shown in the unit they
were logged in. With no history the group shows one row: "No sessions yet".

## 4. States and ranges

- No history anywhere: Home shows dashes; the strip still shows illustrations;
  workout prefill is empty and "last" shows a dash.
- A slot with two alternatives: hero segmented control; strip and queue show the
  alternative chosen by the existing rule (logged today, else most recent, else
  first).
- Extra sets: "SET 5 OF 5" and the total in the header grow by one.
- Skipped set: counted out of the header total; row shows "skipped".
- Resumed workout after leaving the app: the active set is the first unlogged,
  unskipped set of the first exercise with any remaining; the rest dock restores
  from the saved rest.
- Rest overtime: negative countdown shown as `+m:ss` in flag colour.
- Light theme: same layout, light tokens; illustrations use ink-2 and ink-3 as
  in dark.
- Very long exercise names ("Row machine, seated cable or chest-supported")
  wrap to two lines at 40 px; the hero's illustration stays bottom-aligned.

## 5. Architecture

No data model changes. Dexie schema version stays at 1. One seeded field is
added to each exercise object in `program.js` (`illustration`); existing
installs receive it through the existing seed-on-launch path, which must be
extended to backfill the field when it is missing.

New or changed modules:

- `src/index.css`: new tokens, `@font-face`, ghost and animation keyframes,
  reduced-motion guard.
- `public/fonts/`: `oswald-500.woff2`, `oswald-600.woff2`,
  `oswald-700.woff2`, `source-sans-3-400.woff2`, `source-sans-3-600.woff2`.
- `public/illustrations/<slug>/{1,2,3}.svg`.
- `src/components/Illustration.jsx`: props `slug`, `size`, `tone`
  (`ink-2` | `ink-3` | `act`), `live` (boolean), `glow` (boolean). Renders the
  three masked layers. One component, used by every screen.
- `src/components/Stepper.jsx`: the large weight and reps steppers. Props
  `value`, `onChange`, `step`, `min`, `label`, `caption`, `unit`, `size`
  (`weight` | `reps`). Replaces the stepper markup inside `SetRow.jsx`.
- `src/components/BottomSheet.jsx`: scrim, sheet, grab handle, close on scrim
  tap and Escape. Used by pick-a-day, finish confirmation, reset confirmation.
- `src/components/RestDock.jsx`: replaces `RestTimer.jsx`. Idle and resting
  states, progress bar, overtime, illustration. Keeps `signalRestOver`.
- `src/components/CycleBar.jsx`: the four-segment bar.
- `src/screens/Home.jsx`, `Workout.jsx`, `Settings.jsx`,
  `ExerciseSettings.jsx`: rebuilt to the layouts above.
- `src/components/ExerciseCard.jsx` and `SetRow.jsx`: removed; their logic
  moves into `Workout.jsx` plus the new components.
- `src/lib/workoutProgress.js`: pure functions for the header count, the
  active set, remaining sets per exercise, and the finish-sheet sentence. Unit
  tested.
- `src/lib/history.js`: pure function that groups sets into sessions for the
  exercise settings history list. Unit tested.
- `src/db/workouts.js`: one new query, `getExerciseHistory(exerciseId,
  limit)`.

Testing: existing 25 tests stay green. New Vitest tests for
`workoutProgress.js`, `history.js`, and the illustration mapping (every seeded
exercise maps to a slug whose three files exist on disk). Visual check: the
app runs in the browser at 375 px in dark and light, every screen screenshotted
once, then the Impeccable detector runs once over the changed files.

Performance: no runtime font or image fetches. Animation uses opacity only on
three layers, plus one radial-gradient pseudo-element, which stays on the
compositor.

## 6. Anti-goals

- No progression suggestions, charts, or history beyond the five-session list.
- No change to how weights are stored or converted.
- No new routes beyond the sheets, which are overlays, not pages.
- No emoji, no icon fonts. The only icons are the chevron, the back caret, the
  minus and plus signs, drawn as inline SVG or typeset glyphs in Oswald.
- No gradient text, no glassmorphism, no progress rings.
