import Illustration from './Illustration.jsx'
import { shortName } from '../lib/workoutProgress.js'

function repsText(slot) {
  return slot.repMin === slot.repMax ? `${slot.repMin} reps` : `${slot.repMin}–${slot.repMax} reps`
}

// The set that started the rest, on one line (rest next-up spec, 3.2).
export function LoggedLine({ set, marker, exerciseName = null, onEdit }) {
  return (
    <div className="flex h-12 items-center gap-3 rounded-2xl border border-rule bg-card px-3.5">
      <span className="font-num text-[15px] font-bold tracking-wide text-act">S{set.setNumber}</span>
      <span className="font-num text-lg font-semibold">
        {set.weight} {set.unit} × {set.reps}
      </span>
      {marker && <span className="text-xs font-semibold text-flag">{marker.kind} range</span>}
      <span className="min-w-0 truncate text-[13px] text-ink-2">{exerciseName ? `${exerciseName} · logged` : 'logged'}</span>
      <button type="button" onClick={onEdit} className="ml-auto h-11 shrink-0 px-2 font-semibold text-act">
        Edit
      </button>
    </div>
  )
}

function Cell({ label, value, accent = false }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span>{label}</span>
      <span className={`font-num text-lg font-semibold ${accent ? 'text-act' : 'text-ink'}`}>{value}</span>
    </div>
  )
}

// What comes after this rest (rest next-up spec, 3.2): another exercise in
// full, the next set of the same exercise with what follows it, or nothing.
export function NextUpCard({ preview, onStart }) {
  const shell = 'mt-3.5 flex flex-col gap-2.5 rounded-[18px] border border-act bg-raised px-4 pt-4 pb-3.5'
  if (preview.kind === 'none') {
    return (
      <div className={shell}>
        <p className="font-num text-[26px] font-bold uppercase leading-none">All sets logged</p>
        <p className="text-[15px] text-ink-2">Finish when you are ready.</p>
      </div>
    )
  }

  const { entry, row, index, count, setupText, lastText } = preview
  const name = shortName(entry.exercise.name)
  const label = 'text-xs font-semibold uppercase tracking-widest'
  return (
    <div className={shell}>
      <div className="flex items-center justify-between">
        <span className={`${label} text-act`}>Next · after this rest</span>
        <span className={`${label} text-ink-3`}>
          Exercise {index} of {count}
        </span>
      </div>
      {preview.kind === 'other' ? (
        <div className="flex items-center gap-3.5">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="font-num text-[30px] font-bold uppercase leading-none">{name}</p>
            <p className="text-[15px] text-ink-2">
              {entry.slot.targetSets} sets · {repsText(entry.slot)} · rest {entry.exercise.restSeconds} s
            </p>
          </div>
          <Illustration slug={entry.exercise.illustration} size={72} tone="act" live glow />
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="font-num text-[30px] font-bold uppercase leading-none">
            Set {row.n} of {entry.total}
          </p>
          <p className="text-[15px] text-ink-2">{preview.after ? `Then: ${preview.after.name} · ${preview.after.text}` : 'Then: last exercise'}</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 border-t border-rule pt-2.5 text-sm text-ink-2">
        <Cell label="Last time" value={lastText} />
        <Cell label="Set up" value={setupText ?? '–'} accent />
      </div>
      <button type="button" onClick={onStart} className="h-11 rounded-xl border border-act font-semibold text-act">
        {preview.kind === 'other' ? `Start ${name} now` : `Start set ${row.n} now`}
      </button>
    </div>
  )
}

// The active area while a rest runs: what you just did, then what is next.
// No Done button exists here; the rest ends by itself or through Start.
export default function RestBlock({ set, marker, exerciseName = null, preview, leaving = false, onEdit, onStart }) {
  return (
    <section className={`mt-4 ${leaving ? 'set-out' : ''}`}>
      <LoggedLine set={set} marker={marker} exerciseName={exerciseName} onEdit={onEdit} />
      <NextUpCard preview={preview} onStart={onStart} />
    </section>
  )
}
