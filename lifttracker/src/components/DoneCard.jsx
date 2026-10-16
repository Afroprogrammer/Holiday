// Shown in the active area while a rest runs (gym round 1, 2.1): the set
// just logged, with no way to log another until the rest ends.
export default function DoneCard({ set, marker, exerciseName = null, leaving = false, onEdit, onSkipRest }) {
  return (
    <section className={`mt-5 ${leaving ? 'set-out' : ''}`}>
      <h3 className="font-num text-[22px] font-bold uppercase tracking-wide text-act">
        {exerciseName ? `${exerciseName} · ` : ''}Set {set.setNumber} logged
      </h3>
      <div className="mt-2 flex items-baseline gap-3">
        <span className="font-num text-[44px] font-bold leading-none tracking-tight">
          {set.weight} {set.unit} × {set.reps}
        </span>
        {marker && <span className="text-xs font-semibold text-flag">{marker.kind} range</span>}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={onEdit} className="h-12 rounded-xl border border-rule font-semibold text-ink-2">
          Edit
        </button>
        <button type="button" onClick={onSkipRest} className="h-12 rounded-xl border border-act font-semibold text-act">
          Skip rest
        </button>
      </div>
    </section>
  )
}
