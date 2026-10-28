import { setsText } from './workoutProgress.js'

// Where an exercise sits in the program, for the exercise settings caption.
export function exercisePlacements(exerciseId, programDays) {
  const out = []
  for (const day of [...programDays].sort((a, b) => a.order - b.order)) {
    day.slots.forEach((slot, i) => {
      if (slot.exerciseIds.includes(exerciseId)) out.push({ dayName: day.name, index: i + 1 })
    })
  }
  return out
}

// "Push A · exercise 1", "Push A and Push B · exercise 2", or, when the
// position differs by day, "Push A · exercise 5, Push B · exercise 3".
export function placementCaption(placements) {
  if (placements.length === 0) return ''
  if (placements.every((p) => p.index === placements[0].index)) {
    return `${placements.map((p) => p.dayName).join(' and ')} · exercise ${placements[0].index}`
  }
  return placements.map((p) => `${p.dayName} · exercise ${p.index}`).join(', ')
}

function slotTargets(slot) {
  const reps = slot.repMin === slot.repMax ? `${slot.repMin}` : `${slot.repMin}–${slot.repMax}`
  return `${setsText(slot)} · ${reps} reps`
}

// "3–4 sets · 5–8 reps" when every day uses the exercise the same way,
// else one target per day ("Push A 3 sets · 12–15 reps, Push B …").
export function targetsCaption(exerciseId, programDays) {
  const uses = []
  for (const day of [...programDays].sort((a, b) => a.order - b.order)) {
    for (const slot of day.slots) if (slot.exerciseIds.includes(exerciseId)) uses.push({ dayName: day.name, text: slotTargets(slot) })
  }
  if (uses.length === 0) return ''
  if (uses.every((u) => u.text === uses[0].text)) return uses[0].text
  return uses.map((u) => `${u.dayName} ${u.text}`).join(', ')
}
