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
