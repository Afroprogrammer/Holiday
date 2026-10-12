# LiftTracker Android install and alerts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the installed Android PWA keep the screen on during a workout, raise a notification when a rest ends in the background, offer Install and Update from Home at the right moments, and move history between phones as a JSON file.

**Architecture:** Each capability is a small hook or pure module under `src/lib/` with a unit test, composed by the existing screens. The service worker stays `generateSW`; one static `public/sw-notify.js` is imported for the notification click. Backup is two pure functions plus two Dexie functions. New settings keys are seeded and backfilled through the existing `seedIfEmpty` path. Dexie schema stays at version 1.

**Tech Stack:** React 19, Vite 8, `vite-plugin-pwa` 2.0.0 (`virtual:pwa-register/react`), Dexie 4, Vitest 5 (+ jsdom, @testing-library/react, fake-indexeddb already installed), Tailwind 4, oxlint. All commands run from `lifttracker/`.

**Spec:** `docs/superpowers/specs/2026-10-12-lifttracker-android-install-design.md`

## Global Constraints

- Branch `feature/android-install`; never commit to `main`.
- Run every command from `/Users/administrator/Documents/liftApp/Holiday/lifttracker`.
- Dexie schema stays at `db.version(1)`; no new tables. `src/db/db.js` is not touched.
- Android Chrome first. No iOS-specific work. Nothing may throw in Safari: every browser API is feature-detected (`'wakeLock' in navigator`, `'Notification' in window`, `navigator.serviceWorker`).
- No runtime network fetches beyond the service worker's own update check.
- Tokens only in JSX (`bg-act`, `text-ink-2`, ...). Rows use the existing `min-h-14 border-b border-rule` style. Tap targets at least 44 px.
- Component tests use `// @vitest-environment jsdom` as the first line and `afterEach(cleanup)`.
- `npm test` and `npm run lint` pass before each commit. Commit messages: plain English, imperative, one line.
- The spec's done criteria (section 7) are checked on Franklin's Android phone after Task 8; they are not automated.

## Review Focus

1. Rest ends while hidden on a browser without service worker support or without `Notification`: nothing throws, the in-app flash still fires on return. Tested in Task 4 (`showRestNotification` with `registration = null` resolves without error).
2. Import of a backup with an unknown settings key or a workout referencing a missing program day: import still succeeds and the app does not crash on Home. Tested in Task 7 (`parseBackup` accepts extra settings; `importBackup` round trip keeps unknown keys).
3. `beforeinstallprompt` fires after Home has rendered: the Install row must appear without a reload. Tested in Task 5 (event dispatched after render).
4. Wake lock refused (`request` rejects): no unhandled rejection, no retry loop. Tested in Task 3 (stub rejects; `held` stays false; one call only).
5. Update ready while on Workout: no banner there, banner on Home after Finish. Tested in Task 6 only at the hook level (`useAppUpdate` exposes `ready`); the screen rule is "only Home renders `UpdateBanner`", checked by the tap-targets-style source test in Task 6.

---

### Task 1: New settings keys with backfill

**Files:**
- Modify: `src/db/program.js:110-115` (`defaultSettings`)
- Modify: `src/db/seed.js` (`backfill` also fills missing settings keys)
- Test: `src/test/seed.test.js` (append)

**Interfaces:**
- Produces: settings keys `keepScreenOn` (true), `restNotification` (true), `restNotificationAsked` (false), present on fresh installs and backfilled on existing ones. `SETTING_KEYS` exported from `src/db/settings.js`: `{ keepScreenOn: 'keepScreenOn', restNotification: 'restNotification', restNotificationAsked: 'restNotificationAsked' }`.

- [ ] **Step 1: Write the failing test**

Append to `src/test/seed.test.js` inside `describe('seedIfEmpty')`:

```js
  it('seeds the workout preference keys', async () => {
    await seedIfEmpty(database)
    expect((await database.settings.get('keepScreenOn')).value).toBe(true)
    expect((await database.settings.get('restNotification')).value).toBe(true)
    expect((await database.settings.get('restNotificationAsked')).value).toBe(false)
  })

  it('backfills missing settings keys without touching stored ones', async () => {
    await seedIfEmpty(database)
    await database.settings.delete('keepScreenOn')
    await database.settings.put({ key: 'restNotification', value: false })
    await seedIfEmpty(database)
    expect((await database.settings.get('keepScreenOn')).value).toBe(true)
    expect((await database.settings.get('restNotification')).value).toBe(false)
  })
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/test/seed.test.js`
Expected: 2 failures, `Cannot read properties of undefined (reading 'value')`.

- [ ] **Step 3: Add the keys and the backfill**

In `src/db/program.js` replace `defaultSettings` with:

```js
// Global defaults for new installs ("Rest timer", third bullet; Android
// install spec, sections 3.1 and 3.2). Missing keys are backfilled on launch.
export const defaultSettings = [
  { key: 'defaultRestCompoundSeconds', value: 90 },
  { key: 'defaultRestIsolationSeconds', value: 60 },
  { key: 'nextProgramDayId', value: 'push-a' },
  { key: 'firstRunShown', value: false },
  { key: 'keepScreenOn', value: true },
  { key: 'restNotification', value: true },
  { key: 'restNotificationAsked', value: false },
]
```

In `src/db/seed.js` replace `backfill` with:

```js
async function backfill(database) {
  for (const seeded of exercises) {
    const stored = await database.exercises.get(seeded.id)
    if (stored && !stored.illustration) {
      await database.exercises.update(seeded.id, { illustration: seeded.illustration })
    }
  }
  for (const setting of defaultSettings) {
    const stored = await database.settings.get(setting.key)
    if (!stored) await database.settings.add(setting)
  }
}
```

Export the key names from `src/db/settings.js` (append):

```js
export const SETTING_KEYS = {
  keepScreenOn: 'keepScreenOn',
  restNotification: 'restNotification',
  restNotificationAsked: 'restNotificationAsked',
}
```

- [ ] **Step 4: Run tests**

Run: `npm test && npm run lint`
Expected: 107 passed, lint clean.

- [ ] **Step 5: Commit**

