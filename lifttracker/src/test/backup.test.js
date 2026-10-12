import { describe, expect, it } from 'vitest'
import { backupFilename, parseBackup, serializeBackup } from '../lib/backup.js'

const tables = {
  exercises: [{ id: 'dips', name: 'Dips', displayUnit: 'kg' }],
  programDays: [{ id: 'push-a', name: 'Push A', order: 1, slots: [] }],
  workouts: [{ id: 'w1', programDayId: 'push-a', startedAt: '2026-10-09T10:00:00Z', finishedAt: '2026-10-09T11:00:00Z' }],
  sets: [{ id: 's1', workoutId: 'w1', exerciseId: 'dips', setNumber: 1, weight: 0, unit: 'kg', reps: 10, loggedAt: '2026-10-09T10:05:00Z' }],
  settings: [
    { key: 'nextProgramDayId', value: 'pull-a' },
    { key: 'activeRest', value: { endsAt: 1 } },
    { key: 'someFutureKey', value: 1 },
  ],
}

describe('serializeBackup', () => {
  it('writes a versioned envelope without the active rest', () => {
    const out = JSON.parse(serializeBackup(tables))
    expect(out.app).toBe('lifttracker')
    expect(out.version).toBe(1)
    expect(out.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(out.settings.map((s) => s.key)).toEqual(['nextProgramDayId', 'someFutureKey'])
    expect(out.sets).toHaveLength(1)
  })
})

describe('parseBackup', () => {
  it('round-trips and summarises', () => {
    const r = parseBackup(serializeBackup(tables))
    expect(r.ok).toBe(true)
    expect(r.summary).toEqual({ workouts: 1, sets: 1, newest: '2026-10-09T11:00:00Z' })
    expect(r.data.settings.find((s) => s.key === 'someFutureKey').value).toBe(1)
  })
  it('refuses null entries, bad versions, and an empty exercise table without throwing', () => {
    const base = JSON.parse(serializeBackup(tables))
    expect(parseBackup(JSON.stringify({ ...base, workouts: [null] })).reason).toBe('The file is damaged (missing workout fields).')
    expect(parseBackup(JSON.stringify({ ...base, sets: [42] })).reason).toBe('The file is damaged (missing set fields).')
    expect(parseBackup(JSON.stringify({ ...base, version: '1' })).reason).toBe('Not a LiftTracker backup.')
    expect(parseBackup(JSON.stringify({ ...base, version: 0 })).reason).toBe('Not a LiftTracker backup.')
    expect(parseBackup(JSON.stringify({ ...base, exercises: [] })).reason).toBe('The file is damaged (no exercises).')
    expect(parseBackup(JSON.stringify({ ...base, exercises: [{ name: 'no id' }] })).reason).toBe('The file is damaged (no exercises).')
  })

  it('refuses junk, other apps, newer versions, and damaged sets', () => {
    expect(parseBackup('{').reason).toBe('Not a LiftTracker backup.')
    expect(parseBackup(JSON.stringify({ app: 'other', version: 1 })).reason).toBe('Not a LiftTracker backup.')
    expect(parseBackup(JSON.stringify({ ...JSON.parse(serializeBackup(tables)), version: 2 })).reason).toBe('Backup version 2 is newer than this app.')
    const damaged = JSON.parse(serializeBackup(tables))
    delete damaged.sets[0].reps
    expect(parseBackup(JSON.stringify(damaged)).reason).toBe('The file is damaged (missing set fields).')
    const noTable = JSON.parse(serializeBackup(tables))
    delete noTable.workouts
    expect(parseBackup(JSON.stringify(noTable)).reason).toBe('The file is damaged (missing tables).')
  })
})

describe('backupFilename', () => {
  it('dates the file', () => {
    expect(backupFilename(new Date('2026-10-12T15:00:00Z'))).toBe('lifttracker-2026-10-12.json')
  })
})
