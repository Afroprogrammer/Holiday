// The 4-day program, copied from the tables in prd.md ("The program").
// Rest times are starting defaults. Every exercise's rest time is editable.
// Increments: 2.5 kg on kilogram equipment, 5 lb on pound equipment ("Units").

export const KG = 'kg'
export const LB = 'lb'

const exercise = (id, name, category, displayUnit, restSeconds, illustration, extra = {}) => ({
  id,
  name,
  category,
  displayUnit,
  incrementKg: 2.5,
  incrementLb: 5,
  restSeconds,
  illustration,
  lowerIsBetter: false,
  isTimeBased: false,
  ...extra,
})

// Version of the program below. Phones on an older version are migrated
// once on launch (seed.js), keeping every logged set and exercise edit.
export const PROGRAM_VERSION = 2

// Franklin's October 2026 program, in his order: main lift first, the
// finisher fifth, core last. Rest times are starting defaults.
const programExercises = [
  // Push A
  exercise('barbell-bench-press', 'Barbell bench press', 'compound', KG, 90, 'bench-press'),
  exercise('pec-fly-machine', 'Pec fly machine', 'isolation', KG, 60, 'pec-deck'),
  exercise('machine-shoulder-press', 'Shoulder press machine', 'compound', KG, 90, 'machine-shoulder-press'),
  exercise('dips', 'Dips, bodyweight or assisted', 'compound', KG, 90, 'dip'),
  exercise('cable-lateral-raise', 'Cable side lateral raise', 'isolation', KG, 60, 'cable-lateral-raise'),
  exercise('cable-woodchoppers', 'Cable woodchoppers', 'core', KG, 60, 'cable-woodchop'),
  // Pull A
  exercise('assisted-pull-ups', 'Assisted pull-ups', 'compound', KG, 90, 'assisted-pull-up', { lowerIsBetter: true }),
  exercise('row-machine', 'Row machine, chest-supported', 'isolation', KG, 60, 'seated-row'),
  exercise('barbell-shrugs', 'Barbell shrugs', 'isolation', KG, 60, 'shrug'),
  exercise('dumbbell-shrugs', 'Dumbbell shrugs', 'isolation', LB, 60, 'dumbbell-shrug'),
  exercise('cable-curls', 'Cable curls', 'isolation', KG, 60, 'cable-curl'),
  exercise('dumbbell-curls', 'Dumbbell curls', 'isolation', LB, 60, 'bicep-curl'),
  exercise('reverse-pec-fly', 'Reverse pec fly machine', 'isolation', KG, 60, 'reverse-pec-deck'),
  exercise('face-pulls', 'Cable face pulls', 'isolation', KG, 60, 'face-pull'),
  exercise('weighted-decline-sit-ups', 'Decline sit-ups, bodyweight or weighted', 'core', KG, 60, 'decline-sit-up'),
  // Push B (machine chest press; the lateral raise is shared with Push A)
  exercise('incline-dumbbell-press', 'Incline dumbbell press', 'compound', LB, 90, 'incline-dumbbell-press'),
  exercise('machine-chest-press', 'Machine chest press', 'isolation', KG, 60, 'machine-chest-press'),
  exercise('tricep-pushdowns', 'Tricep pushdowns, cable', 'isolation', KG, 60, 'tricep-pushdown'),
  exercise('overhead-cable-tricep-extension', 'Overhead cable tricep extension', 'isolation', KG, 60, 'overhead-tricep-extension'),
  exercise('weighted-cable-crunch', 'Weighted cable crunch', 'core', KG, 60, 'cable-crunch'),
  // Pull B (squat focus)
  exercise('barbell-squat', 'Barbell squat', 'compound', KG, 120, 'squat'),
  exercise('hack-squat', 'Hack squat', 'compound', KG, 120, 'hack-squat'),
  exercise('lat-pulldown', 'Lat pulldown', 'isolation', KG, 60, 'lat-pulldown'),
  exercise('seated-cable-row', 'Seated cable row', 'compound', KG, 90, 'seated-row'),
  exercise('heavy-dumbbell-shrugs', 'Heavy dumbbell shrugs', 'isolation', LB, 60, 'dumbbell-shrug'),
  exercise('dumbbell-hammer-curls', 'Hammer curls, dumbbell', 'isolation', LB, 60, 'hammer-curl'),
  exercise('cable-hammer-curls', 'Hammer curls, cable rope', 'isolation', KG, 60, 'rope-hammer-curl'),
  exercise('machine-ab-crunch', 'Machine ab crunch', 'core', KG, 60, 'weighted-crunch'),
]

