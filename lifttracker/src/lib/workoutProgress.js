import { prefillForSet, rangeMarker } from './prefill.js'
import { convertWeight } from './units.js'

// Pure view logic for the workout screen. The screen passes the current
// exercise per slot (after alternative selection), this module decides which
// set is open, what each row shows, and the header count.

export function buildPlan(entries, loggedSets, skipped, extra, focusExerciseId = null) {
  const exercises = entries.map(({ exercise, slot, previousSets }) => {
    const skippedSet = skipped[exercise.id] ?? new Set()
    const own = loggedSets.filter((s) => s.exerciseId === exercise.id).sort((a, b) => a.setNumber - b.setNumber)
    // Added sets live in screen state, so after the app is reopened the
    // logged set numbers decide how many rows exist.
    const total = Math.max(slot.targetSets + (extra[exercise.id] ?? 0), own.at(-1)?.setNumber ?? 0)
    // With no previous session, the latest set logged for this exercise
    // today stands in as the prefill, so a first workout still needs only
    // Done per set. `last` stays strictly previous-session history.
    const todayFallback = own.length > 0 ? { weight: own.at(-1).weight, unit: own.at(-1).unit, reps: own.at(-1).reps } : null
    const rows = []
    for (let n = 1; n <= total; n += 1) {
      const set = loggedSets.find((s) => s.exerciseId === exercise.id && s.setNumber === n)
      const last = prefillForSet(previousSets, n)
      const prefill = last ?? todayFallback
      if (set) rows.push({ n, status: 'logged', set, prefill, last, marker: rangeMarker(set.reps, slot.repMin, slot.repMax) })
      else if (skippedSet.has(n)) rows.push({ n, status: 'skipped', prefill, last })
      else rows.push({ n, status: 'pending', prefill, last })
    }
    const remaining = rows.filter((r) => r.status === 'pending').length
    return { exercise, slot, total, remaining, rows }
  })

  let openIndex = exercises.findIndex((e) => e.exercise.id === focusExerciseId && e.remaining > 0)
  if (openIndex === -1) openIndex = exercises.findIndex((e) => e.remaining > 0)
  if (openIndex !== -1) {
    const row = exercises[openIndex].rows.find((r) => r.status === 'pending')
    row.status = 'open'
  }

  const done = exercises.reduce((sum, e) => sum + e.rows.filter((r) => r.status === 'logged').length, 0)
  const total = exercises.reduce((sum, e) => sum + e.rows.filter((r) => r.status !== 'skipped').length, 0)
  return { exercises, done, total }
}

export function activePosition(plan) {
  for (const [exerciseIndex, e] of plan.exercises.entries()) {
    const row = e.rows.find((r) => r.status === 'open')
    if (row) return { exerciseIndex, setNumber: row.n }
  }
  return null
}

// "Dips, bodyweight or assisted" → "Dips". The qualifier is for settings.
export function shortName(name) {
  return name.split(',')[0].trim()
}

function describeRuns(numbers) {
  const runs = []
  for (const n of numbers) {
    const last = runs.at(-1)
    if (last && last.end === n - 1) last.end = n
    else runs.push({ start: n, end: n })
  }
  const parts = runs.map((r) => (r.start === r.end ? `${r.start}` : r.end === r.start + 1 ? `${r.start} and ${r.end}` : `${r.start} to ${r.end}`))
  if (parts.length <= 1) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`
}

// "5 sets not logged: dips 2 and 3, weighted cable crunch 1 to 3. They stay unlogged."
export function remainingSentence(plan) {
  const groups = plan.exercises
    .map((e) => ({ name: shortName(e.exercise.name).toLowerCase(), numbers: e.rows.filter((r) => r.status !== 'logged' && r.status !== 'skipped').map((r) => r.n) }))
    .filter((g) => g.numbers.length > 0)
  const count = groups.reduce((sum, g) => sum + g.numbers.length, 0)
  if (count === 0) return ''
  const list = groups.map((g) => `${g.name} ${describeRuns(g.numbers)}`).join(', ')
  return count === 1 ? `1 set not logged: ${list}. It stays unlogged.` : `${count} sets not logged: ${list}. They stay unlogged.`
}

// The "last" value for a set. When the display unit was flipped since the
// previous session the stored value is shown converted and marked.
export function lastTimeText(prefill, displayUnit) {
  if (!prefill) return '–'
  const weight =
    prefill.unit === displayUnit
      ? `${prefill.weight} ${prefill.unit}`
      : `${prefill.weight} ${prefill.unit} (${convertWeight(prefill.weight, prefill.unit, displayUnit)} ${displayUnit})`
  return `${weight} × ${prefill.reps}`
}

// "00:14" since the workout started. Minutes are not capped at 59.
export function formatElapsed(startedAtIso, nowMs = Date.now()) {
  const total = Math.max(0, Math.floor((nowMs - new Date(startedAtIso).getTime()) / 1000))
  const m = String(Math.floor(total / 60)).padStart(2, '0')
  const s = String(total % 60).padStart(2, '0')
  return `${m}:${s}`
}
