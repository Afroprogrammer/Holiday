import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import Home from './screens/Home.jsx'
import Workout from './screens/Workout.jsx'
import Settings from './screens/Settings.jsx'
import ExerciseSettings from './screens/ExerciseSettings.jsx'
import { getActiveWorkout, startWorkout } from './db/workouts.js'
import { useAppUpdate } from './lib/update.js'

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return hash
}

// Phase 1 screens, in the order of the user flow in prd.md. Settings lives
// under #settings so Back returns to wherever you were. An active workout is
// saved as you go and resumes when you return, so it wins over the home screen.
export default function App() {
  const hash = useHash()
  const active = useLiveQuery(getActiveWorkout)
  // Registered here so the worker is set up whichever screen opens first.
  const update = useAppUpdate()
  if (active === undefined) return null

  if (hash.startsWith('#settings/')) return <ExerciseSettings exerciseId={decodeURIComponent(hash.slice('#settings/'.length))} />
  if (hash === '#settings') return <Settings />
  if (active) return <Workout workoutId={active.id} />
  return <Home onStart={(day) => startWorkout(day.id)} update={update} />
}
