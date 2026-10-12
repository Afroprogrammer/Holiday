// Background rest-end alert (Android install spec, 3.2). The page's own
// countdown decides when; this module only builds and shows the system
// notification through the service worker registration, and never throws.

const ICON = 'icon-192.png'

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
      vibrate: [300, 100, 300],
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
