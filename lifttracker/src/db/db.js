import Dexie from 'dexie'

// Collections and fields follow the "Data model" section of prd.md.
// Weights are stored exactly as entered, with their unit. Nothing is converted.
export const db = new Dexie('lifttracker')

db.version(1).stores({
  exercises: 'id, name',
  programDays: 'id, order',
  workouts: 'id, programDayId, startedAt, finishedAt',
  sets: 'id, workoutId, exerciseId, [workoutId+exerciseId], loggedAt',
  settings: 'key',
})
