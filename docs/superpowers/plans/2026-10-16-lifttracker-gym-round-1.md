# LiftTracker gym round 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the set handoff visible (done card during rest, slide-in transition), reps whole numbers, logged sets editable and removable, and short exercise names on the workout hero. Round 1 of the spec only.

**Architecture:** Two new presentational components (`DoneCard`, `SetEditor`) and one pure helper (`restPhase`). `Workout.jsx` picks `DoneCard` vs `ActiveSet` from the rest phase and owns a single `editing` set id plus a short `leaving` flag for the exit animation. Two Dexie functions (`updateSet`, `deleteSet`). CSS keyframes in `index.css` with a reduced-motion guard. Schema unchanged.

**Tech Stack:** React 19, Vite 8, Tailwind 4, Dexie 4, Vitest 5 with jsdom, @testing-library/react, fake-indexeddb. All commands from `lifttracker/`.

**Spec:** `docs/superpowers/specs/2026-10-16-lifttracker-gym-round-1-design.md` (sections 2, 4, 5 round 1, 7 round 1)

## Global Constraints

- Branch `feature/gym-round-1`; never commit to `main`.
- Run every command from `/Users/administrator/Documents/liftApp/Holiday/lifttracker`.
- Dexie schema stays at `db.version(1)`. Only `updateSet` and `deleteSet` write to existing set records.
- Tokens only in JSX. Tap targets at least 44 px. Component tests start with `// @vitest-environment jsdom` and call `afterEach(cleanup)`.
- `npm test` and `npm run lint` pass before each commit. Commit messages plain English, imperative, one line.
- Round 2 (Home pager, `#workout` route, Resume) is out of scope here.

## Review Focus

1. Done tapped twice fast during the first render after rest end: the second tap must not log a duplicate. Tested in Task 6 (`ActiveSet` disables Done while `onDone` is pending).
2. Removing the set that started the running rest: the rest is cleared and the steppers come back. Tested in Task 6 (`removeSet` flow test with fake-indexeddb at the db layer, and a Workout source assertion that `saveActiveRest(null)` runs when `rest.setId === id`).
3. Reopening the app mid-rest shows the done card, not the steppers, and overtime shows the steppers. Tested in Task 3 (`restPhase`).
4. Editing a set to the other unit (logged in kg, exercise now lb): the editor shows the stored unit and saves in it; nothing converts. Tested in Task 4.
5. Rest end while an editor is open: the transition must not unmount the editor mid-edit. Tested in Task 6 (editor open → phase change → editor still mounted).

---

### Task 1: Stepper integer and one-dot rules

**Files:**
- Modify: `src/components/Stepper.jsx`
- Test: `src/test/controls.test.jsx` (append)

**Interfaces:**
- `Stepper` gains `integer` (boolean, default false). With `integer`, input keeps digits only and `inputMode` is forced to `numeric`. Without it, at most one dot is kept.
- Produces `sanitize(value, integer)` exported from `src/lib/numberInput.js` for reuse by `SetEditor`.

- [ ] **Step 1: Write the failing tests**

Append to `src/test/controls.test.jsx`:

```jsx
describe('Stepper number rules', () => {
  it('keeps digits only when integer', () => {
    const onChange = vi.fn()
    render(<Stepper value="1" onChange={onChange} step={1} size="reps" label="Reps" inputMode="numeric" integer />)
    fireEvent.change(screen.getByLabelText('Reps'), { target: { value: '1.5' } })
    expect(onChange).toHaveBeenLastCalledWith('15')
    fireEvent.change(screen.getByLabelText('Reps'), { target: { value: '1,' } })
    expect(onChange).toHaveBeenLastCalledWith('1')
  })

  it('keeps at most one dot for decimals and steps from a trailing dot', () => {
    const onChange = vi.fn()
    render(<Stepper value="5." onChange={onChange} step={2.5} size="weight" label="Weight" inputMode="decimal" />)
    fireEvent.change(screen.getByLabelText('Weight'), { target: { value: '1..5' } })
    expect(onChange).toHaveBeenLastCalledWith('1.5')
    fireEvent.click(screen.getByLabelText('Weight plus'))
    expect(onChange).toHaveBeenLastCalledWith('7.5')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/test/controls.test.jsx`
