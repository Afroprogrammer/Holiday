import Home from './screens/Home.jsx'

// Phase 1 screens are added one pull request at a time, in the order of the
// user flow in prd.md. Start goes nowhere until the workout screen exists.
export default function App() {
  return <Home onStart={() => {}} />
}
