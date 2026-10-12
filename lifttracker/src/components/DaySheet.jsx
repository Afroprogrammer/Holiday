import BottomSheet from './BottomSheet.jsx'

const DROP = /^(barbell|dumbbell|weighted|machine|assisted|heavy|cable) /

// "bench press · chest press · shoulder press · dips · cable crunch": the first
// exercise of each slot, shortened so a day fits one caption line.
export function summaryOf(day, exercisesById) {
  return day.slots
    .map((slot) => {
      const name = exercisesById.get(slot.exerciseIds[0])?.name ?? slot.exerciseIds[0]
      const short = name.split(',')[0].trim().toLowerCase()
      return short === 'weighted cable crunch' ? 'cable crunch' : short.replace(DROP, '')
    })
    .join(' · ')
}

// The list of program days, used from Home ("Start a different day") and from
// Settings ("Cycle position"). `nextDayId` gets the "up next" tag.
export default function DaySheet({ open, days, exercisesById, nextDayId, title, copy, onPick, onClose }) {
  return (
    <BottomSheet open={open} title={title} onClose={onClose}>
      <p className="mt-1 mb-3.5 text-[15px] text-ink-2">{copy}</p>
      <ul>
        {days.map((day, i) => {
          const current = day.id === nextDayId
          return (
            <li key={day.id} className={i < days.length - 1 ? 'border-b border-rule' : ''}>
              <button type="button" onClick={() => onPick(day)} className="flex min-h-[60px] w-full items-center gap-3 py-2 text-left">
                <span className="min-w-0 flex-1">
                  <span className={`block font-num text-2xl font-bold uppercase leading-none ${current ? 'text-act' : ''}`}>{day.name}</span>
                  <span className="mt-1 block truncate text-[13px] text-ink-2">{summaryOf(day, exercisesById)}</span>
                </span>
                {current && <span className="rounded-md border border-act/50 px-1.5 py-0.5 text-xs font-semibold text-act">up next</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </BottomSheet>
  )
}
