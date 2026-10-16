import { describe, expect, it } from 'vitest'
import { adjustRest, formatCountdown, progressFraction, remainingSeconds, startRest } from '../lib/timer.js'

const t0 = 1_000_000
const rest = startRest({ exerciseId: 'deadlift', exerciseName: 'Deadlift', restSeconds: 120 }, t0)

describe('rest timer', () => {
  it('keeps the set that started it', () => {
    const r = startRest({ exerciseId: 'deadlift', exerciseName: 'Deadlift', restSeconds: 120, setId: 's9' }, t0)
    expect(r.setId).toBe('s9')
  })

  it('reports elapsed progress clamped to one', () => {
    expect(progressFraction(rest, t0)).toBe(0)
    expect(progressFraction(rest, t0 + 60_000)).toBeCloseTo(0.5)
    expect(progressFraction(rest, t0 + 200_000)).toBe(1)
  })

  it('ends restSeconds after it starts', () => {
    expect(rest.endsAt).toBe(t0 + 120_000)
    expect(remainingSeconds(rest, t0)).toBe(120)
  })

  it('counts down from the stored end time, not a running counter', () => {
    expect(remainingSeconds(rest, t0 + 73_000)).toBe(47)
    expect(remainingSeconds(rest, t0 + 73_400)).toBe(47)
  })

  it('reports overtime as negative seconds after zero', () => {
    expect(remainingSeconds(rest, t0 + 120_000)).toBe(0)
    expect(remainingSeconds(rest, t0 + 132_000)).toBe(-12)
  })

  it('shifts only the current rest by plus or minus 15 seconds', () => {
    expect(remainingSeconds(adjustRest(rest, 15), t0)).toBe(135)
    expect(remainingSeconds(adjustRest(rest, -15), t0)).toBe(105)
    expect(adjustRest(rest, -15).durationSeconds).toBe(105)
  })

  it('formats the countdown and overtime', () => {
    expect(formatCountdown(90)).toBe('1:30')
    expect(formatCountdown(47)).toBe('0:47')
    expect(formatCountdown(0)).toBe('0:00')
    expect(formatCountdown(-12)).toBe('+0:12')
  })
})
