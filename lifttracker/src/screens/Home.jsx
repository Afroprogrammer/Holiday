import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getLastFinishedWorkout, getNextProgramDay, getProgramDays } from '../db/queries.js'
import { formatWorkoutDate } from '../lib/format.js'

// Home screen (prd.md, "Home screen"): the next day name and a Start button,
// the last completed workout's day name and date, a small override to start
// a different day, and a Settings link.
export default function Home({ onStart }) {
  const nextDay = useLiveQuery(getNextProgramDay)
  const lastWorkout = useLiveQuery(getLastFinishedWorkout)
  const days = useLiveQuery(getProgramDays, [], [])
  const [showOverride, setShowOverride] = useState(false)

  if (nextDay === undefined || lastWorkout === undefined) return null

  const otherDays = days.filter((d) => d.id !== nextDay?.id)

  return (
    <main className="flex min-h-dvh flex-col gap-3 p-4">
      <header className="flex items-baseline justify-between">
        <span className="font-num text-2xl font-semibold">LiftTracker</span>
        <a href="#settings" className="font-medium text-act">
          Settings
        </a>
      </header>

      <div className="flex-1" />

      <p className="text-ink-2">Next</p>
      <h1 className="font-num text-6xl font-semibold leading-none">{nextDay?.name ?? '–'}</h1>
      <p className="mt-3 text-ink-2">
        Last completed
        <br />
        {lastWorkout ? (
          <>
            <b className="font-semibold text-ink">{lastWorkout.programDay?.name}</b>
            {' · '}
            {formatWorkoutDate(lastWorkout.finishedAt)}
          </>
        ) : (
          <span>–</span>
        )}
      </p>

      <div className="flex-1" />

      <button
        type="button"
        className="rounded-xl bg-act px-4 py-4 text-base font-semibold text-on-act"
        onClick={() => onStart?.(nextDay)}
      >
        Start {nextDay?.name}
      </button>

      {showOverride ? (
        <div className="grid gap-2">
          {otherDays.map((day) => (
            <button
              key={day.id}
              type="button"
              className="rounded-xl border border-rule px-4 py-3 font-medium"
              onClick={() => onStart?.(day)}
            >
              Start {day.name}
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          className="rounded-xl border border-rule px-4 py-3 text-sm font-medium"
          onClick={() => setShowOverride(true)}
        >
          Start a different day
        </button>
      )}
    </main>
  )
}
