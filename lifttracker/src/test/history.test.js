import { describe, expect, it } from 'vitest'
import { formatSession, groupSessions } from '../lib/history.js'

const w = (id, finishedAt) => ({ id, finishedAt, startedAt: finishedAt, programDayId: 'push-a' })
const s = (workoutId, setNumber, weight, reps, unit = 'kg') => ({ id: `${workoutId}-${setNumber}`, workoutId, exerciseId: 'barbell-bench-press', setNumber, weight, unit, reps, loggedAt: '2026-10-09T10:00:00Z' })

describe('groupSessions', () => {
  it('groups sets by finished workout, newest first, sorted by set number', () => {
    const workouts = [w('a', '2026-10-04T11:00:00Z'), w('b', '2026-10-09T11:00:00Z'), { id: 'c', finishedAt: null, startedAt: '2026-10-12T10:00:00Z', programDayId: 'push-a' }]
    const sets = [s('a', 1, 57.5, 8), s('b', 2, 60, 8), s('b', 1, 60, 8), s('c', 1, 62.5, 5)]
    const sessions = groupSessions(sets, workouts)
    expect(sessions.map((x) => x.workoutId)).toEqual(['b', 'a'])
    expect(sessions[0].sets.map((x) => x.setNumber)).toEqual([1, 2])
  })

  it('limits to the newest n sessions', () => {
    const workouts = [1, 2, 3, 4, 5, 6, 7].map((n) => w(`w${n}`, `2026-10-0${n}T11:00:00Z`))
    const sets = workouts.map((x) => s(x.id, 1, 60, 8))
    expect(groupSessions(sets, workouts, 5)).toHaveLength(5)
    expect(groupSessions(sets, workouts, 5)[0].workoutId).toBe('w7')
  })
})

describe('formatSession', () => {
  it('joins reps with middots after one weight', () => {
    expect(formatSession([s('a', 1, 60, 8), s('a', 2, 60, 8), s('a', 3, 60, 7), s('a', 4, 60, 6)])).toBe('60 kg × 8 · 8 · 7 · 6')
  })
  it('starts a new group when the weight or unit changes', () => {
    expect(formatSession([s('a', 1, 60, 8), s('a', 2, 60, 8), s('a', 3, 57.5, 6)])).toBe('60 kg × 8 · 8, 57.5 kg × 6')
    expect(formatSession([s('a', 1, 60, 8), s('a', 2, 130, 8, 'lb')])).toBe('60 kg × 8, 130 lb × 8')
  })
  it('shows a dash for no sets', () => {
    expect(formatSession([])).toBe('–')
  })
})
