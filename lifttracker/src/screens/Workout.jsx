import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import ExerciseCard from '../components/ExerciseCard.jsx'
import RestDock from '../components/RestDock.jsx'
import { finishWorkout, getActiveRest, getWorkoutView, logSet, saveActiveRest, setDisplayUnit } from '../db/workouts.js'
import { adjustRest, startRest } from '../lib/timer.js'
import { otherUnit } from '../lib/units.js'
import { formatClockTime } from '../lib/format.js'

// Picks which alternative a slot shows today: the one already logged in this
// workout, else the one with the most recent history, else the first.
function defaultExerciseId(slot, loggedSets) {
  for (const option of slot.options) {
    if (loggedSets.some((s) => s.exerciseId === option.id)) return option.id
  }
  let best = null
  for (const option of slot.options) {
    const sets = slot.previousBy[option.id]
    if (sets.length === 0) continue
    const latest = sets.map((s) => s.loggedAt).sort().at(-1)
    if (!best || latest > best.latest) best = { id: option.id, latest }
  }
  return best?.id ?? slot.options[0].id
}

export default function Workout({ workoutId, onFinished }) {
  const view = useLiveQuery(() => getWorkoutView(workoutId), [workoutId])
  const rest = useLiveQuery(getActiveRest)
  const [chosen, setChosen] = useState({})
  const [skipped, setSkipped] = useState({})
  const [extra, setExtra] = useState({})

  if (view === undefined || rest === undefined) return null
  if (view === null) return null
  const { workout, day, slots, loggedSets } = view

  const exerciseFor = (slot, index) => {
    const id = chosen[index] ?? defaultExerciseId(slot, loggedSets)
    return slot.options.find((o) => o.id === id)
  }

  let remaining = 0
  for (const [index, slot] of slots.entries()) {
    const exercise = exerciseFor(slot, index)
    const done = loggedSets.filter((s) => s.exerciseId === exercise.id).length
    const skippedCount = (skipped[exercise.id] ?? new Set()).size
    remaining += Math.max(0, slot.targetSets + (extra[exercise.id] ?? 0) - done - skippedCount)
  }

  const finish = async () => {
    if (remaining > 0) {
      const ok = window.confirm(`${remaining} ${remaining === 1 ? 'set remains' : 'sets remain'}. Finish anyway?`)
      if (!ok) return
    }
    await saveActiveRest(null)
    await finishWorkout(workout.id)
    onFinished?.()
  }

  return (
    <main className={`flex min-h-dvh flex-col gap-3 p-4 ${rest ? 'pb-44' : ''}`}>
      <header className="flex items-baseline justify-between">
        <span className="font-num text-2xl font-semibold">{day.name}</span>
        <span className="text-ink-2">Started {formatClockTime(workout.startedAt)}</span>
      </header>

      {slots.map((slot, index) => {
        const exercise = exerciseFor(slot, index)
        return (
          <ExerciseCard
            key={`${index}-${exercise.id}`}
            slot={slot}
            exercise={exercise}
            previousSets={slot.previousBy[exercise.id]}
            loggedSets={loggedSets.filter((s) => s.exerciseId === exercise.id)}
            skipped={skipped[exercise.id] ?? new Set()}
            extraSets={extra[exercise.id] ?? 0}
            onSelectAlternative={(id) => setChosen((c) => ({ ...c, [index]: id }))}
            onFlipUnit={() => setDisplayUnit(exercise.id, otherUnit(exercise.displayUnit))}
            onDone={async (setNumber, values) => {
              await logSet({ workoutId: workout.id, exerciseId: exercise.id, setNumber, ...values })
              // The timer starts automatically when a set is marked done.
              await saveActiveRest(
                startRest({ exerciseId: exercise.id, exerciseName: exercise.name, restSeconds: exercise.restSeconds }),
              )
            }}
            onSkip={(setNumber) =>
              setSkipped((s) => ({ ...s, [exercise.id]: new Set([...(s[exercise.id] ?? []), setNumber]) }))
            }
            onAddSet={() => setExtra((e) => ({ ...e, [exercise.id]: (e[exercise.id] ?? 0) + 1 }))}
          />
        )
      })}

      <button
        type="button"
        onClick={finish}
        className="mt-auto rounded-xl border border-rule px-4 py-3 font-medium"
      >
        Finish
      </button>

      <RestDock
        rest={rest}
        nextSlug={rest ? slots.flatMap((s) => s.options).find((o) => o.id === rest.exerciseId)?.illustration : undefined}
        onAdjust={(delta) => saveActiveRest(adjustRest(rest, delta))}
        onSkip={() => saveActiveRest(null)}
      />
    </main>
  )
}
