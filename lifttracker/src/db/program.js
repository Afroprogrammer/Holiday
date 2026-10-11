// The fixed 4-day program, copied from the tables in prd.md ("The program").
// Rest times are starting defaults. Every exercise's rest time is editable.
// Increments: 2.5 kg on kilogram equipment, 5 lb on pound equipment ("Units").

export const KG = 'kg'
export const LB = 'lb'

const exercise = (id, name, category, displayUnit, restSeconds, extra = {}) => ({
  id,
  name,
  category,
  displayUnit,
  incrementKg: 2.5,
  incrementLb: 5,
  restSeconds,
  lowerIsBetter: false,
  isTimeBased: false,
  ...extra,
})

export const exercises = [
  // Push A
  exercise('barbell-bench-press', 'Barbell bench press', 'compound', KG, 90),
  exercise('machine-chest-press', 'Machine chest press', 'isolation', KG, 60),
  exercise('dumbbell-shoulder-press', 'Dumbbell shoulder press', 'compound', LB, 90),
  exercise('dips', 'Dips, bodyweight or assisted', 'compound', KG, 90),
  exercise('weighted-cable-crunch', 'Weighted cable crunch', 'core', KG, 60),
  // Pull A
  exercise('assisted-pull-ups', 'Assisted pull-ups', 'compound', KG, 90, { lowerIsBetter: true }),
  exercise('row-machine', 'Row machine, seated cable or chest-supported', 'isolation', KG, 60),
  exercise('barbell-shrugs', 'Barbell shrugs', 'isolation', KG, 60),
  exercise('dumbbell-shrugs', 'Dumbbell shrugs', 'isolation', LB, 60),
  exercise('barbell-curls', 'Barbell curls', 'isolation', KG, 60),
  exercise('dumbbell-curls', 'Dumbbell curls', 'isolation', LB, 60),
  exercise('hanging-knee-raises', 'Hanging knee raises', 'core', KG, 60),
  exercise('cable-woodchoppers', 'Cable woodchoppers', 'core', KG, 60),
  // Push B (machine chest press is shared with Push A)
  exercise('incline-dumbbell-press', 'Incline dumbbell press', 'compound', LB, 90),
  exercise('barbell-overhead-press', 'Barbell overhead press', 'compound', KG, 90),
  exercise('tricep-pushdowns', 'Tricep pushdowns, cable', 'isolation', KG, 60),
  exercise('weighted-decline-sit-ups', 'Weighted decline sit-ups', 'core', KG, 60),
  // Pull B
  exercise('deadlift', 'Deadlift, conventional or Romanian', 'compound', KG, 120),
  exercise('lat-pulldown', 'Lat pulldown', 'isolation', KG, 60),
  exercise('barbell-bent-over-row', 'Barbell bent-over row', 'compound', KG, 90),
  exercise('heavy-dumbbell-shrugs', 'Heavy dumbbell shrugs', 'isolation', LB, 60),
  exercise('machine-ab-crunch', 'Machine ab crunch', 'core', KG, 60),
]

const slot = (exerciseIds, targetSets, repMin, repMax) => ({
  exerciseIds,
  targetSets,
  repMin,
  repMax,
})

export const programDays = [
  {
    id: 'push-a',
    name: 'Push A',
    order: 1,
    slots: [
      slot(['barbell-bench-press'], 4, 5, 8),
      slot(['machine-chest-press'], 3, 8, 10),
      slot(['dumbbell-shoulder-press'], 3, 8, 10),
      slot(['dips'], 3, 8, 12),
      slot(['weighted-cable-crunch'], 3, 10, 12),
    ],
  },
  {
    id: 'pull-a',
    name: 'Pull A',
    order: 2,
    slots: [
      slot(['assisted-pull-ups'], 4, 6, 8),
      slot(['row-machine'], 3, 8, 10),
      slot(['barbell-shrugs', 'dumbbell-shrugs'], 4, 10, 12),
      slot(['barbell-curls', 'dumbbell-curls'], 3, 8, 10),
      slot(['hanging-knee-raises', 'cable-woodchoppers'], 3, 10, 12),
    ],
  },
  {
    id: 'push-b',
    name: 'Push B',
    order: 3,
    slots: [
      slot(['incline-dumbbell-press'], 4, 6, 8),
      slot(['machine-chest-press'], 3, 8, 10),
      slot(['barbell-overhead-press'], 3, 6, 8),
      slot(['tricep-pushdowns'], 3, 10, 12),
      slot(['weighted-decline-sit-ups'], 3, 10, 12),
    ],
  },
  {
    id: 'pull-b',
    name: 'Pull B',
    order: 4,
    slots: [
      slot(['deadlift'], 3, 5, 5),
      slot(['lat-pulldown'], 4, 8, 10),
      slot(['barbell-bent-over-row'], 3, 6, 8),
      slot(['heavy-dumbbell-shrugs'], 3, 10, 12),
      slot(['machine-ab-crunch'], 3, 12, 12),
    ],
  },
]

// Global defaults for new exercises ("Rest timer", third bullet).
export const defaultSettings = [
  { key: 'defaultRestCompoundSeconds', value: 90 },
  { key: 'defaultRestIsolationSeconds', value: 60 },
  { key: 'nextProgramDayId', value: 'push-a' },
  { key: 'firstRunShown', value: false },
]