```bash
git add src/db/program.js src/db/seed.js src/db/settings.js src/test/seed.test.js
git commit -m "Seed and backfill the workout preference settings"
```

---

### Task 2: Switch and SettingRow components

**Files:**
- Create: `src/components/Switch.jsx`, `src/components/SettingRow.jsx`
- Test: `src/test/controls.test.jsx` (append)

**Interfaces:**
- `Switch({ checked, onChange, label, disabled })`: 44×26 px toggle, `role="switch"`, `aria-checked`, `aria-label={label}`; calls `onChange(!checked)` on click unless disabled.
- `SettingRow({ label, caption, children, onClick })`: `min-h-14` row; renders a `<button>` when `onClick` is given, else a `<div>`; `children` sit on the right.

- [ ] **Step 1: Write the failing tests**

Append to `src/test/controls.test.jsx` (add `import Switch from '../components/Switch.jsx'` and `import SettingRow from '../components/SettingRow.jsx'` at the top):

```jsx
describe('Switch', () => {
  it('toggles and reports its state', () => {
    const onChange = vi.fn()
    const { rerender } = render(<Switch checked={false} onChange={onChange} label="Keep screen on" />)
    const sw = screen.getByRole('switch', { name: 'Keep screen on' })
    expect(sw.getAttribute('aria-checked')).toBe('false')
    fireEvent.click(sw)
    expect(onChange).toHaveBeenCalledWith(true)
    rerender(<Switch checked onChange={onChange} label="Keep screen on" disabled />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})

describe('SettingRow', () => {
  it('is a button only when it has an action', () => {
    const onClick = vi.fn()
    const { rerender } = render(<SettingRow label="Export history" caption="Saves a file" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: /export history/i }))
    expect(onClick).toHaveBeenCalled()
    rerender(<SettingRow label="Keep screen on"><span>x</span></SettingRow>)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('Keep screen on')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/test/controls.test.jsx`
Expected: FAIL, modules not found.

- [ ] **Step 3: Write `Switch.jsx`**

```jsx
// A 44×26 toggle. The knob slides; the track takes the accent when on.
export default function Switch({ checked, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative h-11 w-14 shrink-0 disabled:opacity-40`}
    >
      <span className={`absolute inset-x-1 top-1/2 h-[26px] -translate-y-1/2 rounded-full transition-colors ${checked ? 'bg-act' : 'bg-raised border border-rule'}`} />
      <span
        className={`absolute top-1/2 h-[22px] w-[22px] -translate-y-1/2 rounded-full transition-transform ${checked ? 'translate-x-[26px] bg-on-act' : 'translate-x-[6px] bg-ink-3'}`}
      />
    </button>
  )
}
```

- [ ] **Step 4: Write `SettingRow.jsx`**

```jsx
// One settings row: label and caption on the left, a control or chevron on
// the right. With `onClick` the whole row is the tap target.
export default function SettingRow({ label, caption, children, onClick }) {
  const inner = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-base">{label}</span>
        {caption && <span className="block text-[13px] text-ink-2">{caption}</span>}
      </span>
      {children}
    </>
  )
  const cls = 'flex min-h-14 w-full items-center gap-3 border-b border-rule py-2 text-left'
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {inner}
      </button>
    )
  }
  return <div className={cls}>{inner}</div>
}
```

- [ ] **Step 5: Run tests and commit**

Run: `npm test && npm run lint`
Expected: 109 passed.

```bash
git add src/components/Switch.jsx src/components/SettingRow.jsx src/test/controls.test.jsx
git commit -m "Add Switch and SettingRow controls"
```

---

### Task 3: Keep the screen on

**Files:**
- Create: `src/lib/wakeLock.js`
- Modify: `src/screens/Workout.jsx` (call the hook), `src/screens/Settings.jsx` (new "Workout" group with the switch)
- Test: `src/test/wakeLock.test.jsx`

**Interfaces:**
- `useWakeLock(enabled)` → `{ held: boolean }`.
- Settings `getSetting(SETTING_KEYS.keepScreenOn)` read with `useLiveQuery` in Workout; `undefined` while loading is treated as `true`.

- [ ] **Step 1: Write the failing test**

Create `src/test/wakeLock.test.jsx`:

```jsx
// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useWakeLock } from '../lib/wakeLock.js'

afterEach(cleanup)

function Probe({ enabled }) {
  const { held } = useWakeLock(enabled)
  return <span>{held ? 'held' : 'free'}</span>
}

function stubWakeLock(impl) {
  Object.defineProperty(navigator, 'wakeLock', { value: { request: impl }, configurable: true })
}