Expected: 2 failures (`'1.5'` received instead of `'15'`; `'1..5'` kept).

- [ ] **Step 3: Write `src/lib/numberInput.js`**

```js
// Text-field sanitising for the steppers. Reps are whole numbers; weights
// keep one decimal point. Pure, so both Stepper and SetEditor share it.
export function sanitize(text, integer = false) {
  const digits = integer ? text.replace(/[^0-9]/g, '') : text.replace(/[^0-9.]/g, '')
  if (integer) return digits
  const first = digits.indexOf('.')
  if (first === -1) return digits
  return digits.slice(0, first + 1) + digits.slice(first + 1).replace(/\./g, '')
}

// Number for arithmetic: '' and '.' are 0, '5.' is 5.
export function toNumber(text) {
  const n = Number(text)
  return Number.isFinite(n) ? n : 0
}
```

- [ ] **Step 4: Update `Stepper.jsx`**

Change the signature to `Stepper({ value, onChange, step, size, unit, onFlipUnit, caption, label, inputMode, integer = false })`, import `sanitize, toNumber` from `../lib/numberInput.js`, and replace:

```jsx
  const num = value === '' ? 0 : Number(value)
  const bump = (delta) => onChange(String(Math.max(0, Math.round((num + delta) * 100) / 100)))
```

with:

```jsx
  const num = toNumber(value)
  const bump = (delta) => {
    const next = Math.max(0, Math.round((num + delta) * 100) / 100)
    onChange(String(integer ? Math.round(next) : next))
  }
```

and the input's `inputMode={inputMode}` with `inputMode={integer ? 'numeric' : inputMode}` and its `onChange` with `onChange={(e) => onChange(sanitize(e.target.value, integer))}`.

In `src/screens/Workout.jsx` add `integer` to the reps `Stepper` in `ActiveSet`.

- [ ] **Step 5: Run tests, lint, commit**

Run: `npm test && npm run lint`
Expected: all pass (146).

```bash
git add src/lib/numberInput.js src/components/Stepper.jsx src/screens/Workout.jsx src/test/controls.test.jsx
git commit -m "Keep reps whole and weights to one decimal point"
```

---

### Task 2: updateSet and deleteSet

**Files:**
- Modify: `src/db/workouts.js`
- Test: `src/test/sets-db.test.js`

**Interfaces:**
- `updateSet(id, { weight, unit, reps })` → Promise<void>; other fields untouched.
- `deleteSet(id)` → Promise<void>.
- `startRest` payload gains `setId` (Task 6 wires it) so Workout can tell which set started the running rest.

- [ ] **Step 1: Write the failing test**

Create `src/test/sets-db.test.js`:

```js
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { beforeEach, describe, expect, it } from 'vitest'
import { deleteSet, logSet, updateSet } from '../db/workouts.js'

// workouts.js binds to the app database; these tests use it directly and
// clear the sets table between runs.
import { db } from '../db/db.js'

describe('set corrections', () => {
  beforeEach(async () => {
    await db.sets.clear()
  })

  it('updates weight, unit and reps and keeps the rest of the record', async () => {
    const set = await logSet({ workoutId: 'w1', exerciseId: 'dips', setNumber: 1, weight: 0, unit: 'kg', reps: 10 })
    await updateSet(set.id, { weight: 5, unit: 'kg', reps: 9 })
    const stored = await db.sets.get(set.id)
    expect(stored).toMatchObject({ id: set.id, workoutId: 'w1', setNumber: 1, weight: 5, unit: 'kg', reps: 9, loggedAt: set.loggedAt })
  })

  it('deletes a set', async () => {
    const set = await logSet({ workoutId: 'w1', exerciseId: 'dips', setNumber: 2, weight: 0, unit: 'kg', reps: 10 })
    await deleteSet(set.id)
    expect(await db.sets.get(set.id)).toBeUndefined()
    expect(Dexie.exists).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/test/sets-db.test.js`
Expected: FAIL, `updateSet is not a function`.

- [ ] **Step 3: Add the functions**

Append to `src/db/workouts.js`:

```js
// Corrections to a logged set (gym round 1, 2.3). Only weight, unit and
// reps change; loggedAt and the set number stay.
export async function updateSet(id, { weight, unit, reps }) {
  await db.sets.update(id, { weight, unit, reps })
}

export async function deleteSet(id) {
  await db.sets.delete(id)
}
```

