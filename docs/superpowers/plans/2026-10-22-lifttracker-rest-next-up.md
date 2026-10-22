# LiftTracker rest next-up Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** During a rest, show the logged set as one line and a next-up card for the next set or exercise; keep the hero on the rested exercise; add a Settings row that tries the phone's Clock timer.

**Architecture:** One pure helper `restPreview(plan, restExerciseId)` decides what the card shows. Two presentational components, `LoggedLine` and `NextUpCard`, wrapped by `RestBlock`, replace `DoneCard`. `Workout.jsx` picks the hero entry from the rest set while the rest block shows. `phoneTimerUrl` builds the intent URL for a Settings link.

**Tech Stack:** React 19, Vite 8, Tailwind 4, Dexie 4, Vitest 5 + jsdom, @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-10-22-lifttracker-rest-next-up-design.md`

## Global Constraints

- Branch `feature/rest-next-up`; commands from `lifttracker/`.
- Tokens only; tap targets ≥ 44 px; component tests use the jsdom docblock and `afterEach(cleanup)`.
- `npm test` and `npm run lint` pass before each commit.
- Copy fixed by the spec: `Next · after this rest`, `Exercise 2 of 5`, `Last time`, `Set up`, `Then: <name> · 3 × 8–10`, `Then: last exercise`, `All sets logged`, `Finish when you are ready.`, `Start <short name> now`, `Start set 3 now`, `logged`, `Edit`, `Try phone timer`.
- No Done button while a rest runs.

## Review Focus

1. Rest for the last set of an exercise: hero stays on that exercise until the rest ends, then the next exercise slides in. Tested in Task 3.
2. Rest for a set whose exercise the user then switches away from (alternative toggle): the card must still name the rested set; `restPreview` must not crash when the rested exercise is not in the plan. Tested in Task 1.
3. Last set of the workout: card says `All sets logged`, no start button. Tested in Tasks 1 and 2.
4. Overtime (rest over, row still exists): rest block gone, steppers back, hero on the next exercise. Covered by the existing handoff; Task 3 asserts hero choice is tied to the card, not to `rest`.
5. Display unit differs from the prefill's stored unit: `Set up` converts. Tested in Task 1.

---

### Task 1: `restPreview` and `phoneTimerUrl`

**Files:** Modify `src/lib/workoutProgress.js` (also add `previousSets` to each `buildPlan` exercise); create `src/lib/phoneTimer.js`; tests appended to `src/test/workoutProgress.test.js`, new `src/test/phoneTimer.test.js`.

**Interfaces:**
- `restPreview(plan, restExerciseId)` → `{ kind: 'none' }` or `{ kind: 'same' | 'other', entry, row, index, count, setupText, lastText, then }` where `index` is the 1-based exercise number, `count` = `plan.exercises.length`, `setupText` = `"50 kg"` from `row.prefill` converted to `entry.exercise.displayUnit` or `null`, `lastText` = for `other` `formatSession(previousSets sorted)` (`'–'` when none), for `same` `lastTimeText(row.last, unit)`; `then` (only for `same`) = `{ name: shortName, text: '3 × 8–10' }` of the first other exercise in plan order with `remaining > 0`, or `null`.
- `phoneTimerUrl(seconds, message)` → the spec 3.3 URL with `message` URI-encoded.

- [ ] Write failing tests: other-exercise preview (name, index 2 of 3, lastText from previous sets, setupText converted kg→lb); same-exercise preview with `then`; same with `then === null`; `none` when all logged; rested exercise not in the plan → still returns the open row as `other`. `phoneTimerUrl(10, 'LiftTracker test')` equals the spec string.
- [ ] Run, see them fail. Implement. Run, pass. Commit `Add the rest preview helper and the phone timer URL`.

### Task 2: `LoggedLine`, `NextUpCard`, `RestBlock`

**Files:** Create `src/components/RestBlock.jsx` (exports `LoggedLine`, `NextUpCard`, default `RestBlock`); delete `src/components/DoneCard.jsx` and `src/test/donecard.test.jsx`; new `src/test/restblock.test.jsx`.

**Interfaces:**
- `LoggedLine({ set, marker, exerciseName, onEdit })`: 48 px row; `S{n}`, `{weight} {unit} × {reps}`, `{kind} range` flag, `logged` (or `{exerciseName} · logged` when given), Edit button.
- `NextUpCard({ preview, onStart })`: variants per spec 3.2; figure via `Illustration` (`size={72} tone="act" live glow`) for `other`; start button label per spec.
- `RestBlock({ set, marker, exerciseName, preview, leaving, onEdit, onStart })`: `<section className={leaving ? 'set-out' : ''}>` with `LoggedLine` then `NextUpCard`.

- [ ] Failing tests: line shows `S2`, `60 kg × 9`, `above range`, Edit fires; card `other` shows `Next · after this rest`, `Exercise 2 of 5`, name, `3 sets · 8–10 reps · rest 90 s`, `Last time`, `Set up`, button `Start Machine chest press now` fires `onStart`; `same` shows `Set 3 of 4`, `Then: Machine chest press · 3 × 8–10`, button `Start set 3 now`; `same` with no then shows `Then: last exercise`; `none` shows `All sets logged` and no button; no Done button anywhere; `leaving` adds `set-out`.
- [ ] Implement, pass, commit `Replace the done card with a logged line and a next-up card`.

### Task 3: Workout wiring

**Files:** Modify `src/screens/Workout.jsx`; extend `src/test/hero-names.test.js` (source-level).

- `heroEntry = cardSet && cardEntry ? cardEntry : active`; hero section, alternatives toggle, illustration and `SetRows plan=` use `heroEntry`. The hero `<section>` gets `set-in` when `entering`.
- `RestBlock` replaces `DoneCard` with `preview={restPreview(plan, cardSet.exerciseId)}`, `exerciseName` only when the card exercise differs from `heroEntry` (it never does now, so pass `null`), `onStart={skipRest}`.
- Source tests: `RestBlock` used, `DoneCard` gone, `restPreview(plan, cardSet.exerciseId)`, hero uses `heroEntry`.
- [ ] Failing tests, implement, full suite + lint, commit `Keep the hero on the rested exercise and show what comes next`.

### Task 4: Settings row, decisions log

**Files:** Modify `src/screens/Settings.jsx`, `src/test/test-buzz-row.test.js`, `prd.md`.

- Row: `<a href={phoneTimerUrl(10, 'LiftTracker test')}>` styled as a `SettingRow`-like 56 px row, label `Try phone timer`, caption per spec.
- prd decisions log row for October 22, 2026.
- [ ] Failing source test (`label` text and `phoneTimerUrl(10`), implement, commit `Add a Settings row that tries the phone timer`.
