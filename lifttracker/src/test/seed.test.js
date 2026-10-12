import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { beforeEach, describe, expect, it } from 'vitest'
import { seedIfEmpty } from '../db/seed.js'

function freshDb() {
  const database = new Dexie(`seed-test-${Math.random()}`)
  database.version(1).stores({
    exercises: 'id, name',
    programDays: 'id, order',
    workouts: 'id, programDayId, startedAt, finishedAt',
    sets: 'id, workoutId, exerciseId, [workoutId+exerciseId], loggedAt',
    settings: 'key',
  })
  return database
}

describe('seedIfEmpty', () => {
  let database
  beforeEach(() => {
    database = freshDb()
  })

  it('seeds exercises with an illustration slug on first launch', async () => {
    expect(await seedIfEmpty(database)).toBe(true)
    const bench = await database.exercises.get('barbell-bench-press')
    expect(bench.illustration).toBe('bench-press')
  })

  it('backfills a missing illustration without touching edited fields', async () => {
    await seedIfEmpty(database)
    await database.exercises.update('barbell-bench-press', { illustration: undefined, restSeconds: 75 })
    expect(await seedIfEmpty(database)).toBe(false)
    const bench = await database.exercises.get('barbell-bench-press')
    expect(bench.illustration).toBe('bench-press')
    expect(bench.restSeconds).toBe(75)
  })
})
