// Units (prd.md, "Units"): conversion uses 1 lb = 0.45359237 kg and rounds to
// one decimal place for display only. Stored weights are never converted.

export const KG_PER_LB = 0.45359237

export function roundOne(value) {
  return Math.round(value * 10) / 10
}

// Converts a weight between kg and lb. Returns the input unchanged when the
// units match. The result is rounded to one decimal place.
export function convertWeight(weight, fromUnit, toUnit) {
  if (fromUnit === toUnit) return weight
  if (fromUnit === 'lb' && toUnit === 'kg') return roundOne(weight * KG_PER_LB)
  if (fromUnit === 'kg' && toUnit === 'lb') return roundOne(weight / KG_PER_LB)
  throw new Error(`Unknown unit conversion ${fromUnit} to ${toUnit}`)
}

export function otherUnit(unit) {
  return unit === 'kg' ? 'lb' : 'kg'
}

// "90 lb (40.8 kg)": the weight in its unit, with the other unit beside it.
export function formatWeightBoth(weight, unit) {
  const other = otherUnit(unit)
  return `${weight} ${unit} (${convertWeight(weight, unit, other)} ${other})`
}

export function incrementFor(exercise, unit) {
  return unit === 'kg' ? exercise.incrementKg : exercise.incrementLb
}
