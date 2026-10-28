import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db.js'
import { getActiveView } from '../db/queries.js'
import { seedIfEmpty } from '../db/seed.js'

describe('getActiveView', () => {
  beforeEach(async () => {
    await db.workouts.clear()
    await db.sets.clear()
    await db.settings.clear()
    await seedIfEmpty()
  })

  it('is null without a workout and reads an old record as-is', async () => {
    expect(await getActiveView()).toBeNull()
    await db.workouts.add({ id: 'old', programDayId: 'push-a', startedAt: new Date().toISOString(), finishedAt: null })
    await db.sets.add({ id: 's1', workoutId: 'old', exerciseId: 'barbell-bench-press', setNumber: 1, weight: 60, unit: 'kg', reps: 8, loggedAt: new Date().toISOString() })
    const view = await getActiveView()
    expect(view.workout.id).toBe('old')
    expect(view.day.id).toBe('push-a')
    expect(view.workout.skipped).toBeUndefined()
    expect(view.loggedSets.map((s) => s.id)).toEqual(['s1'])
    expect(view.exercisesById.get('barbell-bench-press').name).toMatch(/bench/i)
  })
})

describe('getHomeView per day', () => {
  beforeEach(async () => {
    await db.workouts.clear()
    await db.sets.clear()
    await db.settings.clear()
    await seedIfEmpty()
  })

  it('returns one entry per day with that day’s last workout and first-exercise session', async () => {
    const { getHomeView } = await import('../db/queries.js')
    const { finishWorkout, logSet, startWorkout } = await import('../db/workouts.js')
    const w = await startWorkout('push-a')
    await logSet({ workoutId: w.id, exerciseId: 'barbell-bench-press', setNumber: 1, weight: 60, unit: 'kg', reps: 8 })
    await finishWorkout(w.id)
    const view = await getHomeView()
    expect(view.days).toHaveLength(4)
    expect(view.days.map((d) => d.day.id)).toEqual(['push-a', 'pull-a', 'push-b', 'pull-b'])
    expect(view.days[0].lastWorkout.programDayId).toBe('push-a')
    expect(view.days[1].lastWorkout).toBeNull()
    expect(view.days[0].firstSession.sets).toHaveLength(1)
    expect(view.days[1].firstSession).toBeNull()
    expect(view.days[0].stripSlugs).toHaveLength(view.days[0].day.slots.length)
    expect(view.days[0].firstExercise.id).toBe('barbell-bench-press')
    expect(view.nextDay.id).toBe('pull-a')
    expect(view.exercisesById.get('deadlift')).toBeTruthy()
  })
  it('names the alternative actually used on the last-time line', async () => {
    const { getHomeView } = await import('../db/queries.js')
    const { finishWorkout, logSet, startWorkout } = await import('../db/workouts.js')
    const w = await startWorkout('pull-b')
    await logSet({ workoutId: w.id, exerciseId: 'hack-squat', setNumber: 1, weight: 80, unit: 'kg', reps: 8 })
    await finishWorkout(w.id)
    const view = await getHomeView()
    expect(view.days[3].firstExercise.id).toBe('hack-squat')
    expect(view.days[3].firstSession.sets).toHaveLength(1)
  })
})
