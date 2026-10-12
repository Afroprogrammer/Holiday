import { describe, expect, it } from 'vitest'
import { prefillForSet, rangeMarker } from '../lib/prefill.js'

const previous = [
  { setNumber: 2, weight: 60, unit: 'kg', reps: 7 },
  { setNumber: 1, weight: 60, unit: 'kg', reps: 8 },
  { setNumber: 3, weight: 57.5, unit: 'kg', reps: 6 },
]

describe('prefill', () => {
  it('uses the matching set number from the previous session', () => {
    expect(prefillForSet(previous, 1)).toEqual({ weight: 60, unit: 'kg', reps: 8 })
    expect(prefillForSet(previous, 3)).toEqual({ weight: 57.5, unit: 'kg', reps: 6 })
  })

  it('fills missing set numbers from the last set that exists', () => {
    expect(prefillForSet(previous, 4)).toEqual({ weight: 57.5, unit: 'kg', reps: 6 })
    expect(prefillForSet(previous, 9)).toEqual({ weight: 57.5, unit: 'kg', reps: 6 })
  })

  it('returns null with no history', () => {
    expect(prefillForSet([], 1)).toBeNull()
    expect(prefillForSet(undefined, 1)).toBeNull()
  })
})

describe('range marker', () => {
  it('marks reps above the top of the range', () => {
    expect(rangeMarker(9, 6, 8)).toEqual({ kind: 'above', bound: 8 })
  })

  it('marks reps below the bottom of the range', () => {
    expect(rangeMarker(5, 6, 8)).toEqual({ kind: 'below', bound: 6 })
  })

  it('shows nothing inside the range', () => {
    expect(rangeMarker(6, 6, 8)).toBeNull()
    expect(rangeMarker(8, 6, 8)).toBeNull()
  })
})
