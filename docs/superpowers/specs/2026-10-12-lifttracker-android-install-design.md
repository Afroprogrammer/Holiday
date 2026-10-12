# LiftTracker on Android: install, stay awake, alert, update, back up

**Status:** Approved in conversation on October 12, 2026. Awaiting written review.
**Owner:** Franklin
**Scope:** `lifttracker/` only. Android Chrome first. iOS is out of scope; nothing
here may break the app in Safari, but no iOS-specific work is done.

## 1. Job and audience

Franklin trains with the phone in his hand between sets, screen on. The
app is installed from GitHub Pages and used offline. Six gaps today:

1. The screen locks during a 90 s rest and he has to unlock and find his place.
2. If he switches to another app during a rest, nothing tells him it ended.
3. Installing needs the Chrome menu; nothing in the app offers it.
4. A new build replaces the running one silently, possibly mid-workout.
5. History lives on one phone with no way out.
6. The install dialog is the bare default.

Success: the workout screen never locks while open, a rest that ends while
the app is in the background raises a notification with a vibration, Home
offers Install and Update at the right moments, and history can be moved
to another phone as a file.

## 2. Platform facts this design relies on

- Screen Wake Lock API: Chrome for Android 84+. The lock is released by the
  browser whenever the page is hidden and must be re-requested when it
  becomes visible again.
- Notifications: an installed PWA on Android can call
  `ServiceWorkerRegistration.showNotification()` from the page. Hidden-tab
  timers are throttled to once per second, and after five minutes hidden to
  once per minute. A rest is 60 to 120 s, so a page-side timer is adequate.
  If Android discards the background tab, no alert is raised. This is
  accepted as best effort.
- `beforeinstallprompt`: fired by Chrome when the install criteria are met
  and the app is not installed. It can be deferred and shown later.
- `vite-plugin-pwa` 2.x: `registerType: 'prompt'` plus the
  `virtual:pwa-register/react` hook gives `needRefresh` and
  `updateServiceWorker`. `workbox.importScripts` adds a static script to the
  generated service worker.
- Downloads from an installed PWA work through an `<a download>` with a
  blob URL. File picking works through `<input type="file">`.

## 3. Features

### 3.1 Keep the screen on

A hook `useWakeLock(enabled)` in `src/lib/wakeLock.js` wraps
`navigator.wakeLock`. While `enabled` is true it holds a `'screen'` lock,
re-requests it on `visibilitychange` to `visible`, and releases it on
cleanup. Errors (unsupported, low battery refusal, permission) are
swallowed; the hook exposes `{ held: boolean }` only for tests.

The Workout screen calls `useWakeLock(keepAwake)` where `keepAwake` is the
setting `keepScreenOn` (default `true`). The lock is held for the whole
workout screen, not only during rest, because the set is being logged
between rests too.

Settings gains, under "Workout", a row "Keep screen on during workout" with
a switch. Stored in `settings` as `{ key: 'keepScreenOn', value: boolean }`,
seeded `true`.

### 3.2 Rest-end alert when the app is in the background

Foreground behaviour is unchanged: at zero the dock flashes, vibrates and
plays the tone.

New: when the countdown reaches zero while `document.hidden` is true, the
app shows a system notification:

| Field | Value |
|---|---|
| title | `Rest over` |
| body | `<Exercise> · set <n> of <total> next` or `<Exercise> · all sets done` |
| tag | `rest` (replaces any earlier rest notification) |
| vibrate | `[300, 100, 300]` |
| icon | `icon-192.png` |
| data | `{ url: <app start url> }` |

`buildRestNotification(rest, nextSet)` in `src/lib/restNotification.js`
returns `{ title, options }` and is unit tested. The dock's existing
zero-crossing effect calls it when hidden and passes the result to
`registration.showNotification`. Tapping the notification focuses the
existing app window, or opens one; this needs a `notificationclick`
handler in the service worker, provided by `public/sw-notify.js` and added
through `workbox.importScripts: ['sw-notify.js']` in `vite.config.js`.
The generated worker stays `generateSW`; no custom worker file.

Permission is asked once, in context: the first time Done is tapped in any
workout and `Notification.permission === 'default'`, a bottom sheet
"Buzz when a rest ends?" explains in one line ("Only used when you leave
the app during a rest.") with "Allow" (calls
`Notification.requestPermission()`) and "Not now". "Not now" sets the
setting `restNotificationAsked: true` so the sheet never returns; the
Settings row below can still turn it on. If permission is `denied`, the
feature is silently off.