describe('useWakeLock', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  })

  it('requests a screen lock while enabled and releases it on disable', async () => {
    const release = vi.fn().mockResolvedValue()
    const request = vi.fn().mockResolvedValue({ release, addEventListener: () => {} })
    stubWakeLock(request)
    const { rerender } = render(<Probe enabled />)
    await act(async () => {})
    expect(request).toHaveBeenCalledWith('screen')
    expect(screen.getByText('held')).toBeTruthy()
    rerender(<Probe enabled={false} />)
    await act(async () => {})
    expect(release).toHaveBeenCalled()
    expect(screen.getByText('free')).toBeTruthy()
  })

  it('re-requests when the page becomes visible again', async () => {
    const request = vi.fn().mockResolvedValue({ release: vi.fn().mockResolvedValue(), addEventListener: () => {} })
    stubWakeLock(request)
    render(<Probe enabled />)
    await act(async () => {})
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('stays free and calls once when the request is refused', async () => {
    const request = vi.fn().mockRejectedValue(new Error('NotAllowedError'))
    stubWakeLock(request)
    render(<Probe enabled />)
    await act(async () => {})
    expect(request).toHaveBeenCalledTimes(1)
    expect(screen.getByText('free')).toBeTruthy()
  })

  it('does nothing without the API', async () => {
    delete navigator.wakeLock
    render(<Probe enabled />)
    await act(async () => {})
    expect(screen.getByText('free')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/test/wakeLock.test.jsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Write `src/lib/wakeLock.js`**

```js
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
```

- [ ] **Step 4: Use it in Workout and expose the setting**

In `src/screens/Workout.jsx` add imports:

```jsx
import { getSetting, SETTING_KEYS } from '../db/settings.js'
import { useWakeLock } from '../lib/wakeLock.js'
```

After `const rest = useLiveQuery(getActiveRest)` add:

```jsx
  const keepScreenOn = useLiveQuery(() => getSetting(SETTING_KEYS.keepScreenOn))
  useWakeLock(keepScreenOn !== false)
```

(Hooks must run before the early `return null`; place these above it.)

In `src/screens/Settings.jsx` add imports `import SettingRow from '../components/SettingRow.jsx'`, `import Switch from '../components/Switch.jsx'`, and `SETTING_KEYS` to the settings import. Add a small component above `Settings`:

```jsx
function BoolSetting({ settingKey, label, caption, disabled = false, disabledCaption }) {
  const stored = useLiveQuery(() => getSetting(settingKey), [settingKey])
  if (stored === undefined) return null
  return (
    <SettingRow label={label} caption={disabled ? disabledCaption : caption}>
      <Switch checked={Boolean(stored)} disabled={disabled} onChange={(v) => setSetting(settingKey, v)} label={label} />
    </SettingRow>
  )
}
```

Insert before `<Group>Program</Group>`:

```jsx
      <Group>Workout</Group>
      <BoolSetting settingKey={SETTING_KEYS.keepScreenOn} label="Keep screen on during workout" caption="while the workout screen is open" />
```

- [ ] **Step 5: Run tests, lint, look**

Run: `npm test && npm run lint`
Expected: 113 passed.

In the dev server at 375 px: Settings shows the Workout group with a switch that toggles and persists across reload.

- [ ] **Step 6: Commit**

```bash
git add src/lib/wakeLock.js src/screens/Workout.jsx src/screens/Settings.jsx src/test/wakeLock.test.jsx
git commit -m "Keep the screen on during a workout"
```

---

### Task 4: Rest-end notification in the background

**Files:**
- Create: `src/lib/restNotification.js`, `public/sw-notify.js`
- Modify: `vite.config.js` (`workbox.importScripts`), `src/components/RestDock.jsx` (hidden branch, `nextSet` and `notify` props), `src/screens/Workout.jsx` (permission sheet, props, close on Done/Skip), `src/screens/Settings.jsx` (row)
- Test: `src/test/restNotification.test.js`, `src/test/restdock.test.jsx` (append)

**Interfaces:**
- `buildRestNotification(rest, nextSet)` where `nextSet = { exerciseName, setNumber, total } | null` → `{ title: 'Rest over', options: { body, tag: 'rest', vibrate: [300, 100, 300], icon, data: { url } } }`.
- `showRestNotification(registration, rest, nextSet)` → Promise; resolves without error when `registration` is null or `showNotification` throws.
- `closeRestNotifications(registration)` → Promise.
- `notificationsSupported()` → boolean. `notificationPermission()` → `'granted' | 'denied' | 'default' | 'unsupported'`.
- `getRegistration()` → Promise<ServiceWorkerRegistration | null>.
- `RestDock` new props: `nextSet` (object or null), `notify` (boolean).

- [ ] **Step 1: Write the failing tests**

Create `src/test/restNotification.test.js`:

```js
import { describe, expect, it, vi } from 'vitest'
import { buildRestNotification, closeRestNotifications, showRestNotification } from '../lib/restNotification.js'

const rest = { exerciseId: 'barbell-bench-press', exerciseName: 'Barbell bench press', durationSeconds: 90, startedAt: 0, endsAt: 90_000 }

describe('buildRestNotification', () => {
  it('names the next set', () => {
    const n = buildRestNotification(rest, { exerciseName: 'Barbell bench press', setNumber: 3, total: 4 })
    expect(n.title).toBe('Rest over')
    expect(n.options.body).toBe('Barbell bench press · set 3 of 4 next')
    expect(n.options.tag).toBe('rest')
    expect(n.options.vibrate).toEqual([300, 100, 300])
    expect(n.options.icon).toMatch(/icon-192\.png$/)
    expect(n.options.data.url).toMatch(/\/$/)
  })

  it('says all sets done when nothing is next', () => {
    expect(buildRestNotification(rest, null).options.body).toBe('Barbell bench press · all sets done')
  })
})

describe('showRestNotification', () => {
  it('calls showNotification on the registration', async () => {
    const registration = { showNotification: vi.fn().mockResolvedValue() }
    await showRestNotification(registration, rest, null)
    expect(registration.showNotification).toHaveBeenCalledWith('Rest over', expect.objectContaining({ tag: 'rest' }))
  })

  it('resolves quietly with no registration or a failing one', async () => {
    await expect(showRestNotification(null, rest, null)).resolves.toBeUndefined()
    await expect(showRestNotification({ showNotification: () => Promise.reject(new Error('x')) }, rest, null)).resolves.toBeUndefined()
  })
})

describe('closeRestNotifications', () => {
  it('closes every notification tagged rest', async () => {
    const close = vi.fn()
    const registration = { getNotifications: vi.fn().mockResolvedValue([{ close }, { close }]) }
    await closeRestNotifications(registration)
    expect(registration.getNotifications).toHaveBeenCalledWith({ tag: 'rest' })
    expect(close).toHaveBeenCalledTimes(2)
    await expect(closeRestNotifications(null)).resolves.toBeUndefined()
  })
})
```

Append to `src/test/restdock.test.jsx`:

```jsx
  it('raises a notification at zero only while hidden and allowed', async () => {
    vi.useFakeTimers()
    const now = 1_000_000
    vi.setSystemTime(now)
    const showNotification = vi.fn().mockResolvedValue()
    Object.defineProperty(navigator, 'serviceWorker', { value: { ready: Promise.resolve({ showNotification }) }, configurable: true })
    Object.defineProperty(document, 'hidden', { value: true, configurable: true })
    const rest = startRest({ exerciseId: 'deadlift', exerciseName: 'Deadlift', restSeconds: 2 }, now)
    const next = { exerciseName: 'Deadlift', setNumber: 2, total: 3 }
    const { rerender } = render(<RestDock rest={rest} nextSlug="deadlift" nextSet={next} notify onAdjust={() => {}} onSkip={() => {}} />)
    await act(async () => {
      vi.advanceTimersByTime(2_250)
    })
    await act(async () => {})
    expect(showNotification).toHaveBeenCalledWith('Rest over', expect.objectContaining({ body: 'Deadlift · set 2 of 3 next' }))
    showNotification.mockClear()
    Object.defineProperty(document, 'hidden', { value: false, configurable: true })
    const second = startRest({ exerciseId: 'deadlift', exerciseName: 'Deadlift', restSeconds: 2 }, Date.now())
    rerender(<RestDock rest={second} nextSlug="deadlift" nextSet={next} notify onAdjust={() => {}} onSkip={() => {}} />)
    await act(async () => {
      vi.advanceTimersByTime(2_250)
    })
    await act(async () => {})
    expect(showNotification).not.toHaveBeenCalled()
    vi.useRealTimers()
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/test/restNotification.test.js src/test/restdock.test.jsx`
Expected: FAIL, module not found; dock test fails on `showNotification` not called.

- [ ] **Step 3: Write `src/lib/restNotification.js`**

```js
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
```

- [ ] **Step 4: Write `public/sw-notify.js` and import it**

```js
// Imported into the generated service worker (vite.config.js,
// workbox.importScripts). Tapping a rest notification focuses the app.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || self.registration.scope
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus()
      }
      return self.clients.openWindow(url)
    }),
  )
})
```

In `vite.config.js`, inside `workbox: { ... }` add after `globPatterns`:

```js
        importScripts: ['sw-notify.js'],
```

- [ ] **Step 5: Wire the dock**

In `src/components/RestDock.jsx` import `import { getRegistration, showRestNotification } from '../lib/restNotification.js'`, change the signature to `RestDock({ rest, nextSlug, nextSet = null, notify = false, onAdjust, onSkip })`, and replace the zero-crossing effect with:

```jsx
  // Fire once when the countdown crosses zero while mounted. In the
  // background the system notification stands in for the flash and tone.
  useEffect(() => {
    if (!rest || remaining > 0 || firedFor.current === rest.endsAt) return
    firedFor.current = rest.endsAt
    if (notify && document.hidden) {
      getRegistration().then((registration) => showRestNotification(registration, rest, nextSet))
      return
    }
    signalRestOver()
    setFlash(true)
  }, [rest, remaining, notify, nextSet])
```

- [ ] **Step 6: Wire the workout screen**

In `src/screens/Workout.jsx`:

Imports to add:

```jsx
import { closeRestNotifications, getRegistration, notificationPermission, requestNotificationPermission } from '../lib/restNotification.js'
import { setSetting } from '../db/settings.js'
```

(`getSetting`, `SETTING_KEYS` already imported in Task 3; merge into one import line.)

State and queries, next to `keepScreenOn`:

```jsx
  const notifyPref = useLiveQuery(() => getSetting(SETTING_KEYS.restNotification))
  const askedPref = useLiveQuery(() => getSetting(SETTING_KEYS.restNotificationAsked))
  const [askingNotify, setAskingNotify] = useState(false)
```

Replace `done` with:

```jsx
  const done = async (setNumber, values) => {
    await logSet({ workoutId: workout.id, exerciseId: active.exercise.id, setNumber, ...values })
    await saveActiveRest(startRest({ exerciseId: active.exercise.id, exerciseName: shortName(active.exercise.name), restSeconds: active.exercise.restSeconds }))
    getRegistration().then(closeRestNotifications)
    if (notificationPermission() === 'default' && askedPref === false) setAskingNotify(true)
  }
```

Compute, after `nextSlug`:

```jsx
  const notify = notifyPref !== false && notificationPermission() === 'granted'
  const nextSet = (() => {
    if (!rest) return null
    // After this rest the next set is the row that is open now, or the
    // first open row of the next exercise in the queue.
    if (activeRow) return { exerciseName: shortName(active.exercise.name), setNumber: activeRow.n, total: active.total }
    return null
  })()
```

Dock call becomes:

```jsx
      <RestDock
        rest={rest}
        nextSlug={nextSlug}
        nextSet={nextSet}
        notify={notify}
        onAdjust={(delta) => saveActiveRest(adjustRest(rest, delta))}
        onSkip={() => {
          saveActiveRest(null)
          getRegistration().then(closeRestNotifications)
        }}
      />
```

Permission sheet, after the Finish `BottomSheet`:

```jsx
      <BottomSheet open={askingNotify} title="Buzz when a rest ends?" onClose={() => setAskingNotify(false)}>
        <p className="mt-1 mb-3.5 text-[15px] text-ink-2">Only used when you leave the app during a rest.</p>
        <button
          type="button"
          onClick={async () => {
            await setSetting(SETTING_KEYS.restNotificationAsked, true)
            setAskingNotify(false)
            await requestNotificationPermission()
          }}
          className="mb-2.5 h-[60px] w-full rounded-2xl bg-act text-lg font-semibold text-on-act"
        >
          Allow
        </button>
        <button
          type="button"
          onClick={async () => {
            await setSetting(SETTING_KEYS.restNotificationAsked, true)
            setAskingNotify(false)
          }}
          className="h-[52px] w-full rounded-2xl border border-rule font-semibold text-ink-2"
        >
          Not now
        </button>
      </BottomSheet>
```

- [ ] **Step 7: Settings row**

In `src/screens/Settings.jsx` import `notificationPermission, requestNotificationPermission` from `../lib/restNotification.js`. Add under the keep-screen-on row:

```jsx
      <NotifySetting />
```

and the component above `Settings`:

```jsx
function NotifySetting() {
  const stored = useLiveQuery(() => getSetting(SETTING_KEYS.restNotification))
  const [permission, setPermission] = useState(() => notificationPermission())
  if (stored === undefined) return null
  const blocked = permission === 'denied'
  const unsupported = permission === 'unsupported'
  const caption = unsupported ? 'Not available on this browser' : blocked ? 'Blocked in Android settings' : 'when you leave the app during a rest'
  return (
    <SettingRow label="Buzz when a rest ends" caption={caption}>
      <Switch
        checked={Boolean(stored) && permission === 'granted'}
        disabled={blocked || unsupported}
        label="Buzz when a rest ends"
        onChange={async (on) => {
          if (on && permission === 'default') setPermission(await requestNotificationPermission())
          await setSetting(SETTING_KEYS.restNotification, on)
          await setSetting(SETTING_KEYS.restNotificationAsked, true)
        }}
      />
    </SettingRow>
  )
}
```

- [ ] **Step 8: Run tests, lint, build, look**

Run: `npm test && npm run lint && npm run build && grep -c "sw-notify" dist/sw.js`
Expected: 119 passed, lint clean, build ok, `1`.

Dev server: tap Done → permission sheet once; "Not now" never returns; Settings row reflects permission. (Real notification behaviour is checked on the phone, spec section 7.)

- [ ] **Step 9: Commit**

```bash
git add src/lib/restNotification.js public/sw-notify.js vite.config.js src/components/RestDock.jsx src/screens/Workout.jsx src/screens/Settings.jsx src/test/restNotification.test.js src/test/restdock.test.jsx
git commit -m "Raise a notification when a rest ends in the background"
```

---

### Task 5: Install from Home

**Files:**
- Create: `src/lib/install.js`
- Modify: `src/screens/Home.jsx`
- Test: `src/test/install.test.jsx`

**Interfaces:**
- `useInstallPrompt()` → `{ canInstall, installed, install }`. `install()` → Promise<'accepted' | 'dismissed' | 'unavailable'>.

- [ ] **Step 1: Write the failing test**

Create `src/test/install.test.jsx`:

```jsx
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useInstallPrompt } from '../lib/install.js'

afterEach(cleanup)

function Probe() {
  const { canInstall, installed, install } = useInstallPrompt()
  return (
    <div>
      <span>{installed ? 'installed' : canInstall ? 'can' : 'no'}</span>
      <button type="button" onClick={install}>go</button>
    </div>
  )
}

function fakePromptEvent(outcome) {
  const e = new Event('beforeinstallprompt')
  e.prompt = vi.fn().mockResolvedValue()
  e.userChoice = Promise.resolve({ outcome })
  return e
}

describe('useInstallPrompt', () => {
  it('starts hidden, shows after the browser offers, and hides after dismissal', async () => {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
    render(<Probe />)
    expect(screen.getByText('no')).toBeTruthy()
    const e = fakePromptEvent('dismissed')
    await act(async () => {
      window.dispatchEvent(e)
    })
    expect(screen.getByText('can')).toBeTruthy()
    await act(async () => {
      fireEvent.click(screen.getByText('go'))
    })
    expect(e.prompt).toHaveBeenCalled()
    expect(screen.getByText('no')).toBeTruthy()
  })

  it('reports installed after acceptance and when already standalone', async () => {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
    render(<Probe />)
    await act(async () => {
      window.dispatchEvent(fakePromptEvent('accepted'))
    })
    await act(async () => {
      fireEvent.click(screen.getByText('go'))
      window.dispatchEvent(new Event('appinstalled'))
    })
    expect(screen.getByText('installed')).toBeTruthy()
    cleanup()
    window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} })
    render(<Probe />)
    expect(screen.getByText('installed')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/test/install.test.jsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Write `src/lib/install.js`**

```js
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
```

- [ ] **Step 4: Home row**

In `src/screens/Home.jsx` import `import { useInstallPrompt } from '../lib/install.js'`, call `const { canInstall, installed, install } = useInstallPrompt()` next to the other hooks (above the early return), and insert between the strip `</div>` and the `<dl className="mt-6 ...">`:

```jsx
          {canInstall && !installed && (
            <div className="mt-5 flex items-center gap-3 rounded-2xl border border-rule bg-card px-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold">Install on this phone</span>
                <span className="block text-[13px] text-ink-2">Opens full screen, works offline</span>
              </span>
              <button type="button" onClick={install} className="h-11 shrink-0 rounded-xl bg-act px-4 font-semibold text-on-act">
                Install
              </button>
            </div>
          )}
```

- [ ] **Step 5: Run tests, lint, commit**

Run: `npm test && npm run lint`
Expected: 121 passed.

```bash
git add src/lib/install.js src/screens/Home.jsx src/test/install.test.jsx
git commit -m "Offer install from the home screen"
```

---

### Task 6: Update banner on Home only

**Files:**
- Create: `src/lib/update.js`, `src/components/UpdateBanner.jsx`
- Modify: `vite.config.js` (`registerType: 'prompt'`, `injectRegister: false`), `src/screens/Home.jsx`
- Test: `src/test/update-placement.test.js`

**Interfaces:**
- `useAppUpdate()` → `{ ready: boolean, apply: () => void }`.
- `UpdateBanner()` renders the banner or `null`.

- [ ] **Step 1: Write the failing test**

Create `src/test/update-placement.test.js`:

```js
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// The update banner belongs on Home only; a reload must never interrupt a
// workout (Android install spec, 3.4).
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

describe('update banner placement', () => {
  it('is rendered by Home', () => {
    expect(src('screens/Home.jsx')).toMatch(/<UpdateBanner \/>/)
  })
  it.each(['screens/Workout.jsx', 'screens/Settings.jsx', 'screens/ExerciseSettings.jsx'])('is absent from %s', (file) => {
    expect(src(file)).not.toMatch(/UpdateBanner/)
  })
  it('uses prompt registration without the injected script', () => {
    const cfg = src('../vite.config.js')
    expect(cfg).toMatch(/registerType: 'prompt'/)
    expect(cfg).toMatch(/injectRegister: false/)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/test/update-placement.test.js`
Expected: 2 failures (Home lacks the banner; config still `autoUpdate`).

- [ ] **Step 3: Config and hook**

In `vite.config.js` change `registerType: 'autoUpdate',` to:

```js
      registerType: 'prompt',
      injectRegister: false,
```

Create `src/lib/update.js`:

```js
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
```

Create `src/components/UpdateBanner.jsx`:

```jsx
import { useAppUpdate } from '../lib/update.js'

// Slim banner under the Home header. Only Home renders it.
export default function UpdateBanner() {
  const { ready, apply } = useAppUpdate()
  if (!ready) return null
  return (
    <div className="mt-2 flex items-center gap-3 rounded-xl border border-act/50 bg-card px-4 py-2">
      <span className="min-w-0 flex-1 text-[15px] font-semibold">New version ready</span>
      <button type="button" onClick={apply} className="h-11 shrink-0 px-2 font-semibold text-act">
        Update
      </button>
    </div>
  )
}
```

In `src/screens/Home.jsx` import `UpdateBanner` and render `<UpdateBanner />` directly after the `</header>` line.

Vitest resolves `virtual:pwa-register/react` only through the plugin; the placement test reads source text, so no jsdom test imports the hook. Add to `vite.config.js` `test` block nothing; the plugin is active in Vitest because it shares the config.

- [ ] **Step 4: Run tests, lint, build**

Run: `npm test && npm run lint && npm run build && ls dist/registerSW.js 2>/dev/null || echo "no injected script (expected)"`
Expected: 125 passed; build ok; final line `no injected script (expected)`.

Dev server (`npm run dev` has the plugin in dev mode disabled by default, so the banner is only testable with `npm run preview` after a build): build, `npm run preview`, open, then change any text, build again, reload Home once: banner appears; tap Update: new text shows.

- [ ] **Step 5: Commit**

```bash
git add vite.config.js src/lib/update.js src/components/UpdateBanner.jsx src/screens/Home.jsx src/test/update-placement.test.js
git commit -m "Show new versions as a banner on the home screen"
```

---

### Task 7: Backup to a file and restore

**Files:**
- Create: `src/lib/backup.js`, `src/db/backup.js`
- Modify: `src/screens/Settings.jsx` ("Backup" group, import sheet)
- Test: `src/test/backup.test.js`, `src/test/backup-db.test.js`

**Interfaces:**
- `serializeBackup({ exercises, programDays, workouts, sets, settings })` → string.
- `parseBackup(text)` → `{ ok: true, data, summary: { workouts, sets, newest } }` | `{ ok: false, reason }`.
- `backupFilename(date = new Date())` → `'lifttracker-YYYY-MM-DD.json'`.
- `exportBackup(database = db)` → Promise<string>; throws `Error('Finish the active workout first.')` when a workout is active.
- `importBackup(data, database = db)` → Promise<void>; same refusal.

- [ ] **Step 1: Write the failing tests**

Create `src/test/backup.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { backupFilename, parseBackup, serializeBackup } from '../lib/backup.js'

const tables = {
  exercises: [{ id: 'dips', name: 'Dips', displayUnit: 'kg' }],
  programDays: [{ id: 'push-a', name: 'Push A', order: 1, slots: [] }],
  workouts: [{ id: 'w1', programDayId: 'push-a', startedAt: '2026-10-09T10:00:00Z', finishedAt: '2026-10-09T11:00:00Z' }],
  sets: [{ id: 's1', workoutId: 'w1', exerciseId: 'dips', setNumber: 1, weight: 0, unit: 'kg', reps: 10, loggedAt: '2026-10-09T10:05:00Z' }],
  settings: [
    { key: 'nextProgramDayId', value: 'pull-a' },
    { key: 'activeRest', value: { endsAt: 1 } },
    { key: 'someFutureKey', value: 1 },
  ],
}

describe('serializeBackup', () => {
  it('writes a versioned envelope without the active rest', () => {
    const out = JSON.parse(serializeBackup(tables))
    expect(out.app).toBe('lifttracker')
    expect(out.version).toBe(1)
    expect(out.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(out.settings.map((s) => s.key)).toEqual(['nextProgramDayId', 'someFutureKey'])
    expect(out.sets).toHaveLength(1)
  })
})

describe('parseBackup', () => {
  it('round-trips and summarises', () => {
    const r = parseBackup(serializeBackup(tables))
    expect(r.ok).toBe(true)
    expect(r.summary).toEqual({ workouts: 1, sets: 1, newest: '2026-10-09T11:00:00Z' })
    expect(r.data.settings.find((s) => s.key === 'someFutureKey').value).toBe(1)
  })
  it('refuses junk, other apps, newer versions, and damaged sets', () => {
    expect(parseBackup('{').reason).toBe('Not a LiftTracker backup.')
    expect(parseBackup(JSON.stringify({ app: 'other', version: 1 })).reason).toBe('Not a LiftTracker backup.')
    expect(parseBackup(JSON.stringify({ ...JSON.parse(serializeBackup(tables)), version: 2 })).reason).toBe('Backup version 2 is newer than this app.')
    const damaged = JSON.parse(serializeBackup(tables))
    delete damaged.sets[0].reps
    expect(parseBackup(JSON.stringify(damaged)).reason).toBe('The file is damaged (missing set fields).')
    const noTable = JSON.parse(serializeBackup(tables))
    delete noTable.workouts
    expect(parseBackup(JSON.stringify(noTable)).reason).toBe('The file is damaged (missing tables).')
  })
})

describe('backupFilename', () => {
  it('dates the file', () => {
    expect(backupFilename(new Date('2026-10-12T15:00:00Z'))).toBe('lifttracker-2026-10-12.json')
  })
})
```

Create `src/test/backup-db.test.js`:

```js
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { beforeEach, describe, expect, it } from 'vitest'
import { exportBackup, importBackup } from '../db/backup.js'
import { seedIfEmpty } from '../db/seed.js'
import { parseBackup } from '../lib/backup.js'

function freshDb() {
  const database = new Dexie(`backup-test-${Math.random()}`)
  database.version(1).stores({
    exercises: 'id, name',
    programDays: 'id, order',
    workouts: 'id, programDayId, startedAt, finishedAt',
    sets: 'id, workoutId, exerciseId, [workoutId+exerciseId], loggedAt',
    settings: 'key',
  })
  return database
}

describe('backup round trip', () => {
  let a
  let b
  beforeEach(async () => {
    a = freshDb()
    b = freshDb()
    await seedIfEmpty(a)
    await seedIfEmpty(b)
    await a.workouts.add({ id: 'w1', programDayId: 'push-a', startedAt: '2026-10-09T10:00:00Z', finishedAt: '2026-10-09T11:00:00Z' })
    await a.sets.add({ id: 's1', workoutId: 'w1', exerciseId: 'barbell-bench-press', setNumber: 1, weight: 60, unit: 'kg', reps: 8, loggedAt: '2026-10-09T10:05:00Z' })
    await a.settings.put({ key: 'nextProgramDayId', value: 'pull-a' })
    await a.exercises.update('barbell-bench-press', { restSeconds: 75 })
  })

  it('moves history, settings and overrides to another database', async () => {
    const text = await exportBackup(a)
    const parsed = parseBackup(text)
    expect(parsed.ok).toBe(true)
    await importBackup(parsed.data, b)
    expect(await b.workouts.count()).toBe(1)
    expect(await b.sets.count()).toBe(1)
    expect((await b.settings.get('nextProgramDayId')).value).toBe('pull-a')
    expect((await b.exercises.get('barbell-bench-press')).restSeconds).toBe(75)
  })

  it('restores illustration slugs missing from an old backup', async () => {
    const parsed = parseBackup(await exportBackup(a))
    parsed.data.exercises = parsed.data.exercises.map(({ illustration, ...rest }) => rest)
    await importBackup(parsed.data, b)
    expect((await b.exercises.get('barbell-bench-press')).illustration).toBe('bench-press')
  })

  it('refuses while a workout is active', async () => {
    await b.workouts.add({ id: 'w2', programDayId: 'push-a', startedAt: '2026-10-12T10:00:00Z', finishedAt: null })
    await expect(exportBackup(b)).rejects.toThrow('Finish the active workout first.')
    const parsed = parseBackup(await exportBackup(a))
    await expect(importBackup(parsed.data, b)).rejects.toThrow('Finish the active workout first.')
    expect(await b.workouts.count()).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/test/backup.test.js src/test/backup-db.test.js`
Expected: FAIL, modules not found.

- [ ] **Step 3: Write `src/lib/backup.js`**

```js
// Backup file format (Android install spec, 3.5). Version 1 is the five
// Dexie tables in a JSON envelope. The running rest is never exported.

const APP = 'lifttracker'
const VERSION = 1
const TABLES = ['exercises', 'programDays', 'workouts', 'sets', 'settings']
const SET_FIELDS = ['id', 'workoutId', 'exerciseId', 'setNumber', 'weight', 'unit', 'reps']
const WORKOUT_FIELDS = ['id', 'programDayId', 'startedAt']

export function serializeBackup(tables) {
  const out = {
    app: APP,
    version: VERSION,
    exportedAt: new Date().toISOString(),
    exercises: tables.exercises,
    programDays: tables.programDays,
    workouts: tables.workouts,
    sets: tables.sets,
    settings: tables.settings.filter((s) => s.key !== 'activeRest'),
  }
  return JSON.stringify(out, null, 2)
}

export function parseBackup(text) {
  let raw
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, reason: 'Not a LiftTracker backup.' }
  }
  if (!raw || raw.app !== APP) return { ok: false, reason: 'Not a LiftTracker backup.' }
  if (typeof raw.version !== 'number' || raw.version > VERSION) return { ok: false, reason: `Backup version ${raw.version} is newer than this app.` }
  for (const t of TABLES) {
    if (!Array.isArray(raw[t])) return { ok: false, reason: 'The file is damaged (missing tables).' }
  }
  if (!raw.workouts.every((w) => WORKOUT_FIELDS.every((f) => f in w))) return { ok: false, reason: 'The file is damaged (missing workout fields).' }
  if (!raw.sets.every((s) => SET_FIELDS.every((f) => f in s))) return { ok: false, reason: 'The file is damaged (missing set fields).' }
  const finished = raw.workouts.map((w) => w.finishedAt).filter(Boolean).sort()
  const data = Object.fromEntries(TABLES.map((t) => [t, raw[t]]))
  data.settings = data.settings.filter((s) => s.key !== 'activeRest')
  return { ok: true, data, summary: { workouts: raw.workouts.length, sets: raw.sets.length, newest: finished.at(-1) ?? null } }
}

export function backupFilename(date = new Date()) {
  const iso = date.toISOString().slice(0, 10)
  return `${APP}-${iso}.json`
}
```

- [ ] **Step 4: Write `src/db/backup.js`**

```js
import { db } from './db.js'
import { exercises as seededExercises } from './program.js'
import { serializeBackup } from '../lib/backup.js'

const ACTIVE = 'Finish the active workout first.'

async function assertNoActiveWorkout(database) {
  const workouts = await database.workouts.toArray()
  if (workouts.some((w) => w.finishedAt === null)) throw new Error(ACTIVE)
}

export async function exportBackup(database = db) {
  await assertNoActiveWorkout(database)
  const [exercises, programDays, workouts, sets, settings] = await Promise.all([
    database.exercises.toArray(),
    database.programDays.toArray(),
    database.workouts.toArray(),
    database.sets.toArray(),
    database.settings.toArray(),
  ])
  return serializeBackup({ exercises, programDays, workouts, sets, settings })
}

// Replaces everything on this phone with the backup, then fills in fields
// this version added since the backup was made (illustration slugs).
export async function importBackup(data, database = db) {
  await assertNoActiveWorkout(database)
  const slugs = new Map(seededExercises.map((e) => [e.id, e.illustration]))
  const exercises = data.exercises.map((e) => (e.illustration ? e : { ...e, illustration: slugs.get(e.id) }))
  await database.transaction('rw', database.exercises, database.programDays, database.workouts, database.sets, database.settings, async () => {
    await Promise.all([database.exercises.clear(), database.programDays.clear(), database.workouts.clear(), database.sets.clear(), database.settings.clear()])
    await database.exercises.bulkAdd(exercises)
    await database.programDays.bulkAdd(data.programDays)
    await database.workouts.bulkAdd(data.workouts)
    await database.sets.bulkAdd(data.sets)
    await database.settings.bulkAdd(data.settings)
  })
}
```

- [ ] **Step 5: Settings group**

In `src/screens/Settings.jsx` add imports:

```jsx
import { useRef } from 'react'
import { exportBackup, importBackup } from '../db/backup.js'
import { backupFilename, parseBackup } from '../lib/backup.js'
import { formatShortDate } from '../lib/format.js'
```

(merge `useRef` into the existing React import). Add state inside `Settings`:

```jsx
  const fileRef = useRef(null)
  const [exportNote, setExportNote] = useState('')
  const [pending, setPending] = useState(null) // { data, summary } | { reason }
```

Handlers inside `Settings`:

```jsx
  const doExport = async () => {
    try {
      const text = await exportBackup()
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
      const a = document.createElement('a')
      a.href = url
      a.download = backupFilename()
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      setExportNote('')
    } catch (e) {
      setExportNote(e.message)
    }
  }

  const onFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const parsed = parseBackup(await file.text())
    setPending(parsed.ok ? { data: parsed.data, summary: parsed.summary } : { reason: parsed.reason })
  }

  const doImport = async () => {
    try {
      await importBackup(pending.data)
      setPending(null)
    } catch (e) {
      setPending({ reason: e.message })
    }
  }
```

Insert before `<Group>About</Group>`:

```jsx
      <Group>Backup</Group>
      <SettingRow label="Export history" caption={exportNote || 'Saves a file you can import on another phone'} onClick={doExport}>
        <span aria-hidden="true" className="font-num text-[22px] text-ink-3">›</span>
      </SettingRow>
      <SettingRow label="Import from file" caption="Replaces everything on this phone" onClick={() => fileRef.current?.click()}>
        <span aria-hidden="true" className="font-num text-[22px] text-ink-3">›</span>
      </SettingRow>
      <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} className="hidden" aria-label="Backup file" />
```

And after the reset `BottomSheet`:

```jsx
      <BottomSheet open={pending !== null} title={pending?.reason ? 'Cannot import' : 'Replace history?'} onClose={() => setPending(null)}>
        {pending?.reason ? (
          <>
            <p className="mt-1 mb-3.5 text-[15px] text-ink-2">{pending.reason}</p>
            <button type="button" onClick={() => setPending(null)} className="h-[52px] w-full rounded-2xl border border-rule font-semibold text-ink-2">
              Close
            </button>
          </>
        ) : (
          <>
            <p className="mt-1 mb-3.5 text-[15px] text-ink-2">
              {pending?.summary.workouts} workouts and {pending?.summary.sets} sets
              {pending?.summary.newest ? `, newest ${formatShortDate(pending.summary.newest)}` : ''}. Everything on this phone is replaced.
            </p>
            <button type="button" onClick={() => setPending(null)} className="mb-2.5 h-[60px] w-full rounded-2xl bg-act text-lg font-semibold text-on-act">
              Cancel
            </button>
            <button type="button" onClick={doImport} className="h-[52px] w-full rounded-2xl border border-rule font-semibold text-flag">
              Replace
            </button>
          </>
        )}
      </BottomSheet>
```

- [ ] **Step 6: Run tests, lint, look**

Run: `npm test && npm run lint`
Expected: 133 passed.

Dev server: Export downloads a dated JSON. Import the same file: sheet with counts; Replace; Home unchanged. Import a text file: "Cannot import" sheet.

- [ ] **Step 7: Commit**

```bash
git add src/lib/backup.js src/db/backup.js src/screens/Settings.jsx src/test/backup.test.js src/test/backup-db.test.js
git commit -m "Export and import history as a file"
```

---

### Task 8: Manifest polish, screenshots, docs

**Files:**
- Create: `public/screenshot-home.png`, `public/screenshot-workout.png`
- Modify: `vite.config.js` (manifest), `PRODUCT.md`, `lifttracker/prd.md`
- Test: `src/test/assets.test.js` (append)

- [ ] **Step 1: Write the failing test**

Append to `src/test/assets.test.js`:

```js
describe('install screenshots', () => {
  it.each(['screenshot-home.png', 'screenshot-workout.png'])('ships public/%s', (file) => {
    const path = new URL(`../../public/${file}`, import.meta.url)
    expect(existsSync(path)).toBe(true)
    expect(statSync(path).size).toBeGreaterThan(10_000)
  })
})
```

Run: `npm test -- src/test/assets.test.js`
Expected: 2 failures.

- [ ] **Step 2: Capture the screenshots**

With the dev server running and the browser at 375×812 in dark mode, capture Home (with a finished workout so the "last time" line has numbers) and Workout (one set logged, resting) as PNG, then scale to 540×1170 with `sips`:

```bash
sips -z 1170 540 /path/to/home.png --out public/screenshot-home.png
sips -z 1170 540 /path/to/workout.png --out public/screenshot-workout.png
```

(The capture source is the Claude browser screenshot at 2× DPR, 750×1624, cropped to the phone frame.) These are real app screenshots.

- [ ] **Step 3: Manifest fields**

In `vite.config.js` manifest add after `start_url: '.',`:

```js
        id: './',
        scope: './',
        categories: ['health', 'fitness'],
        screenshots: [
          { src: 'screenshot-home.png', sizes: '540x1170', type: 'image/png', form_factor: 'narrow', label: 'Home' },
          { src: 'screenshot-workout.png', sizes: '540x1170', type: 'image/png', form_factor: 'narrow', label: 'Workout' },
        ],
```

- [ ] **Step 4: Docs**

In `PRODUCT.md` "Capabilities and Constraints" list, add after the "Settings:" bullet:

```markdown
- Android install support: the screen stays on during a workout, a rest that
  ends while the app is in the background raises a notification, Home offers
  Install and Update, and Settings exports and imports history as a JSON file.
```

In `lifttracker/prd.md` decisions log add:

```markdown
| October 12, 2026 | Android install work accepted: wake lock, background rest notification, in-app install, update banner on Home only, JSON backup. No iOS work. See `docs/superpowers/specs/2026-10-12-lifttracker-android-install-design.md`. |
```

- [ ] **Step 5: Verify, build, commit**

Run: `npm test && npm run lint && npm run build && node -e "const m=require('./dist/manifest.webmanifest');console.log(m.screenshots.length, m.id, m.scope)"`
Expected: 135 passed; `2 ./ ./`.

```bash
git add public/screenshot-home.png public/screenshot-workout.png vite.config.js src/test/assets.test.js
git commit -m "Polish the install manifest with screenshots"
git add ../PRODUCT.md prd.md
git commit -m "Record the Android install decisions"
```

Then the spec's section 7 checks on the Android phone, after merging and pushing.
