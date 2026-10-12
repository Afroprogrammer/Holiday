import { describe, expect, it } from 'vitest'
import {
  activePosition,
  buildPlan,
  formatElapsed,
  lastTimeText,
  remainingSentence,
  shortName,
} from '../lib/workoutProgress.js'

const bench = { id: 'barbell-bench-press', name: 'Barbell bench press', displayUnit: 'kg' }
const dips = { id: 'dips', name: 'Dips, bodyweight or assisted', displayUnit: 'kg' }
const crunch = { id: 'weighted-cable-crunch', name: 'Weighted cable crunch', displayUnit: 'kg' }
const slot4 = { targetSets: 4, repMin: 5, repMax: 8 }
const slot3 = { targetSets: 3, repMin: 8, repMax: 12 }
const prev = [
  { setNumber: 1, weight: 60, unit: 'kg', reps: 8 },
  { setNumber: 2, weight: 60, unit: 'kg', reps: 7 },
]
const entries = [
  { exercise: bench, slot: slot4, previousSets: prev },
  { exercise: dips, slot: slot3, previousSets: [] },
  { exercise: crunch, slot: slot3, previousSets: [] },
]
const logged = (exerciseId, setNumber, reps = 8, weight = 60) => ({ id: `${exerciseId}-${setNumber}`, exerciseId, setNumber, weight, unit: 'kg', reps })

describe('buildPlan', () => {
  it('opens the first set of the first exercise on a fresh workout', () => {
    const plan = buildPlan(entries, [], {}, {})
    expect(plan.done).toBe(0)
    expect(plan.total).toBe(10)
    expect(plan.exercises[0].rows.map((r) => r.status)).toEqual(['open', 'pending', 'pending', 'pending'])
    expect(plan.exercises[1].rows.map((r) => r.status)).toEqual(['pending', 'pending', 'pending'])
    expect(activePosition(plan)).toEqual({ exerciseIndex: 0, setNumber: 1 })
  })

  it('prefills each row from the previous session', () => {
    const plan = buildPlan(entries, [], {}, {})
    expect(plan.exercises[0].rows[0].prefill).toEqual({ weight: 60, unit: 'kg', reps: 8 })
    expect(plan.exercises[0].rows[3].prefill).toEqual({ weight: 60, unit: 'kg', reps: 7 })
    expect(plan.exercises[1].rows[0].prefill).toBeNull()
  })

  it('marks logged sets, flags reps outside the range, and moves the open set on', () => {
    const plan = buildPlan(entries, [logged(bench.id, 1, 8), logged(bench.id, 2, 9)], {}, {})
    const rows = plan.exercises[0].rows
    expect(rows[0]).toMatchObject({ status: 'logged', marker: null })
    expect(rows[1]).toMatchObject({ status: 'logged', marker: { kind: 'above', bound: 8 } })
    expect(rows[2].status).toBe('open')
    expect(plan.done).toBe(2)
    expect(activePosition(plan)).toEqual({ exerciseIndex: 0, setNumber: 3 })
  })

  it('counts skipped sets out of the total and extra sets into it', () => {
    const plan = buildPlan(entries, [], { dips: new Set([3]) }, { 'barbell-bench-press': 1 })
    expect(plan.total).toBe(10)
    expect(plan.exercises[0].total).toBe(5)
    expect(plan.exercises[0].rows).toHaveLength(5)
    expect(plan.exercises[1].rows[2].status).toBe('skipped')
    expect(plan.exercises[1].remaining).toBe(2)
  })

  it('moves to the next exercise once one is finished', () => {
    const sets = [1, 2, 3, 4].map((n) => logged(bench.id, n))
    const plan = buildPlan(entries, sets, {}, {})
    expect(plan.exercises[0].remaining).toBe(0)
    expect(activePosition(plan)).toEqual({ exerciseIndex: 1, setNumber: 1 })
  })

  it('honours a focused exercise that still has sets', () => {
    const plan = buildPlan(entries, [], {}, {}, 'weighted-cable-crunch')
    expect(activePosition(plan)).toEqual({ exerciseIndex: 2, setNumber: 1 })
    expect(plan.exercises[0].rows[0].status).toBe('pending')
  })

  it('ignores a focused exercise with nothing left', () => {
    const sets = [1, 2, 3, 4].map((n) => logged(bench.id, n))
    const plan = buildPlan(entries, sets, {}, {}, 'barbell-bench-press')
    expect(activePosition(plan)).toEqual({ exerciseIndex: 1, setNumber: 1 })
  })

  it('has no open set when everything is logged or skipped', () => {
    const sets = [
      ...[1, 2, 3, 4].map((n) => logged(bench.id, n)),
      ...[1, 2].map((n) => logged(dips.id, n)),
      ...[1, 2, 3].map((n) => logged(crunch.id, n)),
    ]
    const plan = buildPlan(entries, sets, { dips: new Set([3]) }, {})
    expect(activePosition(plan)).toBeNull()
    expect(plan.done).toBe(9)
    expect(plan.total).toBe(9)
    expect(remainingSentence(plan)).toBe('')
  })
})

describe('remainingSentence', () => {
  it('names the count and the sets per exercise', () => {
    const sets = [...[1, 2, 3, 4].map((n) => logged(bench.id, n)), logged(dips.id, 1)]
    const plan = buildPlan(entries, sets, {}, {})
    expect(remainingSentence(plan)).toBe('5 sets not logged: dips 2 and 3, weighted cable crunch 1 to 3. They stay unlogged.')
  })

  it('uses the singular for one set', () => {
    const sets = [...[1, 2, 3, 4].map((n) => logged(bench.id, n)), ...[1, 2, 3].map((n) => logged(dips.id, n)), logged(crunch.id, 1), logged(crunch.id, 2)]
    const plan = buildPlan(entries, sets, {}, {})
    expect(remainingSentence(plan)).toBe('1 set not logged: weighted cable crunch 3. It stays unlogged.')
  })

  it('lists non-consecutive sets individually', () => {
    const sets = [...[1, 2, 3, 4].map((n) => logged(bench.id, n)), ...[1, 2, 3].map((n) => logged(dips.id, n)), logged(crunch.id, 2)]
    const plan = buildPlan(entries, sets, {}, {})
    expect(remainingSentence(plan)).toBe('2 sets not logged: weighted cable crunch 1 and 3. They stay unlogged.')
  })
})

describe('lastTimeText', () => {
  it('shows a dash with no history', () => {
    expect(lastTimeText(null, 'kg')).toBe('–')
  })
  it('shows the stored value in its own unit', () => {
    expect(lastTimeText({ weight: 60, unit: 'kg', reps: 7 }, 'kg')).toBe('60 kg × 7')
  })
  it('converts and marks when the display unit changed since', () => {
    expect(lastTimeText({ weight: 90, unit: 'lb', reps: 8 }, 'kg')).toBe('90 lb (40.8 kg) × 8')
  })
})

describe('formatElapsed', () => {
  it('pads minutes and seconds', () => {
    const start = new Date(1_000_000).toISOString()
    expect(formatElapsed(start, 1_000_000 + 14_000)).toBe('00:14')
    expect(formatElapsed(start, 1_000_000 + 72 * 60_000 + 5_000)).toBe('72:05')
  })
})

describe('shortName', () => {
  it('drops the qualifier after a comma', () => {
    expect(shortName('Dips, bodyweight or assisted')).toBe('Dips')
    expect(shortName('Barbell bench press')).toBe('Barbell bench press')
  })
})
