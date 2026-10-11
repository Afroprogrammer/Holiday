import { describe, expect, it } from 'vitest'
import { nextProgramDayAfter } from '../lib/cycle.js'
import { programDays } from '../db/program.js'

describe('cycle advance', () => {
  it('moves Push A to Pull A, then Push B, then Pull B', () => {
    expect(nextProgramDayAfter('push-a', programDays).id).toBe('pull-a')
    expect(nextProgramDayAfter('pull-a', programDays).id).toBe('push-b')
    expect(nextProgramDayAfter('push-b', programDays).id).toBe('pull-b')
  })

  it('wraps from Pull B back to Push A', () => {
    expect(nextProgramDayAfter('pull-b', programDays).id).toBe('push-a')
  })

  it('starts at Push A when nothing has been completed', () => {
    expect(nextProgramDayAfter(null, programDays).id).toBe('push-a')
    expect(nextProgramDayAfter(undefined, programDays).id).toBe('push-a')
  })

  it('ignores the array order and follows the order field', () => {
    const shuffled = [...programDays].reverse()
    expect(nextProgramDayAfter('push-a', shuffled).id).toBe('pull-a')
  })
})
