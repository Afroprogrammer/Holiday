import { useEffect, useRef, useState } from 'react'
import Illustration from './Illustration.jsx'
import { formatCountdown, progressFraction, remainingSeconds } from '../lib/timer.js'

export const DOCK_HEIGHT = { idle: 76, resting: 236 }

// At zero the device vibrates if it can. Vibration isn't available on iOS web
// apps, so the dock also flashes and plays a short tone if audio is allowed
// (prd.md, "Risks and mitigations").
function signalRestOver() {
  try {
    navigator.vibrate?.(300)
  } catch {
    // Not supported; the flash and tone still run.
  }
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.value = 0.2
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.25)
    osc.onended = () => ctx.close()
  } catch {
    // Audio blocked until the user interacts; nothing else to do.
  }
}

function useNow(active) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return undefined
    const tick = () => setNow(Date.now())
    tick()
    const id = setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [active])
  return now
}

// The rest timer, docked to the bottom of the workout screen. Idle it is one
// line; while resting it shows the countdown, a draining bar, the next
// exercise performing its movement, and ±15 s / Skip.
export default function RestDock({ rest, nextSlug, onAdjust, onSkip }) {
  const now = useNow(Boolean(rest))
  const [flash, setFlash] = useState(false)
  const remaining = rest ? remainingSeconds(rest, now) : null
  // A rest that was already over when the dock mounted (the app was reopened
  // late) shows overtime without flashing or beeping again.
  const firedFor = useRef(rest && remaining <= 0 ? rest.endsAt : null)

  useEffect(() => {
    if (!rest || remaining > 0 || firedFor.current === rest.endsAt) return undefined
    firedFor.current = rest.endsAt
    signalRestOver()
    setFlash(true)
    const id = setTimeout(() => setFlash(false), 1200)
    return () => clearTimeout(id)
  }, [rest, remaining])

  const shell = 'fixed inset-x-0 bottom-0 z-10 border-t border-rule px-5 pb-[calc(18px+env(safe-area-inset-bottom,0px))] pt-3'

  if (!rest) {
    return (
      <aside className={`${shell} bg-card`} style={{ minHeight: DOCK_HEIGHT.idle }}>
        <div className="flex items-center gap-3">
          <span className="font-num text-[44px] font-bold leading-none text-ink-3">–</span>
          <span className="text-sm text-ink-2">
            <b className="block font-semibold text-ink">Rest timer idle</b>
            starts when you tap Done
          </span>
        </div>
      </aside>
    )
  }

  const over = remaining < 0
  const width = `${Math.round(progressFraction(rest, now) * 100)}%`
  return (
    <aside className={`${shell} ${flash ? 'bg-act text-on-act' : 'bg-card'}`} style={{ minHeight: DOCK_HEIGHT.resting }}>
      <div className={`flex justify-between text-[13px] font-medium ${flash ? '' : 'text-ink-2'}`}>
        <span>
          Rest · <b className={flash ? 'font-semibold' : 'font-semibold text-ink'}>{rest.exerciseName}</b>
        </span>
        <span>of {formatCountdown(rest.durationSeconds)}</span>
      </div>
      <div className="mt-1 flex items-center gap-3.5">
        <span role="timer" aria-live="off" className={`flex-1 font-num text-[72px] font-bold leading-none tracking-tighter ${over && !flash ? 'text-flag' : ''}`}>
          {formatCountdown(remaining)}
        </span>
        <Illustration slug={nextSlug} size={64} tone="act" live glow />
      </div>
      <div className="my-2 h-1 overflow-hidden rounded-full bg-rule">
        <i data-testid="rest-bar" className="block h-full bg-act" style={{ width }} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={() => onAdjust(-15)} className="h-12 rounded-xl border border-rule font-semibold">
          −15 s
        </button>
        <button type="button" onClick={() => onAdjust(15)} className="h-12 rounded-xl border border-rule font-semibold">
          +15 s
        </button>
        <button type="button" onClick={onSkip} className="h-12 rounded-xl border border-act font-semibold text-act">
          Skip
        </button>
      </div>
    </aside>
  )
}
