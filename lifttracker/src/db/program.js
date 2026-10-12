// The fixed 4-day program, copied from the tables in prd.md ("The program").
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

export const exercises = [
  // Push A
  exercise('barbell-bench-press', 'Barbell bench press', 'compound', KG, 90, 'bench-press'),
  exercise('machine-chest-press', 'Machine chest press', 'isolation', KG, 60, 'machine-chest-press'),
  exercise('dumbbell-shoulder-press', 'Dumbbell shoulder press', 'compound', LB, 90, 'seated-dumbbell-press'),
  exercise('dips', 'Dips, bodyweight or assisted', 'compound', KG, 90, 'dip'),
  exercise('weighted-cable-crunch', 'Weighted cable crunch', 'core', KG, 60, 'cable-crunch'),
  // Pull A
  exercise('assisted-pull-ups', 'Assisted pull-ups', 'compound', KG, 90, 'assisted-pull-up', { lowerIsBetter: true }),
  exercise('row-machine', 'Row machine, seated cable or chest-supported', 'isolation', KG, 60, 'seated-row'),
  exercise('barbell-shrugs', 'Barbell shrugs', 'isolation', KG, 60, 'shrug'),
  exercise('dumbbell-shrugs', 'Dumbbell shrugs', 'isolation', LB, 60, 'dumbbell-shrug'),
  exercise('barbell-curls', 'Barbell curls', 'isolation', KG, 60, 'bicep-curl'),
  exercise('dumbbell-curls', 'Dumbbell curls', 'isolation', LB, 60, 'bicep-curl'),
  exercise('hanging-knee-raises', 'Hanging knee raises', 'core', KG, 60, 'hanging-knee-raise'),
  exercise('cable-woodchoppers', 'Cable woodchoppers', 'core', KG, 60, 'cable-woodchop'),
  // Push B (machine chest press is shared with Push A)
  exercise('incline-dumbbell-press', 'Incline dumbbell press', 'compound', LB, 90, 'incline-dumbbell-press'),
  exercise('barbell-overhead-press', 'Barbell overhead press', 'compound', KG, 90, 'overhead-press'),
  exercise('tricep-pushdowns', 'Tricep pushdowns, cable', 'isolation', KG, 60, 'tricep-pushdown'),
  exercise('weighted-decline-sit-ups', 'Weighted decline sit-ups', 'core', KG, 60, 'decline-sit-up'),
  // Pull B
  exercise('deadlift', 'Deadlift, conventional or Romanian', 'compound', KG, 120, 'deadlift'),
  exercise('lat-pulldown', 'Lat pulldown', 'isolation', KG, 60, 'lat-pulldown'),
  exercise('barbell-bent-over-row', 'Barbell bent-over row', 'compound', KG, 90, 'barbell-row'),
  exercise('heavy-dumbbell-shrugs', 'Heavy dumbbell shrugs', 'isolation', LB, 60, 'dumbbell-shrug'),
  exercise('machine-ab-crunch', 'Machine ab crunch', 'core', KG, 60, 'weighted-crunch'),
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
