import { prefillForSet } from '../lib/prefill.js'
import { LoggedSetRow, OpenSetRow, PendingSetRow, SkippedSetRow } from './SetRow.jsx'

function repsText(slot) {
  return slot.repMin === slot.repMax ? `${slot.repMin} reps` : `${slot.repMin} to ${slot.repMax} reps`
}

// One card per exercise (prd.md, "Workout screen"). The header shows the
// name, target sets and reps, and the display unit. Slots with alternatives
// get a two-way toggle.
export default function ExerciseCard({
  slot,
  exercise,
  previousSets,
  loggedSets,
  skipped,
  extraSets,
  onSelectAlternative,
  onFlipUnit,
  onDone,
  onSkip,
  onAddSet,
}) {
  const totalSets = slot.targetSets + extraSets
  const rows = []
  let openShown = false
  for (let n = 1; n <= totalSets; n += 1) {
    const logged = loggedSets.find((s) => s.setNumber === n)
    const prefill = prefillForSet(previousSets, n)
    if (logged) {
      rows.push(<LoggedSetRow key={n} set={logged} slot={slot} />)
    } else if (skipped.has(n)) {
      rows.push(<SkippedSetRow key={n} setNumber={n} />)
    } else if (!openShown) {
      openShown = true
      rows.push(
        <OpenSetRow
          key={`${exercise.id}-${n}-${exercise.displayUnit}`}
          setNumber={n}
          exercise={exercise}
          prefill={prefill}
          onDone={(values) => onDone(n, values)}
        />,
      )
    } else {
      rows.push(<PendingSetRow key={n} setNumber={n} prefill={prefill} displayUnit={exercise.displayUnit} />)
    }
  }
  const firstOpen = (() => {
    for (let n = 1; n <= totalSets; n += 1) {
      if (!loggedSets.some((s) => s.setNumber === n) && !skipped.has(n)) return n
    }
    return null
  })()

  return (
    <section className="grid gap-2 rounded-xl border border-rule bg-card p-3">
      <header className="flex items-baseline justify-between gap-2">
        <h2 className="font-semibold">{exercise.name}</h2>
        <button
          type="button"
          onClick={onFlipUnit}
          aria-label={`Unit ${exercise.displayUnit}, tap to switch`}
          className="rounded border border-act px-1.5 font-num text-xs font-semibold text-act"
        >
          {exercise.displayUnit}
        </button>
      </header>
      <p className="text-sm text-ink-2">
        {slot.targetSets} sets · {repsText(slot)}
        {exercise.lowerIsBetter ? ' · assistance' : ''}
      </p>
      {slot.options.length > 1 && (
        <div className="grid grid-cols-2 overflow-hidden rounded-md border border-rule text-center text-sm">
          {slot.options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelectAlternative(option.id)}
              className={option.id === exercise.id ? 'bg-raised py-1 font-semibold' : 'py-1 text-ink-2'}
            >
              {option.name}
            </button>
          ))}
        </div>
      )}
      {rows}
      <div className="flex gap-4 text-sm text-act">
        <button type="button" onClick={onAddSet}>
          Add set
        </button>
        {firstOpen !== null && (
          <button type="button" onClick={() => onSkip(firstOpen)}>
            Skip set
          </button>
        )}
      </div>
    </section>
  )
}
