import { db } from './db.js'
import { exercises as seededExercises } from './program.js'
import { seedIfEmpty } from './seed.js'
import { serializeBackup } from '../lib/backup.js'

const ACTIVE = 'Finish the active workout first.'

async function assertNoActiveWorkout(database) {
  const workouts = await database.workouts.toArray()
  if (workouts.some((w) => w.finishedAt === null)) throw new Error(ACTIVE)
}

export async function exportBackup(database = db) {
  await assertNoActiveWorkout(database)
  const [exercises, programDays, workouts, sets, settings] = await Promise.all([
    database.exercises.toArray(),
    database.programDays.toArray(),
    database.workouts.toArray(),
    database.sets.toArray(),
    database.settings.toArray(),
  ])
  return serializeBackup({ exercises, programDays, workouts, sets, settings })
}

// Replaces everything on this phone with the backup, then fills in fields
// this version added since the backup was made (illustration slugs).
export async function importBackup(data, database = db) {
  await assertNoActiveWorkout(database)
  const slugs = new Map(seededExercises.map((e) => [e.id, e.illustration]))
  const exercises = data.exercises.map((e) => (e.illustration ? e : { ...e, illustration: slugs.get(e.id) }))
  await database.transaction('rw', database.exercises, database.programDays, database.workouts, database.sets, database.settings, async () => {
    await Promise.all([database.exercises.clear(), database.programDays.clear(), database.workouts.clear(), database.sets.clear(), database.settings.clear()])
    await database.exercises.bulkAdd(exercises)
    await database.programDays.bulkAdd(data.programDays)
    await database.workouts.bulkAdd(data.workouts)
    await database.sets.bulkAdd(data.sets)
    await database.settings.bulkAdd(data.settings)
  })
  // Settings keys added since the backup was made get their defaults.
  await seedIfEmpty(database)
}