// Exercises from the version 1 program that the new one dropped. Their
// records stay so logged sets keep a name, history and illustration.
export const retiredExercises = [
  exercise('dumbbell-shoulder-press', 'Dumbbell shoulder press', 'compound', LB, 90, 'seated-dumbbell-press'),
  exercise('barbell-curls', 'Barbell curls', 'isolation', KG, 60, 'bicep-curl'),
  exercise('hanging-knee-raises', 'Hanging knee raises', 'core', KG, 60, 'hanging-knee-raise'),
  exercise('barbell-overhead-press', 'Barbell overhead press', 'compound', KG, 90, 'overhead-press'),
  exercise('deadlift', 'Deadlift, conventional or Romanian', 'compound', KG, 120, 'deadlift'),
  exercise('barbell-bent-over-row', 'Barbell bent-over row', 'compound', KG, 90, 'barbell-row'),
]

export const exercises = [...programExercises, ...retiredExercises]

// `setsMax` is the top of a range like "3–4 sets": the plan counts
// `targetSets` and Add set covers the rest. `finisher` marks the day's
// optional finisher, counted like any other exercise.
const slot = (exerciseIds, targetSets, repMin, repMax, extra = {}) => ({
  exerciseIds,
  targetSets,
  repMin,
  repMax,
  ...extra,
})

export const programDays = [
  {
    id: 'push-a',
    name: 'Push A',
    order: 1,
    slots: [
      slot(['barbell-bench-press'], 3, 5, 8, { setsMax: 4 }),
      slot(['pec-fly-machine'], 3, 10, 12),
      slot(['machine-shoulder-press'], 3, 8, 10),
      slot(['dips'], 3, 8, 10),
      slot(['cable-lateral-raise'], 3, 12, 15, { finisher: true, note: 'Drop set on the last set' }),
      slot(['cable-woodchoppers'], 2, 10, 12, { setsMax: 3 }),
    ],
  },
  {
    id: 'pull-a',
    name: 'Pull A',
    order: 2,
    slots: [
      slot(['assisted-pull-ups'], 4, 6, 8),
      slot(['row-machine'], 3, 8, 10),
      slot(['barbell-shrugs', 'dumbbell-shrugs'], 3, 10, 12),
      slot(['cable-curls', 'dumbbell-curls'], 3, 8, 10),
      slot(['reverse-pec-fly', 'face-pulls'], 3, 12, 15, { finisher: true }),
      slot(['weighted-decline-sit-ups'], 2, 10, 12, { setsMax: 3 }),
    ],
  },
  {
    id: 'push-b',
    name: 'Push B',
    order: 3,
    slots: [
      slot(['incline-dumbbell-press'], 3, 6, 8, { setsMax: 4 }),
      slot(['machine-chest-press'], 3, 8, 10),
      slot(['cable-lateral-raise'], 3, 10, 12),
      slot(['tricep-pushdowns'], 3, 10, 12),
      slot(['overhead-cable-tricep-extension'], 2, 12, 15, { finisher: true }),
      slot(['weighted-cable-crunch'], 2, 10, 12, { setsMax: 3 }),
    ],
  },
  {
    id: 'pull-b',
    name: 'Pull B',
    order: 4,
    slots: [
      slot(['barbell-squat', 'hack-squat'], 3, 6, 8, { setsMax: 4, note: 'Controlled depth, light to moderate' }),
      slot(['lat-pulldown'], 4, 8, 10),
      slot(['seated-cable-row'], 3, 8, 10),
      slot(['heavy-dumbbell-shrugs'], 3, 10, 12),
      slot(['dumbbell-hammer-curls', 'cable-hammer-curls'], 2, 10, 12, { setsMax: 3, finisher: true }),
      slot(['machine-ab-crunch'], 2, 12, 15, { setsMax: 3 }),
    ],
  },
]

// Global defaults for new installs ("Rest timer", third bullet; Android
// install spec, sections 3.1 and 3.2). Missing keys are backfilled on launch.
export const defaultSettings = [
  { key: 'defaultRestCompoundSeconds', value: 90 },
  { key: 'defaultRestIsolationSeconds', value: 60 },
  { key: 'nextProgramDayId', value: 'push-a' },
  { key: 'firstRunShown', value: false },
  { key: 'keepScreenOn', value: true },
  { key: 'restNotification', value: true },
  { key: 'restNotificationAsked', value: false },
]
