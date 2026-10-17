import { useEffect, useRef, useState } from 'react'
import { FLASH_MS, getRegistration, showRestNotification, signalRestOver } from './restNotification.js'

// A clock that ticks while `active`, and again when the tab becomes visible
// so a countdown catches up after the screen was off.
export function useNow(active, ms = 250) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return undefined
    const tick = () => setNow(Date.now())
    tick()
    const id = setInterval(tick, ms)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [active, ms])
  return now
}

// Fires the rest-end signal once when the countdown crosses zero while
// mounted (gym round 2, 3.5): the system notification when allowed (Android
// vibrates it reliably), the in-app vibration and beeps, and `flash` for
// FLASH_MS. Mounted once in App, so the signal happens whichever screen
// shows. A rest that is already over when it first arrives (the app
// reopened late; the queries load after the first render) shows overtime
// without firing again.
export function useRestWatcher(rest, { notify = false, nextSet = null } = {}) {
  const now = useNow(Boolean(rest))
  const [flash, setFlash] = useState(false)
  const over = rest ? rest.endsAt <= now : false
  const firedFor = useRef(null)
  const seen = useRef(null)
  if (rest && seen.current !== rest.endsAt) {
    seen.current = rest.endsAt
    if (rest.endsAt <= Date.now()) firedFor.current = rest.endsAt
  }

  useEffect(() => {
    if (!rest || !over || firedFor.current === rest.endsAt) return
    firedFor.current = rest.endsAt
    if (notify) getRegistration().then((registration) => showRestNotification(registration, rest, nextSet))
    signalRestOver()
    setFlash(true)
  }, [rest, over, notify, nextSet])

  useEffect(() => {
    if (!flash) return undefined
    const id = setTimeout(() => setFlash(false), FLASH_MS)
    return () => clearTimeout(id)
  }, [flash])

  // A new rest, or none, starts clean.
  useEffect(() => {
    setFlash(false)
  }, [rest?.endsAt])

  return flash
}
