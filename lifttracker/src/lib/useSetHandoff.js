import { useEffect, useRef, useState } from 'react'

const LEAVE_MS = 180

// The rest-to-next-set handoff (gym round 1, 2.1). While the rest runs the
// done card shows. When the phase leaves 'running' the card stays for one
// short exit animation, then the steppers come in with `entering`. The
// previous phase is tracked in state and adjusted during render, so the
// exit frame is painted in the same commit the phase changes; Skip removes
// the rest and its set together, so the last card is remembered in a ref.
export function useSetHandoff(phase, cardSet) {
  const lastCard = useRef(null)
  if (cardSet) lastCard.current = cardSet

  const [prevPhase, setPrevPhase] = useState(phase)
  const [leavingSet, setLeavingSet] = useState(null)
  const [entering, setEntering] = useState(false)

  if (phase !== prevPhase) {
    setPrevPhase(phase)
    if (phase === 'running') {
      setLeavingSet(null)
      setEntering(false)
    } else if (prevPhase === 'running' && lastCard.current) {
      setLeavingSet(lastCard.current)
      setEntering(false)
    }
  }

  useEffect(() => {
    if (!leavingSet) return undefined
    const id = setTimeout(() => {
      setLeavingSet(null)
      setEntering(true)
    }, LEAVE_MS)
    return () => clearTimeout(id)
  }, [leavingSet])

  if (phase === 'running' && cardSet) return { card: cardSet, leaving: false, entering: false }
  if (leavingSet && phase !== 'running') return { card: leavingSet, leaving: true, entering: false }
  return { card: null, leaving: false, entering }
}
