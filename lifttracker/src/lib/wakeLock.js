import { useEffect, useState } from 'react'

// Keeps the screen on while `enabled` (Android install spec, 3.1). The
// browser drops the lock whenever the page is hidden, so it is requested
// again on return. Every failure is silent: the screen then behaves as
// before.
export function useWakeLock(enabled) {
  const [held, setHeld] = useState(false)

  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return undefined
    let sentinel = null
    let cancelled = false

    const acquire = async () => {
      if (cancelled || sentinel || document.visibilityState !== 'visible') return
      try {
        const s = await navigator.wakeLock.request('screen')
        if (cancelled) {
          await s.release()
          return
        }
        sentinel = s
        s.addEventListener?.('release', () => {
          sentinel = null
          if (!cancelled) setHeld(false)
        })
        setHeld(true)
      } catch {
        // Unsupported, denied, or low battery: leave the screen alone.
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible') acquire()
    }
    acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      const s = sentinel
      sentinel = null
      setHeld(false)
      s?.release().catch(() => {})
    }
  }, [enabled])

  return { held }
}