- [ ] **Step 4: Run tests, lint, commit**

Run: `npm test && npm run lint`
Expected: 148 passed.

```bash
git add src/db/workouts.js src/test/sets-db.test.js
git commit -m "Allow a logged set to be corrected or removed"
```

---

### Task 3: restPhase

**Files:**
- Modify: `src/lib/workoutProgress.js`
- Test: `src/test/workoutProgress.test.js` (append)

**Interfaces:**
- `restPhase(rest, nowMs)` → `'none'` (no rest), `'running'` (endsAt > now), `'over'` (endsAt <= now).

- [ ] **Step 1: Write the failing test**

Append to `src/test/workoutProgress.test.js` (add `restPhase` to the import):

```js
describe('restPhase', () => {
  const rest = { endsAt: 100_000 }
  it('is none without a rest, running before the end, over after', () => {
    expect(restPhase(null, 50_000)).toBe('none')
    expect(restPhase(rest, 99_999)).toBe('running')
    expect(restPhase(rest, 100_000)).toBe('over')
    expect(restPhase(rest, 150_000)).toBe('over')
  })
})
```

- [ ] **Step 2: Run, fail, implement, pass**

Run: `npm test -- src/test/workoutProgress.test.js` → FAIL `restPhase is not a function`.

Append to `src/lib/workoutProgress.js`:

```js
// Which state the active area is in (gym round 1, 2.1): the done card while
// a rest runs, the steppers otherwise. Overtime counts as over.
export function restPhase(rest, nowMs = Date.now()) {
  if (!rest) return 'none'
  return rest.endsAt > nowMs ? 'running' : 'over'
}
```

Run again → PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/workoutProgress.js src/test/workoutProgress.test.js
git commit -m "Add restPhase for the workout active area"
```

---

### Task 4: SetEditor

**Files:**
- Create: `src/components/SetEditor.jsx`
- Test: `src/test/seteditor.test.jsx`

**Interfaces:**
- `SetEditor({ set, exercise, targetText, onSave, onCancel, onRemove })`. `set` is the stored record; steppers prefilled from `set.weight`, `set.unit`, `set.reps`; unit label shows `set.unit` and is not flippable. `onSave({ weight, unit, reps })`, `onCancel()`, `onRemove()`.

- [ ] **Step 1: Write the failing test**

Create `src/test/seteditor.test.jsx`:

```jsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SetEditor from '../components/SetEditor.jsx'

afterEach(cleanup)

const exercise = { id: 'barbell-bench-press', name: 'Barbell bench press', displayUnit: 'lb', incrementKg: 2.5, incrementLb: 5 }
const set = { id: 's1', setNumber: 2, weight: 60, unit: 'kg', reps: 8 }

