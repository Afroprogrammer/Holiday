// Background rest-end alert (Android install spec, 3.2). The page's own
// countdown decides when; this module only builds and shows the system
// notification through the service worker registration, and never throws.

const ICON = 'icon-192.png'
export const VIBRATE = [300, 100, 300, 100, 300]
export const FLASH_MS = 2500

function base() {
  const b = (import.meta.env && import.meta.env.BASE_URL) || '/'
  return b.endsWith('/') ? b : `${b}/`
}

export function notificationsSupported() {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator
}

export function notificationPermission() {
  if (!notificationsSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return Notification.permission
  }
}

export async function getRegistration() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.ready
  } catch {
    return null
  }
}

export function buildRestNotification(rest, nextSet) {
  const body = nextSet
    ? `${nextSet.exerciseName} · set ${nextSet.setNumber} of ${nextSet.total} next`
    : `${rest.exerciseName} · all sets done`
  return {
    title: 'Rest over',
    options: {
      body,
      tag: 'rest',
      vibrate: VIBRATE,
      icon: `${base()}${ICON}`,
      data: { url: base() },
    },
  }
}

export async function showRestNotification(registration, rest, nextSet) {
  if (!registration?.showNotification) return
  const { title, options } = buildRestNotification(rest, nextSet)
  try {
    await registration.showNotification(title, options)
  } catch {
    // Permission revoked or platform refusal: the in-app flash still runs.
  }
}

export async function closeRestNotifications(registration) {
  if (!registration?.getNotifications) return
  try {
    const open = await registration.getNotifications({ tag: 'rest' })
    for (const n of open) n.close()
  } catch {
    // Nothing to close.
  }
}

// The in-app signal at zero: a three-pulse vibration and two beeps. Chrome
// on Android drops both when the page was not tapped recently, which is
// why the system notification is sent as well (RestDock). Never throws.
export function signalRestOver() {
  try {
    navigator.vibrate?.(VIBRATE)
  } catch {
    // Not supported; the flash and tone still run.
  }
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const play = () => {
      const t0 = ctx.currentTime
      for (const at of [0, 0.35]) {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.frequency.value = 880
        gain.gain.value = 0.5
        osc.connect(gain).connect(ctx.destination)
        osc.start(t0 + at)
        osc.stop(t0 + at + 0.25)
      }
      setTimeout(() => ctx.close?.(), 1500)
    }
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume().then(play, play)
    else play()
  } catch {
    // Audio blocked; nothing else to do.
  }
}

// Settings → "Test buzz": the same notification and in-app signal, now.
export async function testBuzz(registration) {
  signalRestOver()
  if (!registration?.showNotification) return
  try {
    await registration.showNotification('Test buzz', {
      body: 'This is what a finished rest feels like.',
      tag: 'rest',
      vibrate: VIBRATE,
      icon: `${base()}${ICON}`,
      data: { url: base() },
    })
  } catch {
    // Permission revoked: the in-app signal already ran.
  }
}
