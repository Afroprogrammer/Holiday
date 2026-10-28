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

  it('backfills settings keys missing from an old backup after import', async () => {
    const parsed = parseBackup(await exportBackup(a))
    parsed.data.settings = parsed.data.settings.filter((s) => s.key !== 'restNotificationAsked')
    await importBackup(parsed.data, b)
    expect((await b.settings.get('restNotificationAsked')).value).toBe(false)
    expect((await b.settings.get('nextProgramDayId')).value).toBe('pull-a')
  })
})

describe('importing across program versions', () => {
  it('migrates a version 1 backup and keeps its history and cycle', async () => {
    const source = freshDb()
    await seedIfEmpty(source)
    await source.workouts.add({ id: 'w1', programDayId: 'pull-b', startedAt: '2026-10-09T10:00:00Z', finishedAt: '2026-10-09T11:00:00Z' })
    await source.sets.add({ id: 'd1', workoutId: 'w1', exerciseId: 'deadlift', setNumber: 1, weight: 100, unit: 'kg', reps: 5, loggedAt: '2026-10-09T10:05:00Z' })
    await source.settings.put({ key: 'nextProgramDayId', value: 'push-b' })
    await source.settings.delete('programVersion')
    await source.programDays.put({ id: 'pull-b', name: 'Pull B', order: 4, slots: [{ exerciseIds: ['deadlift'], targetSets: 3, repMin: 5, repMax: 5 }] })
    const parsed = parseBackup(await exportBackup(source))
    const target = freshDb()
    await seedIfEmpty(target)
    await importBackup(parsed.data, target)
    expect((await target.programDays.get('pull-b')).slots[0].exerciseIds).toEqual(['barbell-squat', 'hack-squat'])
    expect(await target.sets.get('d1')).toBeTruthy()
    expect((await target.settings.get('nextProgramDayId')).value).toBe('push-b')
    expect((await target.settings.get('programVersion')).value).toBe(2)
  })

  it('leaves a version 2 backup as it is', async () => {
    const source = freshDb()
    await seedIfEmpty(source)
    await source.exercises.update('barbell-squat', { restSeconds: 150, name: 'My squat' })
    const parsed = parseBackup(await exportBackup(source))
    const target = freshDb()
    await seedIfEmpty(target)
    await importBackup(parsed.data, target)
    const squat = await target.exercises.get('barbell-squat')
    expect(squat.restSeconds).toBe(150)
    expect(squat.name).toBe('My squat')
  })
})
