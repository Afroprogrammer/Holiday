import { db } from './db.js'
import { nextProgramDayAfter } from '../lib/cycle.js'
import { groupSessions } from '../lib/history.js'

const now = () => new Date().toISOString()
const newId = () => crypto.randomUUID()

// At most one active workout (prd.md, "Data model").
export async function getActiveWorkout() {
  const workouts = await db.workouts.toArray()
  return workouts.find((w) => w.finishedAt === null) ?? null
}

// Starts a workout for a program day. Returns the existing active workout
// if there is one, so Start can't create a second.
export async function startWorkout(programDayId) {
  const active = await getActiveWorkout()
  if (active) return active
  const workout = { id: newId(), programDayId, startedAt: now(), finishedAt: null }
  await db.workouts.add(workout)
  return workout
}

// Logs a set exactly as entered, with its unit. Sets are append-only.
export async function logSet({ workoutId, exerciseId, setNumber, weight, unit, reps }) {
  const set = { id: newId(), workoutId, exerciseId, setNumber, weight, unit, reps, loggedAt: now() }
  await db.sets.add(set)
  return set
}

// Finish (prd.md, "User flow" step 5): records the end time, saves the
// workout, and advances the cycle to the day after the one just finished.
export async function finishWorkout(workoutId) {
  await db.transaction('rw', db.workouts, db.programDays, db.settings, async () => {
    const workout = await db.workouts.get(workoutId)
    if (!workout || workout.finishedAt) return
    await db.workouts.update(workoutId, { finishedAt: now() })
    const days = await db.programDays.toArray()
    const next = nextProgramDayAfter(workout.programDayId, days)
    await db.settings.put({ key: 'nextProgramDayId', value: next.id })
  })
}

// Flipping the unit label on the workout screen changes the exercise's
// display unit, and the app remembers (prd.md, "Units").
export async function setDisplayUnit(exerciseId, displayUnit) {
  await db.exercises.update(exerciseId, { displayUnit })
}

// The sets for `exerciseId` from the most recent finished workout that
// contains it, excluding the workout in progress. Empty with no history.
export async function getPreviousSets(exerciseId, currentWorkoutId) {
  const finished = await db.workouts.orderBy('finishedAt').reverse().toArray()
  for (const workout of finished) {
    if (workout.id === currentWorkoutId) continue
    const sets = await db.sets.where('[workoutId+exerciseId]').equals([workout.id, exerciseId]).toArray()
    if (sets.length > 0) return sets
  }
  return []
}

// Everything the workout screen needs for one active workout.
export async function getWorkoutView(workoutId) {
  const workout = await db.workouts.get(workoutId)
  if (!workout) return null
  const day = await db.programDays.get(workout.programDayId)
  const exercises = await db.exercises.toArray()
  const byId = new Map(exercises.map((e) => [e.id, e]))
  const loggedSets = await db.sets.where('workoutId').equals(workoutId).toArray()

  const slots = []
  for (const slot of day.slots) {
    const options = slot.exerciseIds.map((id) => byId.get(id))
    const previousBy = {}
    for (const id of slot.exerciseIds) previousBy[id] = await getPreviousSets(id, workoutId)
    slots.push({ ...slot, options, previousBy })
  }
  return { workout, day, slots, loggedSets }
}

// The running rest, kept in settings as its end timestamp so it survives
// the screen locking or the app being reopened (prd.md, "Rest timer").
export async function getActiveRest() {
  const row = await db.settings.get('activeRest')
  return row?.value ?? null
}

export async function saveActiveRest(rest) {
  if (rest) await db.settings.put({ key: 'activeRest', value: rest })
  else await db.settings.delete('activeRest')
}

// The last `limit` finished sessions containing an exercise, newest first,
// for the history list on the exercise settings screen.
export async function getExerciseHistory(exerciseId, limit = 5) {
  const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray()
  const workouts = await db.workouts.toArray()
  return groupSessions(sets, workouts, limit)
}

// Corrections to a logged set (gym round 1, 2.3). Only weight, unit and
// reps change; loggedAt and the set number stay.
export async function updateSet(id, { weight, unit, reps }) {
  await db.sets.update(id, { weight, unit, reps })
}

export async function deleteSet(id) {
  await db.sets.delete(id)
}
