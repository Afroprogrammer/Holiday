import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Home from './screens/Home.jsx'
import Workout from './screens/Workout.jsx'
import Settings from './screens/Settings.jsx'
import ExerciseSettings from './screens/ExerciseSettings.jsx'
import { getActiveView } from './db/queries.js'
import { getSetting, SETTING_KEYS } from './db/settings.js'
import { getActiveRest, startWorkout } from './db/workouts.js'
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
  const booted = useRef(false)

  useWakeLock(Boolean(active) && keepScreenOn !== false)
  const liveRest = active ? (rest ?? null) : null
  const notify = notifyPref !== false && notificationPermission() === 'granted'
  const nextSet = active ? activeSummary({ ...active, rest: liveRest, now: Date.now() }).nextSet : null
  const flash = useRestWatcher(liveRest, { notify, nextSet })

  const onWorkout = hash === WORKOUT_HASH
  // Cold open with a workout running opens on it, as before, and pushes
  // the entry so one back gesture still returns Home.
  useEffect(() => {
    if (active === undefined || booted.current) return
    booted.current = true
    if (active && hash === '') enterWorkout()
  }, [active, hash])
  // #workout with nothing running (finished, discarded, stale link) is Home.
  useEffect(() => {
    if (onWorkout && active === null) replaceHash('')
  }, [onWorkout, active])

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
