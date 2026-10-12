import { db } from './db.js'
import { exercises, programDays, defaultSettings } from './program.js'

// Seeds the program on first launch ("The program": "The program is seeded on
// first launch."). When exercises already exist it only backfills fields that
// later versions added (currently `illustration`), so edits made in settings
// are never overwritten. Returns true when it seeded from empty.
export async function seedIfEmpty(database = db) {
  const count = await database.exercises.count()
  if (count > 0) {
    await backfill(database)
    return false
  }
  await database.transaction('rw', database.exercises, database.programDays, database.settings, async () => {
    await database.exercises.bulkAdd(exercises)
    await database.programDays.bulkAdd(programDays)
    await database.settings.bulkAdd(defaultSettings)
  })
  return true
}

async function backfill(database) {
  for (const seeded of exercises) {
    const stored = await database.exercises.get(seeded.id)
    if (stored && !stored.illustration) {
      await database.exercises.update(seeded.id, { illustration: seeded.illustration })
    }
  }
}
