import { db } from './db.js'
import { exercises, programDays, defaultSettings } from './program.js'

// Seeds the program on first launch ("The program": "The program is seeded on
// first launch."). Does nothing when exercises already exist, so edits made in
// settings are never overwritten.
export async function seedIfEmpty(database = db) {
  const count = await database.exercises.count()
  if (count > 0) return false
  await database.transaction('rw', database.exercises, database.programDays, database.settings, async () => {
    await database.exercises.bulkAdd(exercises)
    await database.programDays.bulkAdd(programDays)
    await database.settings.bulkAdd(defaultSettings)
  })
  return true
}
