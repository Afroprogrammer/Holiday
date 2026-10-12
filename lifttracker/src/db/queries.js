import { db } from './db.js'
import { getPreviousSets } from './workouts.js'

// The day the home screen offers next. The stored cycle position wins, so
// that starting a day out of order doesn't move it until that workout is
// finished (prd.md, "Home screen").
export async function getNextProgramDay() {
  const setting = await db.settings.get('nextProgramDayId')
  const days = await db.programDays.orderBy('order').toArray()
  return days.find((d) => d.id === setting?.value) ?? days[0] ?? null
}

export async function getProgramDays() {
  return db.programDays.orderBy('order').toArray()
}

// The most recently finished workout, with its program day attached.
export async function getLastFinishedWorkout() {
  const workouts = await db.workouts.orderBy('finishedAt').reverse().toArray()
  const last = workouts.find((w) => w.finishedAt)
  if (!last) return null
  const day = await db.programDays.get(last.programDayId)
  return { ...last, programDay: day }
}

// Everything the home screen shows: the next day, the cycle, the last
// finished workout, one illustration per slot, and the first exercise's last
// session for the "last time" line.
export async function getHomeView() {
  const [nextDay, days, lastWorkout, exercises] = await Promise.all([
    getNextProgramDay(),
    getProgramDays(),
    getLastFinishedWorkout(),
    db.exercises.toArray(),
  ])
  const exercisesById = new Map(exercises.map((e) => [e.id, e]))
  if (!nextDay) return { nextDay, days, lastWorkout, exercisesById, firstExercise: null, firstSession: null, stripSlugs: [] }

  const stripSlugs = []
  for (const slot of nextDay.slots) {
    let pick = slot.exerciseIds[0]
    let latest = null
    for (const id of slot.exerciseIds) {
      const sets = await getPreviousSets(id, null)
      const when = sets.map((s) => s.loggedAt).sort().at(-1) ?? null
      if (when && (!latest || when > latest)) {
        latest = when
        pick = id
      }
    }
    stripSlugs.push(exercisesById.get(pick)?.illustration)
  }
  const firstExercise = exercisesById.get(nextDay.slots[0].exerciseIds[0]) ?? null
  const firstSets = firstExercise ? await getPreviousSets(firstExercise.id, null) : []
  return {
    nextDay,
    days,
    lastWorkout,
    exercisesById,
    firstExercise,
    firstSession: firstSets.length > 0 ? { sets: [...firstSets].sort((a, b) => a.setNumber - b.setNumber) } : null,
    stripSlugs,
  }
}