Settings gains, under "Workout", a row "Buzz when a rest ends" with a
switch. On when permission is `granted` and setting `restNotification`
(default `true`) is true. Turning it on with permission `default` requests
permission. With permission `denied` the row shows "Blocked in Android
settings" as its caption and the switch is disabled.

When a rest is skipped or a new set is logged, any shown rest notification
is closed (`registration.getNotifications({ tag: 'rest' })`).

### 3.3 Install from the app

`useInstallPrompt()` in `src/lib/install.js` captures the
`beforeinstallprompt` event, prevents its default, and exposes
`{ canInstall, install, installed }`. `installed` is true when
`matchMedia('(display-mode: standalone)')` matches or after the
`appinstalled` event.

Home shows, between the illustration strip and the "Last completed" lines,
a row "Install on this phone" with a caption "Opens full screen, works
offline" and an amber "Install" button, only while `canInstall && !installed`.
Tapping calls `install()`, which calls `prompt()` on the saved event and
reads `userChoice`. After `dismissed`, the row hides for the session
(React state). After `accepted`, the row hides for good (`appinstalled`).

No iOS hint sheet.

### 3.4 Update banner, never mid-workout

`vite.config.js` switches `registerType` to `'prompt'` and sets
`injectRegister: false`, so the plugin no longer injects its own
registration script. `src/lib/update.js` exports `useAppUpdate()` built
on `useRegisterSW` from `virtual:pwa-register/react`, exposing
`{ ready: boolean, apply: () => void }`.

Home shows a slim banner at the top, below the header, "New version ready"
with an "Update" button, only when `ready`. Tap calls `apply()`, which
calls `updateServiceWorker(true)` and reloads. The Workout, Settings and
Exercise settings screens never show it. An update that becomes ready
during a workout is therefore seen after Finish, on Home.

The hook also checks for a new worker on `visibilitychange` to visible, so
an app reopened after a day picks the update up without a full restart.

### 3.5 Backup to a file and restore

`src/lib/backup.js` exports two pure functions, unit tested:

- `serializeBackup(tables)` → JSON string of
  `{ version: 1, app: 'lifttracker', exportedAt, exercises, programDays, workouts, sets, settings }`.
  `settings` excludes `activeRest`. `exportedAt` is an ISO timestamp.
- `parseBackup(text)` → `{ ok: true, data, summary }` or
  `{ ok: false, reason }`. Checks: valid JSON, `app === 'lifttracker'`,
  `version === 1`, each of the five tables is an array, every workout has
  `id`, `programDayId`, `startedAt`; every set has `id`, `workoutId`,
  `exerciseId`, `setNumber`, `weight`, `unit`, `reps`. `summary` is
  `{ workouts: number, sets: number, newest: iso | null }`. Reasons are
  user-facing sentences: "Not a LiftTracker backup.", "Backup version 2 is
  newer than this app.", "The file is damaged (missing set fields)."

`src/db/backup.js` exports `exportBackup()` (reads all tables, returns the
string) and `importBackup(data)` (one `rw` transaction: clear the five
tables, bulk-add from `data`, then run `seedIfEmpty`'s backfill so an old
backup gains `illustration` slugs). Import refuses while a workout is
active: `importBackup` throws `Error('Finish the active workout first.')`.

Settings gains a group "Backup":

- "Export history" row with caption "Saves a file you can import on another
  phone". Tap builds the blob and triggers a download named
  `lifttracker-YYYY-MM-DD.json`. With an active workout the tap shows a
  small inline note "Finish the active workout first."
- "Import from file" row with caption "Replaces everything on this phone".
  Tap opens the file picker (`accept="application/json,.json"`). After
  parsing, a bottom sheet: title "Replace history?", copy "<n> workouts and
  <m> sets, newest <date>. Everything on this phone is replaced." Buttons
  "Cancel" (amber, primary) and "Replace" (ghost, flag-coloured text). On
  failure the sheet shows the reason with a single "Close" button.
- After a successful import, Home reflects the restored cycle position and
  history immediately through live queries.

### 3.6 Manifest polish

In `vite.config.js` manifest:

- `id: '/'` relative to base (becomes `/Holiday/` on Pages).
- `scope: '.'`.
- `description` kept.
- `screenshots`: two PNGs in `public/`, `screenshot-home.png` and
  `screenshot-workout.png`, 540×1170, `form_factor: 'narrow'`, with
  `label`s "Home" and "Workout". Captured from the running app at 375 px
  and scaled. These are real app screenshots, not mockups.
- `categories: ['health', 'fitness']`.
- `theme_color` and `background_color` stay `#0a1020`.

The workbox `globPatterns` already precaches PNG.

## 4. States and failure modes

- Wake lock unsupported or refused: nothing shown, screen behaves as before.
- Notifications unsupported (`!('Notification' in window)` or no service
  worker registration): the permission sheet never appears; the Settings
  row caption reads "Not available on this browser" and the switch is
  disabled.
- Rest ends while hidden but the tab was discarded: no alert. Accepted.
- Rest ends while visible: no notification, in-app signal only.
- Two rests in a row while hidden: the second replaces the first (same tag).
- `beforeinstallprompt` never fires (already installed, or criteria unmet):
  no Install row.
- Update ready while on Workout: banner waits for Home.
- Export with an active workout: refused with the inline note.
- Import of a backup from a newer version: refused with the reason.
- Import succeeds: all settings including `nextProgramDayId`,
  `keepScreenOn`, `restNotification` come from the file; `activeRest` is
  absent by construction.

## 5. Architecture

New modules, each with one job:

| Module | Exports | Tested by |
|---|---|---|
| `src/lib/wakeLock.js` | `useWakeLock(enabled)` | jsdom test with a stub `navigator.wakeLock` |
| `src/lib/restNotification.js` | `buildRestNotification(rest, nextSet)`, `showRestNotification(registration, rest, nextSet)`, `closeRestNotifications(registration)` | unit tests on the payload; stub registration |
| `src/lib/install.js` | `useInstallPrompt()` | jsdom test dispatching a synthetic `beforeinstallprompt` |
| `src/lib/update.js` | `useAppUpdate()` | thin wrapper; covered by the manual check |
| `src/lib/backup.js` | `serializeBackup`, `parseBackup` | unit tests, including every refusal reason |
| `src/db/backup.js` | `exportBackup`, `importBackup` | fake-indexeddb test: round trip, refusal with active workout, backfill of `illustration` |
| `public/sw-notify.js` | `notificationclick` handler | manual check |
| `src/components/Switch.jsx` | `Switch({ checked, onChange, label, disabled })` | controls test |
| `src/components/SettingRow.jsx` | row with label, caption, right-hand control | reused by Settings |

Changed:

- `src/db/program.js` `defaultSettings`: add `keepScreenOn: true`,
  `restNotification: true`, `restNotificationAsked: false`.
- `src/db/seed.js`: backfill missing settings keys the same way it backfills
  `illustration` (`seedIfEmpty` adds any `defaultSettings` key that is
  absent).
- `src/components/RestDock.jsx`: zero-crossing effect gains the hidden
  branch; receives `nextSet` and `notify` props from Workout.
- `src/screens/Workout.jsx`: `useWakeLock`, permission sheet on first Done,
  passes `nextSet` to the dock, closes rest notifications on Done and Skip.
- `src/screens/Home.jsx`: Install row, Update banner.
- `src/screens/Settings.jsx`: "Workout" group (two switches), "Backup"
  group.
- `vite.config.js`: `registerType: 'prompt'`, `injectRegister: false`,
  `workbox.importScripts`,
  manifest fields, screenshots.
- `index.html`: no change.

Dexie schema stays at version 1. No new tables.

## 6. Anti-goals

- No iOS hint, no Capacitor, no TWA.
- No cloud backup, no accounts.
- No background sync or periodic sync.
- No change to the visual system beyond the new rows, switch and banner,
  which use existing tokens and the existing row style.
- The in-app tone and vibration are not redesigned.

## 7. Done criteria, checked on Franklin's Android phone

1. Installed from Home via the Install row; opens full screen with the navy
   splash.
2. Workout screen open, phone untouched for longer than the lock timeout:
   screen stays on.
3. Tap Done, switch to another app, wait for the rest: notification with
   vibration appears; tapping it returns to the workout.
4. Push a new build; reopen the app on Home: banner appears; Update reloads
   into the new build. Start a workout before pushing: no banner until
   Finish.
5. Export, uninstall, reinstall, import: history, cycle position and
   settings are back.
