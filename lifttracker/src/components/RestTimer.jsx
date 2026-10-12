import { useEffect, useRef, useState } from 'react'
import { formatCountdown, remainingSeconds } from '../lib/timer.js'

// At zero the device vibrates if it can. Vibration isn't available on iOS web
// apps, so the panel also flashes and plays a short tone if audio is allowed
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

// The running rest timer at the bottom of the workout screen, with plus and
// minus 15 second buttons and Skip, which affect the current rest only.
export default function RestTimer({ rest, onAdjust, onSkip }) {
  const [now, setNow] = useState(() => Date.now())
  const [flash, setFlash] = useState(false)
  const firedFor = useRef(null)

  useEffect(() => {
    const tick = () => setNow(Date.now())
    const id = setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])

  const remaining = remainingSeconds(rest, now)

  useEffect(() => {
    if (remaining > 0 || firedFor.current === rest.endsAt) return
    firedFor.current = rest.endsAt
    signalRestOver()
    setFlash(true)
    const id = setTimeout(() => setFlash(false), 1200)
    return () => clearTimeout(id)
  }, [remaining, rest.endsAt])

  return (
    <aside
      role="timer"
      aria-live="off"
      className={`fixed inset-x-4 bottom-4 grid gap-2 rounded-xl border border-act p-3 ${flash ? 'bg-act text-on-act' : 'bg-card'}`}
    >
      <div className="flex items-baseline justify-between text-sm">
        <span className={flash ? '' : 'text-ink-2'}>Rest · {rest.exerciseName}</span>
        <span className={flash ? '' : 'text-ink-2'}>{formatCountdown(rest.durationSeconds)}</span>
      </div>
      <div className="text-center font-num text-5xl font-semibold leading-none tabular-nums">
        {formatCountdown(remaining)}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={() => onAdjust(-15)} className="rounded-md border border-rule py-2 font-medium">
          −15 s
        </button>
        <button type="button" onClick={() => onAdjust(15)} className="rounded-md border border-rule py-2 font-medium">
          +15 s
        </button>
        <button type="button" onClick={onSkip} className="rounded-md border border-rule py-2 font-medium">
          Skip
        </button>
      </div>
    </aside>
  )
}
