// Text-field sanitising for the steppers. Reps are whole numbers; weights
// keep one decimal point. Pure, so both Stepper and SetEditor share it.
export function sanitize(text, integer = false) {
  const digits = integer ? text.replace(/[^0-9]/g, '') : text.replace(/[^0-9.]/g, '')
  if (integer) return digits
  const first = digits.indexOf('.')
  if (first === -1) return digits
  return digits.slice(0, first + 1) + digits.slice(first + 1).replace(/\./g, '')
}

// Number for arithmetic: '' and '.' are 0, '5.' is 5.
export function toNumber(text) {
  const n = Number(text)
  return Number.isFinite(n) ? n : 0
}
