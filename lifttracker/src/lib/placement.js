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

// "Push A · exercise 1" or "Push A and Push B · exercise 2".
export function placementCaption(placements) {
  if (placements.length === 0) return ''
  const days = placements.map((p) => p.dayName).join(' and ')
  return `${days} · exercise ${placements[0].index}`
}
