import { useLiveQuery } from 'dexie-react-hooks'
import Illustration from '../components/Illustration.jsx'
import NumberField from '../components/NumberField.jsx'
import { getProgramDays } from '../db/queries.js'
import { getExercise, updateExercise } from '../db/settings.js'
import { getExerciseHistory } from '../db/workouts.js'
import { formatShortDate } from '../lib/format.js'
import { formatSession } from '../lib/history.js'
import { exercisePlacements, placementCaption } from '../lib/placement.js'

function Group({ children }) {
  return <h2 className="mt-6 mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-3">{children}</h2>
}

// Per-exercise overrides (prd.md, "Settings"): display unit, increments, and
// rest, plus the last five sessions so history can be sanity-checked here.
export default function ExerciseSettings({ exerciseId }) {
  const exercise = useLiveQuery(() => getExercise(exerciseId), [exerciseId])
  const days = useLiveQuery(getProgramDays, [], [])
  const history = useLiveQuery(() => getExerciseHistory(exerciseId, 5), [exerciseId], [])
  if (exercise === undefined) return null
  if (!exercise) return <p className="p-5 text-ink-2">Unknown exercise.</p>

  const save = (patch) => updateExercise(exercise.id, patch)
  const num = (v) => (v === '' ? 0 : Number(v))
  const placements = exercisePlacements(exercise.id, days)
  const slot = days.flatMap((d) => d.slots).find((s) => s.exerciseIds.includes(exercise.id))
  const targets = slot ? `${slot.targetSets} sets · ${slot.repMin === slot.repMax ? slot.repMin : `${slot.repMin}–${slot.repMax}`} reps` : ''
  const compound = exercise.category === 'compound'

  return (
    <main className="min-h-dvh px-5 pt-3.5 pb-8">
      <header className="flex h-11 items-center">
        <a href="#settings" className="inline-flex h-11 items-center font-semibold text-act">
          ‹ Settings
        </a>
      </header>

      <section className="mt-1 flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-act">{placementCaption(placements)}</p>
          <h1 className="mt-1 font-num text-[40px] font-bold uppercase leading-[0.95]">{exercise.name}</h1>
          <p className="mt-1.5 text-[15px] text-ink-2">{targets}</p>
        </div>
        <Illustration slug={exercise.illustration} size={96} tone="ink-2" />
      </section>

      <Group>Units</Group>
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-rule py-2">
        <span>
          <span className="block text-base">Display unit</span>
          <span className="block text-[13px] text-ink-2">equipment is marked in</span>
        </span>
        <div role="group" aria-label="Display unit" className="flex h-11 overflow-hidden rounded-lg border border-rule bg-raised">
          {['kg', 'lb'].map((unit) => (
            <button
              key={unit}
              type="button"
              aria-pressed={exercise.displayUnit === unit}
              onClick={() => save({ displayUnit: unit })}
              className={`w-14 text-[15px] font-semibold ${exercise.displayUnit === unit ? 'bg-act text-on-act' : 'text-ink-2'}`}
            >
              {unit}
            </button>
          ))}
        </div>
      </div>
      <NumberField label="Step on kg equipment" value={String(exercise.incrementKg)} suffix="kg" inputMode="decimal" onChange={(v) => save({ incrementKg: num(v) })} />
      <NumberField label="Step on lb equipment" value={String(exercise.incrementLb)} suffix="lb" inputMode="decimal" onChange={(v) => save({ incrementLb: num(v) })} />

      <Group>Rest</Group>
      <NumberField
        label="Rest after a set"
        caption={`default for ${compound ? 'compound lifts is 90 s' : 'isolation and core is 60 s'}`}
        value={String(exercise.restSeconds)}
        suffix="s"
        onChange={(v) => save({ restSeconds: num(v) })}
      />

      <Group>History</Group>
      {history.length === 0 ? (
        <p className="min-h-14 py-2 text-[15px] text-ink-2">No sessions yet</p>
      ) : (
        <ul>
          {history.map((session) => (
            <li key={session.workoutId} className="flex min-h-14 items-center justify-between gap-3 border-b border-rule py-2 last:border-0">
              <span className="text-[13px] text-ink-2">{formatShortDate(session.finishedAt)}</span>
              <span className="text-right font-num text-[17px] font-semibold">{formatSession(session.sets)}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
