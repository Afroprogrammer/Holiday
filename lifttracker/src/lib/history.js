// History list for the exercise settings screen: the last few finished
// sessions that contain the exercise, each as one line of sets.

export function groupSessions(sets, workouts, limit = 5) {
  const finished = workouts.filter((w) => w.finishedAt).sort((a, b) => (a.finishedAt < b.finishedAt ? 1 : -1))
  const byWorkout = new Map()
  for (const set of sets) {
    if (!byWorkout.has(set.workoutId)) byWorkout.set(set.workoutId, [])
    byWorkout.get(set.workoutId).push(set)
  }
  const sessions = []
  for (const workout of finished) {
    const own = byWorkout.get(workout.id)
    if (!own) continue
    sessions.push({ workoutId: workout.id, finishedAt: workout.finishedAt, sets: [...own].sort((a, b) => a.setNumber - b.setNumber) })
    if (sessions.length === limit) break
  }
  return sessions
}

// "60 kg × 8 · 8 · 7 · 6"; a weight or unit change starts a new group so a
// drop set reads "60 kg × 8 · 8, 57.5 kg × 6".
export function formatSession(sets) {
  if (sets.length === 0) return '–'
  const groups = []
  for (const set of sets) {
    const last = groups.at(-1)
    if (last && last.weight === set.weight && last.unit === set.unit) last.reps.push(set.reps)
    else groups.push({ weight: set.weight, unit: set.unit, reps: [set.reps] })
  }
  return groups.map((g) => `${g.weight} ${g.unit} × ${g.reps.join(' · ')}`).join(', ')
}
