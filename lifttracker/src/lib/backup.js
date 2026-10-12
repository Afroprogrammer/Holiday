// Backup file format (Android install spec, 3.5). Version 1 is the five
// Dexie tables in a JSON envelope. The running rest is never exported.

const APP = 'lifttracker'
const VERSION = 1
const TABLES = ['exercises', 'programDays', 'workouts', 'sets', 'settings']
const SET_FIELDS = ['id', 'workoutId', 'exerciseId', 'setNumber', 'weight', 'unit', 'reps']
const WORKOUT_FIELDS = ['id', 'programDayId', 'startedAt']

export function serializeBackup(tables) {
  const out = {
    app: APP,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    exercises: tables.exercises,
    programDays: tables.programDays,
    workouts: tables.workouts,
    sets: tables.sets,
    settings: tables.settings.filter((s) => s.key !== 'activeRest'),
  }
  return JSON.stringify(out, null, 2)
}

export function parseBackup(text) {
  let raw
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'Not a LiftTracker backup.' }
  }
  if (!raw || raw.app !== APP || !Number.isInteger(raw.version) || raw.version < 1) return { ok: false, reason: 'Not a LiftTracker backup.' }
  if (raw.version > VERSION) return { ok: false, reason: `Backup version ${raw.version} is newer than this app.` }
  for (const t of TABLES) {
    if (!Array.isArray(raw[t])) return { ok: false, reason: 'The file is damaged (missing tables).' }
  }
  const record = (x, fields) => x !== null && typeof x === 'object' && fields.every((f) => f in x)
  if (raw.exercises.length === 0 || !raw.exercises.every((e) => record(e, ['id']))) return { ok: false, reason: 'The file is damaged (no exercises).' }
  if (!raw.workouts.every((w) => record(w, WORKOUT_FIELDS))) return { ok: false, reason: 'The file is damaged (missing workout fields).' }
  if (!raw.sets.every((s) => record(s, SET_FIELDS))) return { ok: false, reason: 'The file is damaged (missing set fields).' }
  const finished = raw.workouts.map((w) => w.finishedAt).filter(Boolean).sort()
  const data = Object.fromEntries(TABLES.map((t) => [t, raw[t]]))
  data.settings = data.settings.filter((s) => s.key !== 'activeRest')
  return { ok: true, data, summary: { workouts: raw.workouts.length, sets: raw.sets.length, newest: finished.at(-1) ?? null } }
}

export function backupFilename(date = new Date()) {
  const iso = date.toISOString().slice(0, 10)
  return `${APP}-${iso}.json`
}
