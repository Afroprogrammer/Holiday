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
