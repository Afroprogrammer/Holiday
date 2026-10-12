import { db } from './db.js'

// Settings (prd.md, "Settings"): default rest durations for compound and
// isolation work, per-exercise overrides (display unit, increment, rest
// duration), and a Reset cycle action that sets the next day explicitly.

export const DEFAULT_REST_KEYS = {
  compound: 'defaultRestCompoundSeconds',
  isolation: 'defaultRestIsolationSeconds',
}

export async function getSetting(key) {
  const row = await db.settings.get(key)
  return row?.value
}

export async function setSetting(key, value) {
  await db.settings.put({ key, value })
}

export async function getExercisesByName() {
  return db.exercises.orderBy('name').toArray()
}

export async function getExercise(id) {
  return db.exercises.get(id)
}

// Per-exercise overrides are saved permanently on the exercise record.
export async function updateExercise(id, patch) {
  await db.exercises.update(id, patch)
}

export async function resetCycle(programDayId) {
  await setSetting('nextProgramDayId', programDayId)
}
