// Day order cycles Push A, Pull A, Push B, Pull B, based on the last
// completed day, not the calendar (prd.md, "The program").

// Returns the program day that follows `programDayId` in cycle order.
// With no completed day yet, or an id that isn't in the program, the cycle
// starts at the first day.
export function nextProgramDayAfter(programDayId, programDays) {
  const ordered = [...programDays].sort((a, b) => a.order - b.order)
  if (ordered.length === 0) return null
  const index = ordered.findIndex((d) => d.id === programDayId)
  if (index === -1) return ordered[0]
  return ordered[(index + 1) % ordered.length]
}
