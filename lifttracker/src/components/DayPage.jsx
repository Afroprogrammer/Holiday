import CycleBar from './CycleBar.jsx'
import Illustration from './Illustration.jsx'
import { formatSession } from '../lib/history.js'
import { formatShortDate } from '../lib/format.js'
import { shortName } from '../lib/workoutProgress.js'

// One page of the Home pager (gym round 2, 3.1): the day as a poster, its
// exercises as a strip of figures, and what you did last time. The cycle
// bar shows the cycle position and is the same on every page.
export default function DayPage({ entry, days, nextDayId, upNext }) {
  const count = days.length
  const { day, stripSlugs, firstExercise, firstSession, lastWorkout } = entry
  const [dayWord, dayLetter] = day.name.split(' ')
  return (
    <section aria-label={day.name} className="w-full shrink-0 snap-start px-5">
      <p className="text-[15px] font-medium text-ink-2">{upNext ? `Up next · day ${day.order} of ${count}` : `Day ${day.order} of ${count}`}</p>
      <h1 className="mt-1.5 font-num text-[92px] font-bold uppercase leading-[0.92] tracking-tight">
        {dayWord}
        {dayLetter && <span className="ml-2.5 text-act">{dayLetter}</span>}
      </h1>
      <CycleBar days={days} nextDayId={nextDayId} />
      <div className="-mx-1 mt-6 flex gap-1">
        {stripSlugs.map((slug, i) => (
          <span key={i} className="flex flex-1 justify-center">
            <Illustration slug={slug} size={68} tone="ink-2" />
          </span>
        ))}
      </div>
      <dl className="mt-6 border-t border-rule pt-4 text-[15px] text-ink-2">
        <div className="flex items-baseline justify-between">
          <dt>Last completed</dt>
          <dd className="font-semibold text-ink">{lastWorkout ? formatShortDate(lastWorkout.finishedAt) : '–'}</dd>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <dt>{firstExercise ? `${shortName(firstExercise.name)} last time` : 'Last time'}</dt>
          <dd className="font-num text-[19px] font-semibold text-ink">{firstSession ? formatSession(firstSession.sets) : '–'}</dd>
        </div>
      </dl>
    </section>
  )
}
