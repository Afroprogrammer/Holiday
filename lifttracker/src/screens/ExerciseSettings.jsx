import { useLiveQuery } from 'dexie-react-hooks'
import SecondsField from '../components/SecondsField.jsx'
import { getExercise, updateExercise } from '../db/settings.js'

function NumberRow({ label, value, onChange, suffix }) {
  return (
    <label className="flex items-center justify-between gap-3 border-b border-rule py-2">
      <span className="text-ink-2">{label}</span>
      <span className="flex items-baseline gap-1">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          aria-label={label}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
          className="w-16 rounded-md border border-rule bg-raised px-2 py-1 text-right font-num text-base font-semibold tabular-nums outline-none"
        />
        <span className="text-sm text-ink-2">{suffix}</span>
      </span>
    </label>
  )
}

// Per-exercise overrides (prd.md, "Settings"): display unit, increment, and
// rest duration. Every change is saved permanently.
export default function ExerciseSettings({ exerciseId }) {
  const exercise = useLiveQuery(() => getExercise(exerciseId), [exerciseId])
  if (exercise === undefined) return null
  if (!exercise) return <p className="p-4 text-ink-2">Unknown exercise.</p>

  const save = (patch) => updateExercise(exercise.id, patch)
  const num = (v) => (v === '' ? 0 : Number(v))

  return (
    <main className="flex min-h-dvh flex-col gap-2 p-4">
      <header className="flex items-baseline justify-between gap-3">
        <span className="font-num text-2xl font-semibold">{exercise.name}</span>
        <a href="#settings" className="shrink-0 font-medium text-act">
          Back
        </a>
      </header>

      <div className="flex items-center justify-between gap-3 border-b border-rule py-2">
        <span className="text-ink-2">Display unit</span>
        <div className="grid grid-cols-2 overflow-hidden rounded-md border border-rule text-center text-sm">
          {['kg', 'lb'].map((unit) => (
            <button
              key={unit}
              type="button"
              onClick={() => save({ displayUnit: unit })}
              className={exercise.displayUnit === unit ? 'bg-raised px-4 py-1 font-semibold' : 'px-4 py-1 text-ink-2'}
            >
              {unit}
            </button>
          ))}
        </div>
      </div>

      <NumberRow label="Increment on kg equipment" value={String(exercise.incrementKg)} suffix="kg" onChange={(v) => save({ incrementKg: num(v) })} />
      <NumberRow label="Increment on lb equipment" value={String(exercise.incrementLb)} suffix="lb" onChange={(v) => save({ incrementLb: num(v) })} />
      <SecondsField label="Rest" value={String(exercise.restSeconds)} onChange={(v) => save({ restSeconds: num(v) })} />
    </main>
  )
}
