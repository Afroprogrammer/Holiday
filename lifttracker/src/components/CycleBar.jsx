// Four 4 px segments: days already done in this cycle, the one up next, the
// rest. `days` are program days with `order`.
export default function CycleBar({ days, nextDayId }) {
  const ordered = [...days].sort((a, b) => a.order - b.order)
  const nextOrder = ordered.find((d) => d.id === nextDayId)?.order ?? 1
  return (
    <div className="mt-3 flex gap-1.5" aria-hidden="true">
      {ordered.map((day) => {
        const state = day.order < nextOrder ? 'done' : day.order === nextOrder ? 'now' : 'todo'
        const cls = state === 'now' ? 'bg-act' : state === 'done' ? 'bg-act/40' : 'bg-rule'
        return <i key={day.id} data-state={state} className={`h-1 flex-1 rounded-full ${cls}`} />
      })}
    </div>
  )
}
