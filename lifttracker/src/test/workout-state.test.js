import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../db/db.js'
import { seedIfEmpty } from '../db/seed.js'
import { getWorkoutView, startWorkout, updateWorkoutState } from '../db/workouts.js'
import { buildPlan, skippedSets } from '../lib/workoutProgress.js'

// The persisted shape drives the plan after a reload (gym round 2, 3.4).
describe('workout state survives a reload', () => {
  beforeEach(async () => {
    await db.workouts.clear()
    await db.sets.clear()
    await db.settings.clear()
    await seedIfEmpty()
  })

  it('skipped, extra and chosen come back into buildPlan', async () => {
    const w = await startWorkout('pull-a')
    const view0 = await getWorkoutView(w.id)
    const alt = view0.slots[2].exerciseIds[1]
    await updateWorkoutState(w.id, { skipped: { 'assisted-pull-ups': [2] }, extra: { 'assisted-pull-ups': 1 }, chosen: { 2: alt } })
    const view = await getWorkoutView(w.id)
    const entries = view.slots.map((slot, index) => {
      const id = view.workout.chosen[index] ?? slot.exerciseIds[0]
      return { slot, exercise: slot.options.find((o) => o.id === id), previousSets: [], index }
    })
    const plan = buildPlan(entries, view.loggedSets, skippedSets(view.workout.skipped), view.workout.extra)
    expect(entries[2].exercise.id).toBe(alt)
    expect(plan.exercises[0].rows[1].status).toBe('skipped')
    expect(plan.exercises[0].total).toBe(view.slots[0].targetSets + 1)
  })
})
