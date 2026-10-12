import { describe, expect, it } from 'vitest'
import { formatShortDate } from '../lib/format.js'

describe('formatShortDate', () => {
  it('writes weekday, day, month', () => {
    expect(formatShortDate('2026-10-09T18:30:00Z')).toBe('Fri 9 Oct')
  })
})
