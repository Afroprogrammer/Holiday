import { describe, expect, it } from 'vitest'
import { programDays } from '../db/program.js'
import { exercisePlacements, placementCaption } from '../lib/placement.js'

describe('exercise placement', () => {
  it('finds the day and slot position', () => {
    expect(exercisePlacements('barbell-bench-press', programDays)).toEqual([{ dayName: 'Push A', index: 1 }])
    expect(exercisePlacements('dumbbell-shrugs', programDays)).toEqual([{ dayName: 'Pull A', index: 3 }])
  })
  it('lists both days for the shared lateral raise', () => {
    expect(exercisePlacements('cable-lateral-raise', programDays)).toEqual([
      { dayName: 'Push A', index: 5 },
      { dayName: 'Push B', index: 3 },
    ])
  })
  it('writes the caption', () => {
    expect(placementCaption([{ dayName: 'Push A', index: 1 }])).toBe('Push A · exercise 1')
    expect(placementCaption([{ dayName: 'Push A', index: 2 }, { dayName: 'Push B', index: 2 }])).toBe('Push A and Push B · exercise 2')
    expect(placementCaption([])).toBe('')
    expect(placementCaption([{ dayName: 'Push A', index: 5 }, { dayName: 'Push B', index: 3 }])).toBe('Push A · exercise 5, Push B · exercise 3')
  })
})

describe('targetsCaption', () => {
  it('shows one target when every placement agrees, else one per day', async () => {
    const { targetsCaption } = await import('../lib/placement.js')
    expect(targetsCaption('barbell-bench-press', programDays)).toBe('3–4 sets · 5–8 reps')
    expect(targetsCaption('cable-lateral-raise', programDays)).toBe('Push A 3 sets · 12–15 reps, Push B 3 sets · 10–12 reps')
    expect(targetsCaption('deadlift', programDays)).toBe('')
  })
})
