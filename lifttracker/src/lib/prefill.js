// Prefill (prd.md, "Prefill"): for each set number of an exercise, the
// prefill is the weight and reps from the most recent finished workout that
// contains that exercise and set number. If the previous session had fewer
// sets, the missing set numbers prefill from the last set that exists.
//
// `previousSets` are that session's sets for the exercise, in any order.
// Returns { weight, unit, reps } or null when there is no history.
export function prefillForSet(previousSets, setNumber) {
  if (!previousSets || previousSets.length === 0) return null
  const sorted = [...previousSets].sort((a, b) => a.setNumber - b.setNumber)
  const exact = sorted.find((s) => s.setNumber === setNumber)
  const source = exact ?? sorted[sorted.length - 1]
  return { weight: source.weight, unit: source.unit, reps: source.reps }
}

// Marker for a completed set row (prd.md, "Workout screen"): shown when the
// logged reps are above the top of the target range or below the bottom.
export function rangeMarker(reps, repMin, repMax) {
  if (reps > repMax) return { kind: 'above', bound: repMax }
  if (reps < repMin) return { kind: 'below', bound: repMin }
  return null
}
