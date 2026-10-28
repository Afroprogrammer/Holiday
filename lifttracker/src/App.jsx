import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Home from './screens/Home.jsx'
import Workout from './screens/Workout.jsx'
import Settings from './screens/Settings.jsx'
import ExerciseSettings from './screens/ExerciseSettings.jsx'
import { getActiveView } from './db/queries.js'
import { getSetting, SETTING_KEYS } from './db/settings.js'
import { getActiveRest, startWorkout } from './db/workouts.js'
import { migrateProgram } from './db/seed.js'
import { enterWorkout, replaceHash, WORKOUT_HASH } from './lib/nav.js'
import { notificationPermission } from './lib/restNotification.js'
import { useAppUpdate } from './lib/update.js'
import { useRestWatcher } from './lib/useRestWatcher.js'
import { useWakeLock } from './lib/wakeLock.js'
import { activeSummary } from './lib/workoutProgress.js'

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

// Routes (gym round 2, 3.2): Home at the empty hash, the workout under
// #workout, Settings under #settings. A running workout no longer takes
// over Home; Home shows a Resume card instead. The rest-end watcher and
// the wake lock live here so they hold whichever screen shows.
export default function App() {
  const hash = useHash()
  const active = useLiveQuery(getActiveView)
  const rest = useLiveQuery(getActiveRest)
  const keepScreenOn = useLiveQuery(() => getSetting(SETTING_KEYS.keepScreenOn))
  const notifyPref = useLiveQuery(() => getSetting(SETTING_KEYS.restNotification))
  // Registered here so the worker is set up whichever screen opens first.
  const update = useAppUpdate()

  useWakeLock(Boolean(active) && keepScreenOn !== false)
  const liveRest = active ? (rest ?? null) : null
  const notify = notifyPref !== false && notificationPermission() === 'granted'
  const nextSet = active ? activeSummary({ ...active, rest: liveRest, now: Date.now() }).nextSet : null
  const flash = useRestWatcher(liveRest, { notify, nextSet })

  const onWorkout = hash === WORKOUT_HASH
  // A cold open with a workout running lands on Home's Resume card. The
  // #workout entry is only ever pushed from a tap: Chrome skips entries
  // pushed without user activation when the back gesture runs, which
  // would close the app instead of returning Home.
  // #workout with nothing running (finished, discarded, stale link) is Home.
  useEffect(() => {
    if (onWorkout && active === null) replaceHash('')
  }, [onWorkout, active])
  // A program migration skipped at launch because a workout was running
  // (for example after Update mid-workout) runs as soon as none is.
  const idle = active === null
  useEffect(() => {
    if (idle) migrateProgram()
  }, [idle])

  if (active === undefined) return null

  if (hash.startsWith('#settings/')) return <ExerciseSettings exerciseId={decodeURIComponent(hash.slice('#settings/'.length))} />
  if (hash === '#settings') return <Settings />
  if (onWorkout && active) return <Workout workoutId={active.workout.id} flash={flash} />
  return (
    <Home
      active={active}
      rest={liveRest}
      flash={flash}
      update={update}
      onStart={async (day) => {
        await startWorkout(day.id)
        enterWorkout()
      }}
      onResume={enterWorkout}
    />
  )
}
