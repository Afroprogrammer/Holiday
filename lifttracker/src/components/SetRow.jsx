import { useState } from 'react'
import { convertWeight, incrementFor, otherUnit } from '../lib/units.js'
import { rangeMarker } from '../lib/prefill.js'

function Marker({ marker }) {
  if (!marker) return <span />
  const up = marker.kind === 'above'
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] ${'text-flag'}`}>
      <svg viewBox="0 0 10 10" width="9" height="9" aria-hidden="true">
        <path d={up ? 'M5 1 L9 8 L1 8 Z' : 'M5 9 L9 2 L1 2 Z'} fill="currentColor" />
      </svg>
      {marker.kind} {marker.bound}
    </span>
  )
}

// A completed set row collapses to a single line and shows a marker when the
// logged reps are outside the target range (prd.md, "Workout screen").
export function LoggedSetRow({ set, slot }) {
  return (
    <div className="grid grid-cols-[20px_1fr_auto] items-center gap-2 py-1 text-ink-2 tabular-nums">
      <span>{set.setNumber}</span>
      <span className="font-num text-base font-medium text-ink">
        {set.weight} {set.unit} × {set.reps}
      </span>
      <Marker marker={rangeMarker(set.reps, slot.repMin, slot.repMax)} />
    </div>
  )
}

export function SkippedSetRow({ setNumber }) {
  return (
    <div className="grid grid-cols-[20px_1fr] items-center gap-2 py-1 text-ink-2">
      <span>{setNumber}</span>
      <span className="text-sm">Skipped</span>
    </div>
  )
}

function lastTimeText(prefill, displayUnit) {
  if (!prefill) return 'Last time –'
  const weight =
    prefill.unit === displayUnit
      ? `${prefill.weight} ${prefill.unit}`
      : `${prefill.weight} ${prefill.unit} (${convertWeight(prefill.weight, prefill.unit, displayUnit)} ${displayUnit})`
  return `Last time ${weight} × ${prefill.reps}`
}

// A set that is not the next one up: shows only last time's values.
export function PendingSetRow({ setNumber, prefill, displayUnit }) {
  return (
    <div className="grid grid-cols-[20px_1fr] gap-2 border-t border-rule pt-2 opacity-60">
      <span className="text-ink-2">{setNumber}</span>
      <span className="text-xs text-ink-2">{lastTimeText(prefill, displayUnit)}</span>
    </div>
  )
}

function Stepper({ value, onChange, step, label, sub, inputMode }) {
  const num = value === '' ? 0 : Number(value)
  const bump = (delta) => onChange(String(Math.max(0, Math.round((num + delta) * 100) / 100)))
  return (
    <div className="grid grid-cols-[40px_1fr_40px] overflow-hidden rounded-lg border border-rule bg-raised">
      <button type="button" aria-label={`${label} minus`} className="grid place-items-center text-xl leading-none text-ink-2" onClick={() => bump(-step)}>
        −
      </button>
      <label className="border-x border-rule py-1 text-center">
        <span className="sr-only">{label}</span>
        <input
          type="text"
          inputMode={inputMode}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
          className="h-7 w-full bg-transparent text-center font-num text-2xl font-semibold leading-none tabular-nums outline-none"
        />
        <span className="block truncate text-[10px] text-ink-2">{sub}</span>
      </label>
      <button type="button" aria-label={`${label} plus`} className="grid place-items-center text-xl leading-none text-ink-2" onClick={() => bump(step)}>
        +
      </button>
    </div>
  )
}

// The open set: last time's values, prefilled weight and reps with steppers,
// and Done. Two taps when the prefilled values are right: Done and nothing
// else (prd.md, "Done criteria").
export function OpenSetRow({ setNumber, exercise, prefill, onDone }) {
  const unit = exercise.displayUnit
  const initialWeight = prefill ? convertWeight(prefill.weight, prefill.unit, unit) : ''
  const [weight, setWeight] = useState(initialWeight === '' ? '' : String(initialWeight))
  const [reps, setReps] = useState(prefill ? String(prefill.reps) : '')
  const ready = weight !== '' && reps !== '' && !Number.isNaN(Number(weight)) && !Number.isNaN(Number(reps))
  const weightNum = weight === '' ? 0 : Number(weight)

  return (
    <div className="grid grid-cols-[20px_1fr] gap-2 border-t border-rule pt-2">
      <span className="pt-1 text-ink-2">{setNumber}</span>
      <div>
        <div className="text-xs text-ink-2">{lastTimeText(prefill, unit)}</div>
        <div className="mt-1 grid grid-cols-[1.3fr_1fr_auto] items-stretch gap-2">
          <Stepper
            value={weight}
            onChange={setWeight}
            step={incrementFor(exercise, unit)}
            label="Weight"
            inputMode="decimal"
            sub={weight !== '' ? `${unit} · ${convertWeight(weightNum, unit, otherUnit(unit))} ${otherUnit(unit)}` : `${unit} · ${otherUnit(unit)}`}
          />
          <Stepper value={reps} onChange={setReps} step={1} label="Reps" inputMode="numeric" sub="reps" />
          <button
            type="button"
            disabled={!ready}
            onClick={() => onDone({ weight: Number(weight), unit, reps: Number(reps) })}
            className="min-w-14 rounded-lg bg-act px-3 font-semibold text-on-act disabled:opacity-40"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
