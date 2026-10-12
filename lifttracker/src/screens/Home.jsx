import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import CycleBar from '../components/CycleBar.jsx'
import DaySheet from '../components/DaySheet.jsx'
import Illustration from '../components/Illustration.jsx'
import { getHomeView } from '../db/queries.js'
import { formatSession } from '../lib/history.js'
import { formatShortDate } from '../lib/format.js'
import { shortName } from '../lib/workoutProgress.js'

// Home ("Poster"): the next day as a poster, the cycle, today's exercises as
// a strip of figures, and what you did last time. Start is pinned to the
// bottom with the day override behind a sheet.
export default function Home({ onStart }) {
  const view = useLiveQuery(getHomeView)
  const [picking, setPicking] = useState(false)
  if (view === undefined) return null
  const { nextDay, days, lastWorkout, exercisesById, firstExercise, firstSession, stripSlugs } = view
  const [dayWord, dayLetter] = (nextDay?.name ?? '–').split(' ')

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="flex-1 px-5 pt-3.5">
        <header className="flex h-11 items-center justify-between">
          <span className="font-num text-lg font-bold uppercase tracking-wide">LiftTracker</span>
          <a href="#settings" className="inline-flex h-11 items-center font-semibold text-act">
            Settings
          </a>
        </header>

        <section className="mt-7">
          <p className="text-[15px] font-medium text-ink-2">
            Up next · day {nextDay?.order ?? '–'} of {days.length}
          </p>
          <h1 className="mt-1.5 font-num text-[92px] font-bold uppercase leading-[0.92] tracking-tight">
            {dayWord}
            {dayLetter && <span className="ml-2.5 text-act">{dayLetter}</span>}
          </h1>
          <CycleBar days={days} nextDayId={nextDay?.id} />
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
              <dd className="font-semibold text-ink">{lastWorkout ? `${lastWorkout.programDay?.name} · ${formatShortDate(lastWorkout.finishedAt)}` : '–'}</dd>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <dt>{firstExercise ? `${shortName(firstExercise.name)} last time` : 'Last time'}</dt>
              <dd className="font-num text-[19px] font-semibold text-ink">{firstSession ? formatSession(firstSession.sets) : '–'}</dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="sticky bottom-0 flex flex-col gap-2.5 bg-linear-to-t from-canvas from-70% to-transparent px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom,0px))]">
        <button type="button" onClick={() => onStart?.(nextDay)} disabled={!nextDay} className="h-[60px] rounded-2xl bg-act text-lg font-semibold text-on-act">
          Start {nextDay?.name}
        </button>
        <button type="button" onClick={() => setPicking(true)} className="h-[52px] rounded-2xl border border-rule font-semibold text-ink-2">
          Start a different day
        </button>
      </div>

      <DaySheet
        open={picking}
        days={days}
        exercisesById={exercisesById}
        nextDayId={nextDay?.id}
        title="Start a different day"
        copy="Cycle position moves only when you finish the workout."
        onPick={(day) => {
          setPicking(false)
          onStart?.(day)
        }}
        onClose={() => setPicking(false)}
      />
    </main>
  )
}
