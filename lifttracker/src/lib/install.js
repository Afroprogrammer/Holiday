import { useCallback, useEffect, useRef, useState } from 'react'

// Install from inside the app (Android install spec, 3.3). Chrome fires
// `beforeinstallprompt` when the app qualifies; we keep the event and show
// it when the user taps Install. Dismissal hides the offer for the session.
function isStandalone() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches
}

export function useInstallPrompt() {
  const eventRef = useRef(null)
  const [canInstall, setCanInstall] = useState(false)
  const [installed, setInstalled] = useState(() => isStandalone())

  useEffect(() => {
    const onPrompt = (e) => {
      e.preventDefault()
      eventRef.current = e
      setCanInstall(true)
    }
    const onInstalled = () => {
      eventRef.current = null
      setCanInstall(false)
      setInstalled(true)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    const e = eventRef.current
    if (!e) return 'unavailable'
    eventRef.current = null
    setCanInstall(false)
    try {
      await e.prompt()
      const choice = await e.userChoice
      return choice?.outcome ?? 'dismissed'
    } catch {
      return 'dismissed'
    }
  }, [])

  return { canInstall, installed, install }
}
