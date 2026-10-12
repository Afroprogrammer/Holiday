import { useRegisterSW } from 'virtual:pwa-register/react'

// New builds wait for the user (Android install spec, 3.4). `ready` turns
// true when a fresh service worker is installed; `apply` activates it and
// reloads. The registration is also asked to check for updates when the
// app comes back to the foreground.
export function useAppUpdate() {
  const {
    needRefresh: [ready],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => {
        if (document.visibilityState === 'visible') registration.update().catch(() => {})
      }
      document.addEventListener('visibilitychange', check)
    },
  })

  return { ready, apply: () => updateServiceWorker(true) }
}
