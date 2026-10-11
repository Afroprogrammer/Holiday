import { db } from './db.js'

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
