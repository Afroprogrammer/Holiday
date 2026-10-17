import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import BottomSheet from '../components/BottomSheet.jsx'
import DayPage from '../components/DayPage.jsx'
import ResumeCard from '../components/ResumeCard.jsx'
import UpdateBanner from '../components/UpdateBanner.jsx'
import { getHomeView } from '../db/queries.js'
import { discardWorkout } from '../db/workouts.js'
import { useInstallPrompt } from '../lib/install.js'
import { closeRestNotifications, getRegistration } from '../lib/restNotification.js'
import { activeSummary } from '../lib/workoutProgress.js'

function useTicker(ms, on) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!on) return undefined
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms, on])
  return now
}

function discardCopy(count) {
  if (count === 0) return 'Nothing was logged. Cycle position stays.'
  return count === 1 ? '1 logged set is deleted. Cycle position stays.' : `${count} logged sets are deleted. Cycle position stays.`
}

// Home ("Poster", gym round 2): a swipe pager with one poster per program
// day, the cycle bar, and Start for the day on screen. With a workout
// running the bottom area is the Resume card instead.
export default function Home({ active, rest, flash = false, update, onStart, onResume }) {
  const view = useLiveQuery(getHomeView)
  const now = useTicker(1000, Boolean(active))
  const [page, setPage] = useState(null)
  const [discarding, setDiscarding] = useState(false)
  const pager = useRef(null)
  const { canInstall, installed, install } = useInstallPrompt()

  const nextIndex = view ? Math.max(0, view.days.findIndex((d) => d.day.id === view.nextDay?.id)) : 0
  // Open on the day up next, once the pages exist.
  useEffect(() => {
    if (!view || page !== null) return
    setPage(nextIndex)
    pager.current?.scrollTo({ left: nextIndex * pager.current.clientWidth, behavior: 'instant' })
  }, [view, page, nextIndex])

  if (view === undefined) return null
  const { nextDay, days } = view
  const programDays = days.map((d) => d.day)
  const current = days[page ?? nextIndex] ?? days[0]
  const summary = active ? activeSummary({ ...active, rest, now }) : null

  const onScroll = (e) => {
    const el = e.currentTarget
    if (el.clientWidth > 0) setPage(Math.min(days.length - 1, Math.max(0, Math.round(el.scrollLeft / el.clientWidth))))
  }

  const confirmDiscard = async () => {
    setDiscarding(false)
    await discardWorkout(active.workout.id)
    getRegistration().then(closeRestNotifications)
  }

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="flex-1 pt-3.5">
        <header className="flex h-11 items-center justify-between px-5">
          <span className="font-num text-lg font-bold uppercase tracking-wide">LiftTracker</span>
          <a href="#settings" className="inline-flex h-11 items-center font-semibold text-act">
            Settings
          </a>
        </header>
        <div className="px-5">{!active && <UpdateBanner ready={update?.ready ?? false} apply={update?.apply} />}</div>

        <div ref={pager} onScroll={onScroll} aria-roledescription="carousel" className="no-scrollbar mt-7 flex snap-x snap-mandatory overflow-x-auto">
          {days.map((entry) => (
            <DayPage key={entry.day.id} entry={entry} days={programDays} nextDayId={nextDay?.id} upNext={entry.day.id === nextDay?.id} />
          ))}
        </div>

        <div className="px-5">
          {canInstall && !installed && (
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-rule bg-card px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold">Install on this phone</span>
                <span className="block text-[13px] text-ink-2">Opens full screen, works offline</span>
              </span>
              <button type="button" onClick={install} className="h-11 shrink-0 rounded-xl bg-act px-4 font-semibold text-on-act">
                Install
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 flex flex-col gap-2.5 bg-linear-to-t from-canvas from-70% to-transparent px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom,0px))]">
        {active ? (
          <ResumeCard summary={summary} dayName={active.day.name} flash={flash} onResume={onResume} onDiscard={() => setDiscarding(true)} />
        ) : (
          <button type="button" onClick={() => onStart?.(current.day)} disabled={!current} className="h-[60px] rounded-2xl bg-act text-lg font-semibold text-on-act">
            Start {current?.day.name}
          </button>
        )}
      </div>

      {active && (
        <BottomSheet open={discarding} title={`Discard ${active.day.name}?`} onClose={() => setDiscarding(false)}>
          <p className="mt-1 mb-3.5 text-[15px] text-ink-2">{discardCopy(active.loggedSets.length)}</p>
          <button type="button" onClick={() => setDiscarding(false)} className="mb-2.5 h-[60px] w-full rounded-2xl bg-act text-lg font-semibold text-on-act">
            Keep
          </button>
          <button type="button" onClick={confirmDiscard} className="h-[52px] w-full rounded-2xl border border-rule font-semibold text-flag">
            Discard
          </button>
        </BottomSheet>
      )}
    </main>
  )
}
