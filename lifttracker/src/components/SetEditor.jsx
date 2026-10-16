import { useState } from 'react'
import Stepper from './Stepper.jsx'
import { toNumber } from '../lib/numberInput.js'
import { incrementFor } from '../lib/units.js'

// Inline editor for a logged set (gym round 1, 2.3). Values stay in the unit
// they were logged in; nothing converts.
export default function SetEditor({ set, exercise, targetText, onSave, onCancel, onRemove }) {
  const [weight, setWeight] = useState(String(set.weight))
  const [reps, setReps] = useState(String(set.reps))
  const ready = weight !== '' && reps !== ''
  const step = incrementFor(exercise, set.unit)
  return (
    <section className="mt-3 rounded-2xl border border-act/40 bg-raised p-3">
      <h3 className="font-num text-[22px] font-bold uppercase tracking-wide">Edit set {set.setNumber}</h3>
      <div className="mt-3">
        <Stepper value={weight} onChange={setWeight} step={step} size="weight" unit={set.unit} caption={`±${step}`} label="Weight" inputMode="decimal" />
      </div>
      <div className="mt-3">
        <Stepper value={reps} onChange={setReps} step={1} size="reps" caption={`reps · target ${targetText}`} label="Reps" inputMode="numeric" integer />
      </div>
      <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-2">
        <button
          type="button"
          disabled={!ready}
          onClick={() => onSave({ weight: toNumber(weight), unit: set.unit, reps: Math.round(toNumber(reps)) })}
          className="h-12 rounded-xl bg-act font-semibold text-on-act disabled:opacity-45"
        >
          Save
        </button>
        <button type="button" onClick={onCancel} className="h-12 rounded-xl border border-rule font-semibold text-ink-2">
          Cancel
        </button>
        <button type="button" onClick={onRemove} className="h-12 rounded-xl border border-rule px-3 font-semibold text-flag">
          Remove set
        </button>
      </div>
    </section>
  )
}
