import { describe, expect, it } from 'vitest'
import { exercises, programDays } from '../db/program.js'

const byId = new Map(exercises.map((e) => [e.id, e]))

describe('seeded program', () => {
  it('cycles Push A, Pull A, Push B, Pull B', () => {
    expect(programDays.map((d) => d.name)).toEqual(['Push A', 'Pull A', 'Push B', 'Pull B'])
    expect(programDays.map((d) => d.order)).toEqual([1, 2, 3, 4])
  })

  it('has five slots per day, each pointing at seeded exercises', () => {
    for (const day of programDays) {
      expect(day.slots).toHaveLength(5)
      for (const s of day.slots) {
        expect(s.exerciseIds.length).toBeGreaterThanOrEqual(1)
        expect(s.exerciseIds.length).toBeLessThanOrEqual(2)
        for (const id of s.exerciseIds) expect(byId.has(id)).toBe(true)
        expect(s.repMin).toBeLessThanOrEqual(s.repMax)
      }
    }
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

  it('marks assisted pull-ups as lower is better', () => {
    expect(byId.get('assisted-pull-ups').lowerIsBetter).toBe(true)
  })

  it('uses a 120 second rest for the deadlift', () => {
    expect(byId.get('deadlift').restSeconds).toBe(120)
  })
})
