import { useLiveQuery } from 'dexie-react-hooks'
import Home from './screens/Home.jsx'
import Workout from './screens/Workout.jsx'
import { getActiveWorkout, startWorkout } from './db/workouts.js'

// Phase 1 screens are added one pull request at a time, in the order of the
// user flow in prd.md. An active workout is saved as you go and resumes when
// you return, so it wins over the home screen. Settings has no screen yet.
export default function App() {
  const active = useLiveQuery(getActiveWorkout)
  if (active === undefined) return null
  if (active) return <Workout workoutId={active.id} />
  return <Home onStart={(day) => startWorkout(day.id)} />
}