describe('SetEditor', () => {
  it('prefills the stored values in the stored unit and saves without converting', () => {
    const onSave = vi.fn()
    render(<SetEditor set={set} exercise={exercise} targetText="5–8" onSave={onSave} onCancel={() => {}} onRemove={() => {}} />)
    expect(screen.getByLabelText('Weight').value).toBe('60')
    expect(screen.getByText('kg')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /unit/i })).toBeNull()
    fireEvent.click(screen.getByLabelText('Weight plus'))
    fireEvent.click(screen.getByLabelText('Reps minus'))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalledWith({ weight: 62.5, unit: 'kg', reps: 7 })
  })

  it('cancels and removes', () => {
    const onCancel = vi.fn()
    const onRemove = vi.fn()
    render(<SetEditor set={set} exercise={exercise} targetText="5–8" onSave={() => {}} onCancel={onCancel} onRemove={onRemove} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove set' }))
    expect(onCancel).toHaveBeenCalled()
    expect(onRemove).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run to fail, then write the component**

Run: `npm test -- src/test/seteditor.test.jsx` → module not found.

Create `src/components/SetEditor.jsx`:

```jsx
import { useState } from 'react'
import Stepper from './Stepper.jsx'
import { toNumber } from '../lib/numberInput.js'
import { incrementFor } from '../lib/units.js'

// Inline editor for a logged set (gym round 1, 2.3). Values stay in the unit
// they were logged in; nothing converts.
export default function SetEditor({ set, exercise, targetText, onSave, onCancel, onRemove }) {
  const [weight, setWeight] = useState(String(set.weight))
  const [reps, setReps] = useState(String(set.reps))
  const ready = weight !== '' && reps !== ''
  return (
    <section className="mt-3 rounded-2xl border border-act/40 bg-raised p-3">
      <h3 className="font-num text-[22px] font-bold uppercase tracking-wide">Edit set {set.setNumber}</h3>
      <div className="mt-3">
        <Stepper value={weight} onChange={setWeight} step={incrementFor(exercise, set.unit)} size="weight" unit={set.unit} caption={`±${incrementFor(exercise, set.unit)}`} label="Weight" inputMode="decimal" />
      </div>
      <div className="mt-3">
        <Stepper value={reps} onChange={setReps} step={1} size="reps" caption={`reps · target ${targetText}`} label="Reps" inputMode="numeric" integer />
      </div>
      <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
        <button type="button" disabled={!ready} onClick={() => onSave({ weight: toNumber(weight), unit: set.unit, reps: Math.round(toNumber(reps)) })} className="h-12 rounded-xl bg-act font-semibold text-on-act disabled:opacity-45">
          Save
        </button>
        <button type="button" onClick={onCancel} className="h-12 rounded-xl border border-rule font-semibold text-ink-2">
          Cancel
        </button>
        <button type="button" onClick={onRemove} className="h-12 rounded-xl border border-rule px-3 font-semibold text-flag">
          Remove set
        </button>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Run tests, lint, commit**

Run: `npm test && npm run lint`
Expected: 151 passed.

```bash
git add src/components/SetEditor.jsx src/test/seteditor.test.jsx
git commit -m "Add the inline set editor"
```

---

### Task 5: DoneCard

**Files:**
- Create: `src/components/DoneCard.jsx`
- Test: `src/test/donecard.test.jsx`

**Interfaces:**
- `DoneCard({ set, marker, leaving, onEdit, onSkipRest })`. Renders heading `SET n LOGGED`, the values, optional flag, Edit and Skip rest. `leaving` adds the `set-out` animation class.

- [ ] **Step 1: Write the failing test**

Create `src/test/donecard.test.jsx`:

```jsx
// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DoneCard from '../components/DoneCard.jsx'

afterEach(cleanup)

describe('DoneCard', () => {
  it('shows the logged set with its flag and offers Edit and Skip rest', () => {
    const onEdit = vi.fn()
    const onSkipRest = vi.fn()
    const { container } = render(<DoneCard set={{ setNumber: 2, weight: 60, unit: 'kg', reps: 9 }} marker={{ kind: 'above', bound: 8 }} onEdit={onEdit} onSkipRest={onSkipRest} />)
    expect(screen.getByText('Set 2 logged')).toBeTruthy()
    expect(screen.getByText('60 kg × 9')).toBeTruthy()
    expect(screen.getByText('above range')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /done/i })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Skip rest' }))
    expect(onEdit).toHaveBeenCalled()
    expect(onSkipRest).toHaveBeenCalled()
    expect(container.firstChild.className).not.toContain('set-out')
  })

  it('takes the leaving animation class', () => {
    const { container } = render(<DoneCard set={{ setNumber: 1, weight: 0, unit: 'kg', reps: 10 }} marker={null} leaving onEdit={() => {}} onSkipRest={() => {}} />)
    expect(container.firstChild.className).toContain('set-out')
  })
})
```

- [ ] **Step 2: Run to fail, then write the component**

Create `src/components/DoneCard.jsx`:

```jsx
// Shown in the active area while a rest runs (gym round 1, 2.1): the set
// just logged, with no way to log another until the rest ends.
export default function DoneCard({ set, marker, leaving = false, onEdit, onSkipRest }) {
  return (
    <section className={`mt-5 ${leaving ? 'set-out' : ''}`}>
      <h3 className="font-num text-[22px] font-bold uppercase tracking-wide text-act">Set {set.setNumber} logged</h3>
      <div className="mt-2 flex items-baseline gap-3">
        <span className="font-num text-[44px] font-bold leading-none tracking-tight">
          {set.weight} {set.unit} × {set.reps}
        </span>
        {marker && <span className="text-xs font-semibold text-flag">{marker.kind} range</span>}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={onEdit} className="h-12 rounded-xl border border-rule font-semibold text-ink-2">
          Edit
        </button>
        <button type="button" onClick={onSkipRest} className="h-12 rounded-xl border border-act font-semibold text-act">
          Skip rest
        </button>
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Run tests, lint, commit**

Run: `npm test && npm run lint` → 153 passed.

```bash
git add src/components/DoneCard.jsx src/test/donecard.test.jsx
git commit -m "Add the done card for the rest state"
```

---

### Task 6: Workout integration, transitions, short names

**Files:**
- Modify: `src/screens/Workout.jsx`, `src/index.css`, `src/lib/timer.js` (`startRest` passes `setId` through)
- Test: `src/test/workout-screen.test.jsx` (append), `src/test/timer.test.js` (append), `src/test/hero-names.test.js`

**Interfaces:**
- `startRest({ exerciseId, exerciseName, restSeconds, setId }, now)` keeps `setId` on the rest.
- `ActiveSet` gains `entering` (boolean): adds `set-in` to the section and `heading-pulse` to the heading. Done disabled while its `onDone` promise is pending.
- Workout state: `editing` (set id or null), `leaving` (boolean), `removing` (set or null).

- [ ] **Step 1: Write the failing tests**

Append to `src/test/timer.test.js` inside `describe('rest timer')`:

```js
  it('keeps the set that started it', () => {
    const r = startRest({ exerciseId: 'deadlift', exerciseName: 'Deadlift', restSeconds: 120, setId: 's9' }, t0)
    expect(r.setId).toBe('s9')
  })
```

Append to `src/test/workout-screen.test.jsx`:

```jsx
describe('ActiveSet transitions and double taps', () => {
  it('animates in when entering and pulses the heading', () => {
    const { container } = render(<ActiveSet exercise={exercise} row={row} total={4} targetText="5–8" entering onDone={() => {}} onFlipUnit={() => {}} />)
    expect(container.firstChild.className).toContain('set-in')
    expect(container.querySelector('h3').className).toContain('heading-pulse')
  })

  it('disables Done while a log is pending', async () => {
    let resolve
    const onDone = vi.fn(() => new Promise((r) => { resolve = r }))
    render(<ActiveSet exercise={exercise} row={row} total={4} targetText="5–8" onDone={onDone} onFlipUnit={() => {}} />)
    const done = screen.getByRole('button', { name: /done/i })
    fireEvent.click(done)
    fireEvent.click(done)
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(done.disabled).toBe(true)
    await act(async () => resolve())
  })
})
```

(add `act` to the testing-library import.)

Create `src/test/hero-names.test.js`:

```js
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// The workout hero shows the short exercise name (gym round 1, 2.4); the
// done card during a rest and the editor replace the steppers; removing the
// set that started the rest clears the rest.
const src = readFileSync(new URL('../screens/Workout.jsx', import.meta.url), 'utf8')

describe('workout screen wiring', () => {
  it('uses the short name on the hero', () => {
    expect(src).toMatch(/<h2[^>]*>\{shortName\(active\.exercise\.name\)\}<\/h2>/)
  })
  it('passes the set id into the rest and clears the rest when that set is removed', () => {
    expect(src).toMatch(/startRest\(\{[^}]*setId: logged\.id/)
    expect(src).toMatch(/rest\?\.setId === removing\.id/)
  })
  it('shows the done card while the rest runs', () => {
    expect(src).toMatch(/phase === 'running'[\s\S]*<DoneCard/)
  })
})
```

- [ ] **Step 2: Run to fail**

Run: `npm test -- src/test/timer.test.js src/test/workout-screen.test.jsx src/test/hero-names.test.js`
Expected: FAIL on `setId`, `set-in`, disabled Done, and all three source assertions.

- [ ] **Step 3: `startRest` keeps `setId`**

In `src/lib/timer.js` change `startRest` to:

```js
export function startRest({ exerciseId, exerciseName, restSeconds, setId = null }, now = Date.now()) {
  return {
    exerciseId,
    exerciseName,
    setId,
    durationSeconds: restSeconds,
    startedAt: now,
    endsAt: now + restSeconds * 1000,
  }
}
```

- [ ] **Step 4: CSS**

Append to `src/index.css`:

```css
/* Set handoff (gym round 1, 2.1): the done card leaves upward, the next set
   arrives from below, and its heading takes one amber pulse. */
.set-out { animation: set-out 180ms ease-in forwards; }
.set-in { animation: set-in 220ms cubic-bezier(0.2, 0.8, 0.2, 1); }
.heading-pulse { animation: heading-pulse 600ms ease-out; border-radius: 6px; }
@keyframes set-out { to { opacity: 0; transform: translateY(-12px); } }
@keyframes set-in { from { opacity: 0; transform: translateY(16px); } }
@keyframes heading-pulse { 0% { background: color-mix(in srgb, var(--color-act) 35%, transparent); } 100% { background: transparent; } }
@media (prefers-reduced-motion: reduce) {
  .set-out, .set-in { animation: none; }
  .set-out { opacity: 0; }
}
```

- [ ] **Step 5: Workout.jsx changes**

Imports to add:

```jsx
import DoneCard from '../components/DoneCard.jsx'
import SetEditor from '../components/SetEditor.jsx'
import { deleteSet, updateSet } from '../db/workouts.js'  // merge into the existing workouts import
import { restPhase } from '../lib/workoutProgress.js'      // merge into the existing import
```

`ActiveSet`: signature `({ exercise, row, total, targetText, entering = false, onDone, onFlipUnit })`; add `const [pending, setPending] = useState(false)`; section `className={entering ? 'set-in' : ''}`; heading `className={\`font-num text-[22px] font-bold uppercase tracking-wide ${entering ? 'heading-pulse' : ''}\`}`; Done `disabled={!ready || pending}` and `onClick={async () => { setPending(true); try { await onDone(row.n, { weight: toNumber(weight), unit, reps: Math.round(toNumber(reps)) }) } finally { setPending(false) } }}` (import `toNumber`). Reps stepper gets `integer`.

`SetRows`: gains props `editingId`, `onEdit(set)`, `editor` (a render function). A logged row becomes a `<button>` filling the row (`onClick={() => onEdit(r.set)}`); when `r.set.id === editingId` the `<li>` renders `editor(r.set)` instead of the row.

`Workout` body, after `const sentence = ...`:

```jsx
  const phase = restPhase(rest, now)
  const [editing, setEditing] = useState(null)     // move these three useState calls up with the others
  const [removing, setRemoving] = useState(null)
  const [leaving, setLeaving] = useState(false)
  const [entering, setEntering] = useState(false)
```

(Hooks must sit above the early return; place the `useState` calls with the other state, and this effect too:)

```jsx
  // When the rest ends or is skipped, let the done card leave, then bring
  // the next set in.
  const prevPhase = useRef(phase)
  useEffect(() => {
    if (prevPhase.current === 'running' && phase !== 'running') {
      setLeaving(true)
      const id = setTimeout(() => {
        setLeaving(false)
        setEntering(true)
      }, 180)
      return () => clearTimeout(id)
    }
    if (phase === 'running') setEntering(false)
    prevPhase.current = phase
    return undefined
  }, [phase])
```

Keep `prevPhase.current = phase` updated in both branches (assign at the end of the effect body before returning). `entering` is cleared by `ActiveSet`'s key change on the next Done (no extra code: the key includes the set number).

The just-logged set for the card: `const restSet = rest ? loggedSets.find((s) => s.id === rest.setId) ?? null : null` and `const restMarker = restSet ? rangeMarker(restSet.reps, active.slot.repMin, active.slot.repMax) : null` (import `rangeMarker` from `../lib/prefill.js`). Only show the card when `restSet.exerciseId === active.exercise.id`.

`done` logs then starts the rest with the id:

```jsx
    const logged = await logSet({ workoutId: workout.id, exerciseId: active.exercise.id, setNumber, ...values })
    await saveActiveRest(startRest({ exerciseId: active.exercise.id, exerciseName: shortName(active.exercise.name), restSeconds: active.exercise.restSeconds, setId: logged.id }))
```

Handlers:

```jsx
  const skipRest = () => {
    saveActiveRest(null)
    getRegistration().then(closeRestNotifications)
  }
  const saveEdit = async (set, values) => {
    await updateSet(set.id, values)
    setEditing(null)
  }
  const confirmRemove = async () => {
    const target = removing
    setRemoving(null)
    setEditing(null)
    if (rest?.setId === removing.id) await saveActiveRest(null)
    await deleteSet(target.id)
  }
```

Active area JSX replaces the `activeRow ? <ActiveSet/> : <p>All sets</p>` block:

```jsx
      {editing && restSet && editing === restSet.id ? (
        <SetEditor set={restSet} exercise={active.exercise} targetText={repsText(active.slot).replace(' reps', '')} onSave={(v) => saveEdit(restSet, v)} onCancel={() => setEditing(null)} onRemove={() => setRemoving(restSet)} />
      ) : (phase === 'running' || leaving) && restSet && restSet.exerciseId === active.exercise.id ? (
        <DoneCard set={restSet} marker={restMarker} leaving={leaving} onEdit={() => setEditing(restSet.id)} onSkipRest={skipRest} />
      ) : activeRow && !editing ? (
        <ActiveSet key={...same key...} ... entering={entering} ... />
      ) : activeRow ? null : (
        <p className="mt-6 font-num text-[22px] font-bold uppercase tracking-wide text-act">All {plan.total} sets logged</p>
      )}
```

`SetRows` call gains `editingId={editing}`, `onEdit={(set) => setEditing(set.id)}`, and `editor={(set) => <SetEditor set={set} exercise={active.exercise} targetText={...} onSave={(v) => saveEdit(set, v)} onCancel={() => setEditing(null)} onRemove={() => setRemoving(set)} />}`. The rest set's row is not shown as editable in the list while the card is up (it is edited from the card).

Hero: `<h2 ...>{shortName(active.exercise.name)}</h2>`.

Dock `onSkip={skipRest}`.

Remove sheet, after the finish sheet:

```jsx
      <BottomSheet open={removing !== null} title={`Remove set ${removing?.setNumber}?`} onClose={() => setRemoving(null)}>
        <p className="mt-1 mb-3.5 text-[15px] text-ink-2">
          {removing?.weight} {removing?.unit} × {removing?.reps} is deleted. Later sets keep their numbers.
        </p>
        <button type="button" onClick={() => setRemoving(null)} className="mb-2.5 h-[60px] w-full rounded-2xl bg-act text-lg font-semibold text-on-act">
          Keep
        </button>
        <button type="button" onClick={confirmRemove} className="h-[52px] w-full rounded-2xl border border-rule font-semibold text-flag">
          Remove
        </button>
      </BottomSheet>
```

- [ ] **Step 6: Run tests, lint, look**

Run: `npm test && npm run lint`
Expected: all pass (158).

Dev server at 375 px: log a set → done card, no Done button; Skip rest → card leaves, steppers slide in, heading pulses; wait a rest to zero → same; tap `S1` row → editor; Save changes the row; Remove asks, then the row goes pending and the count drops; type `1.5` in reps → `15` (dot dropped); hero shows "Row machine" on Pull A.

- [ ] **Step 7: Commit**

```bash
git add src/screens/Workout.jsx src/index.css src/lib/timer.js src/test/workout-screen.test.jsx src/test/timer.test.js src/test/hero-names.test.js
git commit -m "Show a done card during rest and let logged sets be edited"
```

---

### Task 7: Docs and verification

**Files:**
- Modify: `lifttracker/prd.md` (decisions log), `PRODUCT.md` (workout screen bullet)

- [ ] **Step 1: Full check**

Run: `npm test && npm run lint && npm run build`. Then the seven round-1 done criteria from the spec in the dev server, dark and light.

- [ ] **Step 2: Docs**

`lifttracker/prd.md` decisions log, append:

```markdown
| October 16, 2026 | Gym round 1: during a rest the active area shows the logged set, not the next steppers; logged sets can be edited or removed; reps are whole numbers; the workout hero uses short names. See `docs/superpowers/specs/2026-10-16-lifttracker-gym-round-1-design.md`. |
```

`PRODUCT.md`, in the "Active workout screen" bullet, replace "Done per set, add an extra set, skip a set," with "Done per set, a done card during the rest, edit or remove a logged set, add an extra set, skip a set,".

- [ ] **Step 3: Commit**

```bash
git add prd.md ../PRODUCT.md
git commit -m "Record the gym round 1 decisions"
```
