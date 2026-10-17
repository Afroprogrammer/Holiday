import Illustration from './Illustration.jsx'
import { formatCountdown, progressFraction, remainingSeconds } from '../lib/timer.js'
import { useNow } from '../lib/useRestWatcher.js'

export const DOCK_HEIGHT = { idle: 76, resting: 236 }

// The rest timer, docked to the bottom of the workout screen. Idle it is one
// line; while resting it shows the countdown, a draining bar, the next
// exercise performing its movement, and ±15 s / Skip. The rest-end signal
// is App's (useRestWatcher); `flash` paints the moment amber here.
export default function RestDock({ rest, nextSlug, flash = false, onAdjust, onSkip }) {
  const now = useNow(Boolean(rest))
  const remaining = rest ? remainingSeconds(rest, now) : null
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
