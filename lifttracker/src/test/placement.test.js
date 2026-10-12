import { describe, expect, it } from 'vitest'
import { programDays } from '../db/program.js'
import { exercisePlacements, placementCaption } from '../lib/placement.js'

describe('exercise placement', () => {
  it('finds the day and slot position', () => {
    expect(exercisePlacements('barbell-bench-press', programDays)).toEqual([{ dayName: 'Push A', index: 1 }])
    expect(exercisePlacements('dumbbell-shrugs', programDays)).toEqual([{ dayName: 'Pull A', index: 3 }])
  })
  it('lists both days for the shared machine chest press', () => {
    expect(exercisePlacements('machine-chest-press', programDays)).toEqual([
      { dayName: 'Push A', index: 2 },
      { dayName: 'Push B', index: 2 },
    ])
  })
  it('writes the caption', () => {
    expect(placementCaption([{ dayName: 'Push A', index: 1 }])).toBe('Push A · exercise 1')
    expect(placementCaption([{ dayName: 'Push A', index: 2 }, { dayName: 'Push B', index: 2 }])).toBe('Push A and Push B · exercise 2')
    expect(placementCaption([])).toBe('')
  })
})
