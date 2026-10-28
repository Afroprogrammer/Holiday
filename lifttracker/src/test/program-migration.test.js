import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { beforeEach, describe, expect, it } from 'vitest'
import { programDays } from '../db/program.js'
import { migrateProgram, seedIfEmpty } from '../db/seed.js'

function freshDb() {
  const database = new Dexie(`migration-test-${Math.random()}`)
  database.version(1).stores({
    exercises: 'id, name',
    programDays: 'id, order',
    workouts: 'id, programDayId, startedAt, finishedAt',
    sets: 'id, workoutId, exerciseId, [workoutId+exerciseId], loggedAt',
    settings: 'key',
  })
  return database
}

const ex = (id, name, extra = {}) => ({ id, name, category: 'compound', displayUnit: 'kg', incrementKg: 2.5, incrementLb: 5, restSeconds: 90, illustration: 'bench-press', lowerIsBetter: false, isTimeBased: false, ...extra })

// A phone on the version 1 program: the old Pull B with the deadlift, a
// custom rest on the bench press, a finished workout with deadlift sets and
// the cycle on Pull A. No programVersion key (version 1 never wrote one).
async function seedV1(database) {
  await database.exercises.bulkAdd([
    ex('barbell-bench-press', 'Barbell bench press', { restSeconds: 75, displayUnit: 'lb' }),
    ex('deadlift', 'Deadlift, conventional or Romanian', { restSeconds: 120, illustration: 'deadlift' }),
    ex('row-machine', 'Row machine, seated cable or chest-supported', { illustration: 'seated-row' }),
  ])
  await database.programDays.bulkAdd([
    { id: 'push-a', name: 'Push A', order: 1, slots: [{ exerciseIds: ['barbell-bench-press'], targetSets: 4, repMin: 5, repMax: 8 }] },
    { id: 'pull-a', name: 'Pull A', order: 2, slots: [{ exerciseIds: ['row-machine'], targetSets: 3, repMin: 8, repMax: 10 }] },
    { id: 'push-b', name: 'Push B', order: 3, slots: [{ exerciseIds: ['barbell-bench-press'], targetSets: 4, repMin: 6, repMax: 8 }] },
    { id: 'pull-b', name: 'Pull B', order: 4, slots: [{ exerciseIds: ['deadlift'], targetSets: 3, repMin: 5, repMax: 5 }] },
  ])
  await database.workouts.add({ id: 'w-old', programDayId: 'pull-b', startedAt: '2026-10-20T10:00:00Z', finishedAt: '2026-10-20T11:00:00Z' })
  await database.sets.bulkAdd([
    { id: 'd1', workoutId: 'w-old', exerciseId: 'deadlift', setNumber: 1, weight: 100, unit: 'kg', reps: 5, loggedAt: '2026-10-20T10:05:00Z' },
    { id: 'd2', workoutId: 'w-old', exerciseId: 'deadlift', setNumber: 2, weight: 100, unit: 'kg', reps: 5, loggedAt: '2026-10-20T10:08:00Z' },
  ])
  await database.settings.bulkAdd([{ key: 'nextProgramDayId', value: 'pull-a' }])
}

describe('program migration to version 2', () => {
  let database
  beforeEach(() => {
    database = freshDb()
  })

  it('writes version 2 on a fresh install', async () => {
    expect(await seedIfEmpty(database)).toBe(true)
    expect((await database.settings.get('programVersion')).value).toBe(2)
    expect((await database.programDays.get('pull-b')).slots[0].exerciseIds).toEqual(['barbell-squat', 'hack-squat'])
  })

  it('replaces the days, keeps history, edits and the cycle position', async () => {
    await seedV1(database)
    await seedIfEmpty(database)
    const days = await database.programDays.orderBy('order').toArray()
    expect(days).toEqual(programDays)
    const bench = await database.exercises.get('barbell-bench-press')
    expect(bench.restSeconds).toBe(75)
    expect(bench.displayUnit).toBe('lb')
    expect((await database.exercises.get('row-machine')).name).toBe('Row machine, chest-supported')
    expect(await database.exercises.get('barbell-squat')).toBeTruthy()
    expect(await database.exercises.get('deadlift')).toBeTruthy()
    expect(await database.sets.where('exerciseId').equals('deadlift').count()).toBe(2)
    expect(await database.workouts.get('w-old')).toBeTruthy()
    expect((await database.settings.get('nextProgramDayId')).value).toBe('pull-a')
    expect((await database.settings.get('programVersion')).value).toBe(2)
  })

  it('waits while a workout is in progress, then runs once', async () => {
    await seedV1(database)
    await database.workouts.add({ id: 'w-live', programDayId: 'pull-b', startedAt: '2026-10-28T10:00:00Z', finishedAt: null })
    await seedIfEmpty(database)
    expect((await database.programDays.get('pull-b')).slots[0].exerciseIds).toEqual(['deadlift'])
    expect(await database.settings.get('programVersion')).toBeUndefined()
    await database.workouts.update('w-live', { finishedAt: '2026-10-28T11:00:00Z' })
    await seedIfEmpty(database)
    expect((await database.programDays.get('pull-b')).slots[0].exerciseIds).toEqual(['barbell-squat', 'hack-squat'])
    await database.exercises.update('barbell-squat', { restSeconds: 150 })
    await seedIfEmpty(database)
    expect((await database.exercises.get('barbell-squat')).restSeconds).toBe(150)
  })
  it('migrates once the workout ends, without another launch', async () => {
    await seedV1(database)
    await database.workouts.add({ id: 'w-live', programDayId: 'pull-b', startedAt: '2026-10-28T10:00:00Z', finishedAt: null })
    await seedIfEmpty(database)
    await database.workouts.update('w-live', { finishedAt: '2026-10-28T11:00:00Z' })
    await migrateProgram(database)
    expect((await database.programDays.get('pull-b')).slots[0].exerciseIds).toEqual(['barbell-squat', 'hack-squat'])
  })
})
