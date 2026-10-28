import { db } from './db.js'
import { exercises, programDays, defaultSettings, PROGRAM_VERSION } from './program.js'

// Seeds the program on first launch ("The program": "The program is seeded on
// first launch."). When exercises already exist it only backfills fields that
// later versions added (currently `illustration`), so edits made in settings
// are never overwritten. Returns true when it seeded from empty.
export async function seedIfEmpty(database = db) {
  const count = await database.exercises.count()
  if (count > 0) {
    await backfill(database)
    await migrateProgram(database)
    return false
  }
  await database.transaction('rw', database.exercises, database.programDays, database.settings, async () => {
    await database.exercises.bulkAdd(exercises)
    await database.programDays.bulkAdd(programDays)
    await database.settings.bulkAdd(defaultSettings)
    await database.settings.put({ key: 'programVersion', value: PROGRAM_VERSION })
  })
  return true
}

// Moves a phone on an older program to this one (new program, October
// 2026). New exercises are added; existing ones get the current name and
// illustration only, so units, increments and rest edits stay; the days are
// replaced under the same ids, so the cycle position stays. Logged sets and
// workouts are never touched. A workout in progress would see its slots
// change under it, so the move waits for the next launch without one.
async function migrateProgram(database) {
  await database.transaction('rw', database.exercises, database.programDays, database.workouts, database.settings, async () => {
    const version = (await database.settings.get('programVersion'))?.value ?? 1
    if (version >= PROGRAM_VERSION) return
    const workouts = await database.workouts.toArray()
    if (workouts.some((w) => w.finishedAt === null)) return
    for (const seeded of exercises) {
      const stored = await database.exercises.get(seeded.id)
      if (!stored) await database.exercises.add(seeded)
      else await database.exercises.update(seeded.id, { name: seeded.name, illustration: seeded.illustration })
    }
    await database.programDays.bulkPut(programDays)
    await database.settings.put({ key: 'programVersion', value: PROGRAM_VERSION })
  })
}

async function backfill(database) {
  for (const seeded of exercises) {
    const stored = await database.exercises.get(seeded.id)
    if (stored && !stored.illustration) {
      await database.exercises.update(seeded.id, { illustration: seeded.illustration })
    }
  }
  for (const setting of defaultSettings) {
    const stored = await database.settings.get(setting.key)
    if (!stored) await database.settings.add(setting)
  }
}
