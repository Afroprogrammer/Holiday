import { db } from './db.js'
import { getActiveWorkout, getPreviousSets } from './workouts.js'

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

// The newest finished workout per program day, keyed by day id.
async function lastFinishedByDay() {
  const workouts = await db.workouts.orderBy('finishedAt').reverse().toArray()
  const byDay = new Map()
  for (const w of workouts) {
    if (w.finishedAt && !byDay.has(w.programDayId)) byDay.set(w.programDayId, w)
  }
  return byDay
}

// One poster per program day for the Home pager (gym round 2, 3.1): the
// illustration strip, that day's last finished workout, and the first
// exercise's last session for the "last time" line.
async function dayEntry(day, exercisesById, lastByDay) {
  const stripSlugs = []
  const picks = []
  for (const slot of day.slots) {
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
    picks.push(pick)
  }
  // The alternative used most recently, same as the strip's figure.
  const firstExercise = exercisesById.get(picks[0]) ?? null
  const firstSets = firstExercise ? await getPreviousSets(firstExercise.id, null) : []
  return {
    day,
    stripSlugs,
    firstExercise,
    firstSession: firstSets.length > 0 ? { sets: [...firstSets].sort((a, b) => a.setNumber - b.setNumber) } : null,
    lastWorkout: lastByDay.get(day.id) ?? null,
  }
}

export async function getHomeView() {
  const [nextDay, programDays, exercises, lastByDay] = await Promise.all([getNextProgramDay(), getProgramDays(), db.exercises.toArray(), lastFinishedByDay()])
  const exercisesById = new Map(exercises.map((e) => [e.id, e]))
  const days = []
  for (const day of programDays) days.push(await dayEntry(day, exercisesById, lastByDay))
  return { nextDay, days, exercisesById }
}

// The running workout for App and Home (gym round 2, 3.3): enough to build
// the resume summary. No previous-session history is needed because the
// chosen alternative per slot is stored on the workout.
export async function getActiveView() {
  const workout = await getActiveWorkout()
  if (!workout) return null
  const [day, loggedSets, exercises] = await Promise.all([
    db.programDays.get(workout.programDayId),
    db.sets.where('workoutId').equals(workout.id).toArray(),
    db.exercises.toArray(),
  ])
  return { workout, day, loggedSets, exercisesById: new Map(exercises.map((e) => [e.id, e])) }
}
