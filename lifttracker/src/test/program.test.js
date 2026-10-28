import { describe, expect, it } from 'vitest'
import { exercises, PROGRAM_VERSION, programDays, retiredExercises } from '../db/program.js'

const byId = new Map(exercises.map((e) => [e.id, e]))
const firstIds = (day) => day.slots.map((s) => s.exerciseIds[0])

// Franklin's October 2026 program (new program spec, plan "silly-napping-bunny").
describe('seeded program', () => {
  it('is version 2 and cycles Push A, Pull A, Push B, Pull B', () => {
    expect(PROGRAM_VERSION).toBe(2)
    expect(programDays.map((d) => d.name)).toEqual(['Push A', 'Pull A', 'Push B', 'Pull B'])
    expect(programDays.map((d) => d.order)).toEqual([1, 2, 3, 4])
  })

  it('has six slots per day pointing at seeded exercises, with sane ranges', () => {
    for (const day of programDays) {
      expect(day.slots, day.id).toHaveLength(6)
      for (const s of day.slots) {
        expect(s.exerciseIds.length).toBeGreaterThanOrEqual(1)
        expect(s.exerciseIds.length).toBeLessThanOrEqual(2)
        for (const id of s.exerciseIds) expect(byId.has(id), id).toBe(true)
        expect(s.repMin).toBeLessThanOrEqual(s.repMax)
        if (s.setsMax !== undefined) expect(s.setsMax).toBeGreaterThan(s.targetSets)
      }
    }
  })

  it('follows the new order, with the finisher fifth on every day', () => {
    expect(firstIds(programDays[0])).toEqual(['barbell-bench-press', 'pec-fly-machine', 'machine-shoulder-press', 'dips', 'cable-lateral-raise', 'cable-woodchoppers'])
    expect(firstIds(programDays[1])).toEqual(['assisted-pull-ups', 'row-machine', 'barbell-shrugs', 'cable-curls', 'reverse-pec-fly', 'weighted-decline-sit-ups'])
    expect(firstIds(programDays[2])).toEqual(['incline-dumbbell-press', 'machine-chest-press', 'cable-lateral-raise', 'tricep-pushdowns', 'overhead-cable-tricep-extension', 'weighted-cable-crunch'])
    expect(firstIds(programDays[3])).toEqual(['barbell-squat', 'lat-pulldown', 'seated-cable-row', 'heavy-dumbbell-shrugs', 'dumbbell-hammer-curls', 'machine-ab-crunch'])
    for (const day of programDays) {
      expect(day.slots.map((s) => Boolean(s.finisher))).toEqual([false, false, false, false, true, false])
    }
  })

  it('keeps the set ranges and notes from the plan', () => {
    const [pushA, , , pullB] = programDays
    expect(pushA.slots[0]).toMatchObject({ targetSets: 3, setsMax: 4, repMin: 5, repMax: 8 })
    expect(pushA.slots[4]).toMatchObject({ targetSets: 3, repMin: 12, repMax: 15, note: 'Drop set on the last set' })
    expect(pushA.slots[5]).toMatchObject({ targetSets: 2, setsMax: 3 })
    expect(pullB.slots[0].exerciseIds).toEqual(['barbell-squat', 'hack-squat'])
    expect(pullB.slots[0]).toMatchObject({ targetSets: 3, setsMax: 4, repMin: 6, repMax: 8 })
  })

  it('drops the deadlift from the program but keeps its record as retired', () => {
    const used = new Set(programDays.flatMap((d) => d.slots.flatMap((s) => s.exerciseIds)))
    expect(used.has('deadlift')).toBe(false)
    expect(retiredExercises.map((e) => e.id)).toEqual(expect.arrayContaining(['deadlift', 'dumbbell-shoulder-press', 'barbell-curls', 'hanging-knee-raises', 'barbell-overhead-press', 'barbell-bent-over-row']))
    for (const e of retiredExercises) expect(used.has(e.id), e.id).toBe(false)
    expect(byId.get('deadlift').restSeconds).toBe(120)
  })

  it('has unique exercise ids with a kg or lb display unit and a rest time', () => {
    expect(byId.size).toBe(exercises.length)
    for (const e of exercises) {
      expect(['kg', 'lb']).toContain(e.displayUnit)
      expect(e.restSeconds).toBeGreaterThan(0)
      expect(e.incrementKg).toBe(2.5)
      expect(e.incrementLb).toBe(5)
    }
  })

  it('marks assisted pull-ups as lower is better and rests 120 s on the squat', () => {
    expect(byId.get('assisted-pull-ups').lowerIsBetter).toBe(true)
    expect(byId.get('barbell-squat').restSeconds).toBe(120)
    expect(byId.get('hack-squat').restSeconds).toBe(120)
  })
})
