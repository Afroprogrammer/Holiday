import { describe, expect, it } from 'vitest'
import { startRest } from '../lib/timer.js'
import {
  activePosition,
  activeSummary,
  buildPlan,
  elapsedMinutes,
  formatElapsed,
  resolveChosen,
  restPreview,
  setsText,
  skippedSets,
  lastTimeText,
  remainingSentence,
  restPhase,
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

  it('falls back to the latest set logged in this workout when there is no history', () => {
    const plan = buildPlan(entries, [logged(dips.id, 1, 10, 0), logged(dips.id, 2, 9, 5)], {}, {})
    expect(plan.exercises[1].rows[2].prefill).toEqual({ weight: 5, unit: 'kg', reps: 9 })
    expect(plan.exercises[0].rows[0].prefill).toEqual({ weight: 60, unit: 'kg', reps: 8 })
  })

  it('keeps the "last" value to real history even when prefill falls back to today', () => {
    const plan = buildPlan(entries, [logged(dips.id, 1, 10, 0)], {}, {})
    expect(plan.exercises[1].rows[1].last).toBeNull()
    expect(plan.exercises[1].rows[1].prefill).toEqual({ weight: 0, unit: 'kg', reps: 10 })
    expect(plan.exercises[0].rows[0].last).toEqual({ weight: 60, unit: 'kg', reps: 8 })
  })

  it('keeps sets logged beyond the target after the app is reopened', () => {
    const sets = [1, 2, 3, 4, 5].map((n) => logged(bench.id, n))
    const plan = buildPlan(entries, sets, {}, {})
    expect(plan.exercises[0].total).toBe(5)
    expect(plan.exercises[0].rows).toHaveLength(5)
    expect(plan.done).toBe(5)
    expect(plan.total).toBe(11)
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

describe('restPhase', () => {
  const rest = { endsAt: 100_000 }
  it('is none without a rest, running before the end, over after', () => {
    expect(restPhase(null, 50_000)).toBe('none')
    expect(restPhase(rest, 99_999)).toBe('running')
    expect(restPhase(rest, 100_000)).toBe('over')
    expect(restPhase(rest, 150_000)).toBe('over')
  })
})

describe('round 2 helpers', () => {
  it('skippedSets converts arrays and tolerates undefined', () => {
    expect(skippedSets(undefined)).toEqual({})
    expect(skippedSets({ a: [1, 3] }).a.has(3)).toBe(true)
    expect(skippedSets({ a: [1, 3] }).a.has(2)).toBe(false)
  })

  it('resolveChosen prefers chosen, then logged, then first', () => {
    const day = { slots: [{ exerciseIds: ['x', 'y'] }, { exerciseIds: ['p', 'q'] }, { exerciseIds: ['m'] }] }
    const loggedQ = [{ exerciseId: 'q', setNumber: 1 }]
    expect(resolveChosen(day, { chosen: { 0: 'y' } }, loggedQ)).toEqual(['y', 'q', 'm'])
    expect(resolveChosen(day, { chosen: { 0: 'zzz' } }, [])).toEqual(['x', 'p', 'm'])
    expect(resolveChosen(day, {}, [])).toEqual(['x', 'p', 'm'])
  })

  it('elapsedMinutes', () => {
    const t0 = '2026-10-17T10:00:00.000Z'
    expect(elapsedMinutes(t0, Date.parse('2026-10-17T10:14:30Z'))).toBe('14 min')
    expect(elapsedMinutes(t0, Date.parse('2026-10-17T11:02:00Z'))).toBe('1 h 02 min')
    expect(elapsedMinutes(t0, Date.parse('2026-10-17T10:00:20Z'))).toBe('0 min')
  })

  it('activeSummary agrees with buildPlan and names the next set', () => {
    const day = { slots: [{ ...slot4, exerciseIds: [bench.id] }, { ...slot3, exerciseIds: [dips.id] }] }
    const exercisesById = new Map([[bench.id, bench], [dips.id, dips]])
    const now = Date.parse('2026-10-17T10:14:30Z')
    const workout = { startedAt: '2026-10-17T10:00:00.000Z', skipped: { [bench.id]: [3] }, extra: { [dips.id]: 1 }, chosen: {} }
    const args = { day, workout, loggedSets: [logged(bench.id, 1), logged(bench.id, 2)], exercisesById, rest: null, now }
    const summary = activeSummary(args)
    expect(summary.done).toBe(2)
    expect(summary.total).toBe(3 + 4)
    expect(summary.nextSet).toEqual({ exerciseName: 'Barbell bench press', setNumber: 4, total: 4 })
    expect(summary.elapsedText).toBe('14 min')
    expect(summary.restText).toBe('')
    const running = startRest({ exerciseId: bench.id, exerciseName: 'Bench', restSeconds: 90 }, now - 48_000)
    expect(activeSummary({ ...args, rest: running }).restText).toBe('resting 0:42')
    const over = startRest({ exerciseId: bench.id, exerciseName: 'Bench', restSeconds: 90 }, now - 102_000)
    expect(activeSummary({ ...args, rest: over }).restText).toBe('rest over +0:12')
  })

  it('activeSummary reads an old workout without the fields', () => {
    const day = { slots: [{ ...slot3, exerciseIds: [dips.id] }] }
    const summary = activeSummary({ day, workout: { startedAt: '2026-10-17T10:00:00.000Z' }, loggedSets: [], exercisesById: new Map([[dips.id, dips]]), rest: null, now: Date.parse('2026-10-17T10:00:00Z') })
    expect(summary.total).toBe(3)
    expect(summary.nextSet).toEqual({ exerciseName: 'Dips', setNumber: 1, total: 3 })
  })
})

describe('restPreview', () => {
  const chest = { id: 'machine-chest-press', name: 'Machine chest press', displayUnit: 'lb', restSeconds: 90 }
  const benchK = { ...bench, restSeconds: 90 }
  const chestPrev = [
    { setNumber: 1, weight: 50, unit: 'kg', reps: 10 },
    { setNumber: 3, weight: 50, unit: 'kg', reps: 9 },
    { setNumber: 2, weight: 50, unit: 'kg', reps: 10 },
  ]
  const slotChest = { targetSets: 3, repMin: 8, repMax: 10 }
  const ents = [
    { exercise: benchK, slot: { targetSets: 2, repMin: 5, repMax: 8 }, previousSets: prev },
    { exercise: chest, slot: slotChest, previousSets: chestPrev },
    { exercise: dips, slot: slot3, previousSets: [] },
  ]

  it('names another exercise with last time and a converted set-up weight', () => {
    const plan = buildPlan(ents, [logged(bench.id, 1), logged(bench.id, 2)], {}, {})
    const p = restPreview(plan, bench.id)
    expect(p.kind).toBe('other')
    expect(p.entry.exercise.id).toBe(chest.id)
    expect(p.index).toBe(2)
    expect(p.count).toBe(3)
    expect(p.row.n).toBe(1)
    expect(p.lastText).toBe('50 kg × 10 · 10 · 9')
    expect(p.setupText).toBe('110.2 lb')
    expect(p.after).toBeUndefined()
  })

  it('names the next set of the same exercise and what follows it', () => {
    const plan = buildPlan(ents, [logged(bench.id, 1)], {}, {})
    const p = restPreview(plan, bench.id)
    expect(p.kind).toBe('same')
    expect(p.row.n).toBe(2)
    expect(p.lastText).toBe('60 kg × 7')
    expect(p.setupText).toBe('60 kg')
    expect(p.after).toEqual({ name: 'Machine chest press', text: '3 × 8–10' })
  })

  it('says the same exercise is last when nothing follows', () => {
    const plan = buildPlan([ents[2]], [logged(dips.id, 1)], {}, {})
    const p = restPreview(plan, dips.id)
    expect(p.kind).toBe('same')
    expect(p.after).toBeNull()
    expect(p.setupText).toBe('60 kg')
  })

  it('is none when every set is logged or skipped', () => {
    const plan = buildPlan([ents[0]], [logged(bench.id, 1), logged(bench.id, 2)], {}, {})
    expect(restPreview(plan, bench.id)).toEqual({ kind: 'none' })
  })

  it('treats a rested exercise no longer in the plan as another exercise', () => {
    const plan = buildPlan(ents, [], {}, {})
    const p = restPreview(plan, 'not-in-plan')
    expect(p.kind).toBe('other')
    expect(p.entry.exercise.id).toBe(bench.id)
    expect(p.setupText).toBe('60 kg')
  })
})

describe('setsText', () => {
  it('shows a range when the slot has one', () => {
    expect(setsText({ targetSets: 3, setsMax: 4 })).toBe('3–4 sets')
    expect(setsText({ targetSets: 4 })).toBe('4 sets')
    expect(setsText({ targetSets: 1 })).toBe('1 set')
  })
})
