import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db.js'
import { seedIfEmpty } from '../db/seed.js'
import { discardWorkout, getActiveRest, getActiveWorkout, logSet, saveActiveRest, startWorkout, updateWorkoutState } from '../db/workouts.js'
import { startRest } from '../lib/timer.js'

// Workout record fields and discard (gym round 2, 3.3 and 3.4).
describe('workout record state', () => {
  beforeEach(async () => {
    await db.workouts.clear()
    await db.sets.clear()
    await db.settings.clear()
    await seedIfEmpty()
  })

  it('startWorkout writes empty skipped, extra and chosen', async () => {
    const w = await startWorkout('push-a')
    expect(w.skipped).toEqual({})
    expect(w.extra).toEqual({})
    expect(w.chosen).toEqual({})
    expect((await db.workouts.get(w.id)).chosen).toEqual({})
  })

  it('updateWorkoutState replaces the given fields only', async () => {
    const w = await startWorkout('push-a')
    await updateWorkoutState(w.id, { skipped: { 'barbell-bench-press': [2] } })
    await updateWorkoutState(w.id, { extra: { 'barbell-bench-press': 1 } })
    const stored = await db.workouts.get(w.id)
    expect(stored.skipped).toEqual({ 'barbell-bench-press': [2] })
    expect(stored.extra).toEqual({ 'barbell-bench-press': 1 })
    expect(stored.chosen).toEqual({})
  })

  it('discardWorkout removes the workout, its sets and the running rest', async () => {
    const w = await startWorkout('push-a')
    const s = await logSet({ workoutId: w.id, exerciseId: 'barbell-bench-press', setNumber: 1, weight: 60, unit: 'kg', reps: 8 })
    await saveActiveRest(startRest({ exerciseId: 'barbell-bench-press', exerciseName: 'Bench press', restSeconds: 90, setId: s.id }))
    await discardWorkout(w.id)
    expect(await db.workouts.get(w.id)).toBeUndefined()
    expect(await db.sets.where('workoutId').equals(w.id).count()).toBe(0)
    expect(await getActiveRest()).toBeNull()
    expect(await getActiveWorkout()).toBeNull()
  })
})
