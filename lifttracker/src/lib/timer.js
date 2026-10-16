// Rest timer (prd.md, "Rest timer"). The timer stores the end timestamp
// rather than a running counter, so it keeps counting if the screen locks or
// the app is backgrounded. At zero it shows elapsed overtime.

export function startRest({ exerciseId, exerciseName, restSeconds, setId = null }, now = Date.now()) {
  return {
    exerciseId,
    exerciseName,
    setId,
    durationSeconds: restSeconds,
    startedAt: now,
    endsAt: now + restSeconds * 1000,
  }
}

// Plus or minus 15 seconds on the running timer affects the current rest only.
export function adjustRest(rest, deltaSeconds) {
  return {
    ...rest,
    durationSeconds: Math.max(0, rest.durationSeconds + deltaSeconds),
    endsAt: rest.endsAt + deltaSeconds * 1000,
  }
}

// Seconds left, rounded up. Negative once the rest is over: that's overtime.
export function remainingSeconds(rest, now = Date.now()) {
  return Math.ceil((rest.endsAt - now) / 1000)
}

// "1:30" while counting down, "+0:12" in overtime.
export function formatCountdown(seconds) {
  const over = seconds < 0
  const total = Math.abs(seconds)
  const m = Math.floor(total / 60)
  const s = String(total % 60).padStart(2, '0')
  return `${over ? '+' : ''}${m}:${s}`
}

// Share of the rest already elapsed, for the progress bar. Clamped to [0, 1]
// so overtime keeps the bar full.
export function progressFraction(rest, now = Date.now()) {
  if (rest.durationSeconds <= 0) return 1
  const elapsed = (now - rest.startedAt) / 1000
  return Math.min(1, Math.max(0, elapsed / rest.durationSeconds))
}
