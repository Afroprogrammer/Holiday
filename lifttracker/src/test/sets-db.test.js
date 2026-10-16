import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db.js'
import { deleteSet, logSet, updateSet } from '../db/workouts.js'

// workouts.js binds to the app database; these tests use it directly and
// clear the sets table between runs.
describe('set corrections', () => {
  beforeEach(async () => {
    await db.sets.clear()
  })

  it('updates weight, unit and reps and keeps the rest of the record', async () => {
    const set = await logSet({ workoutId: 'w1', exerciseId: 'dips', setNumber: 1, weight: 0, unit: 'kg', reps: 10 })
    await updateSet(set.id, { weight: 5, unit: 'kg', reps: 9 })
    const stored = await db.sets.get(set.id)
    expect(stored).toMatchObject({ id: set.id, workoutId: 'w1', setNumber: 1, weight: 5, unit: 'kg', reps: 9, loggedAt: set.loggedAt })
  })

  it('deletes a set', async () => {
    const set = await logSet({ workoutId: 'w1', exerciseId: 'dips', setNumber: 2, weight: 0, unit: 'kg', reps: 10 })
    await deleteSet(set.id)
    expect(await db.sets.get(set.id)).toBeUndefined()
  })
})
