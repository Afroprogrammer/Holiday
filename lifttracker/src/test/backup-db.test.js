import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { beforeEach, describe, expect, it } from 'vitest'
import { exportBackup, importBackup } from '../db/backup.js'
import { seedIfEmpty } from '../db/seed.js'
import { parseBackup } from '../lib/backup.js'

function freshDb() {
  const database = new Dexie(`backup-test-${Math.random()}`)
  database.version(1).stores({
    exercises: 'id, name',
    programDays: 'id, order',
    workouts: 'id, programDayId, startedAt, finishedAt',
    sets: 'id, workoutId, exerciseId, [workoutId+exerciseId], loggedAt',
    settings: 'key',
  })
  return database
}

describe('backup round trip', () => {
  let a
  let b
  beforeEach(async () => {
    a = freshDb()
    b = freshDb()
    await seedIfEmpty(a)
    await seedIfEmpty(b)
    await a.workouts.add({ id: 'w1', programDayId: 'push-a', startedAt: '2026-10-09T10:00:00Z', finishedAt: '2026-10-09T11:00:00Z' })
    await a.sets.add({ id: 's1', workoutId: 'w1', exerciseId: 'barbell-bench-press', setNumber: 1, weight: 60, unit: 'kg', reps: 8, loggedAt: '2026-10-09T10:05:00Z' })
    await a.settings.put({ key: 'nextProgramDayId', value: 'pull-a' })
    await a.exercises.update('barbell-bench-press', { restSeconds: 75 })
  })

  it('moves history, settings and overrides to another database', async () => {
    const text = await exportBackup(a)
    const parsed = parseBackup(text)
    expect(parsed.ok).toBe(true)
    await importBackup(parsed.data, b)
    expect(await b.workouts.count()).toBe(1)
    expect(await b.sets.count()).toBe(1)
    expect((await b.settings.get('nextProgramDayId')).value).toBe('pull-a')
    expect((await b.exercises.get('barbell-bench-press')).restSeconds).toBe(75)
  })

  it('restores illustration slugs missing from an old backup', async () => {
    const parsed = parseBackup(await exportBackup(a))
    parsed.data.exercises = parsed.data.exercises.map(({ illustration: _dropped, ...rest }) => rest)
    await importBackup(parsed.data, b)
    expect((await b.exercises.get('barbell-bench-press')).illustration).toBe('bench-press')
  })

  it('refuses while a workout is active', async () => {
    await b.workouts.add({ id: 'w2', programDayId: 'push-a', startedAt: '2026-10-12T10:00:00Z', finishedAt: null })
    await expect(exportBackup(b)).rejects.toThrow('Finish the active workout first.')
    const parsed = parseBackup(await exportBackup(a))
    await expect(importBackup(parsed.data, b)).rejects.toThrow('Finish the active workout first.')
    expect(await b.workouts.count()).toBe(1)
  })
})
