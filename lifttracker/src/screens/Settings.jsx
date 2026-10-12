import { useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import BottomSheet from '../components/BottomSheet.jsx'
import DaySheet from '../components/DaySheet.jsx'
import Illustration from '../components/Illustration.jsx'
import NumberField from '../components/NumberField.jsx'
import { exportBackup, importBackup } from '../db/backup.js'
import { backupFilename, parseBackup } from '../lib/backup.js'
import { formatShortDate } from '../lib/format.js'
import SettingRow from '../components/SettingRow.jsx'
import Switch from '../components/Switch.jsx'
import { getNextProgramDay, getProgramDays } from '../db/queries.js'
import { DEFAULT_REST_KEYS, SETTING_KEYS, getExercisesByName, getSetting, resetCycle, setSetting } from '../db/settings.js'
import { getRegistration, notificationPermission, requestNotificationPermission, testBuzz } from '../lib/restNotification.js'

function Group({ children }) {
  return <h2 className="mt-6 mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-3">{children}</h2>
}

function DefaultRest({ label, caption, settingKey }) {
  const stored = useLiveQuery(() => getSetting(settingKey), [settingKey])
  if (stored === undefined) return null
  return <NumberField label={label} caption={caption} value={String(stored)} suffix="s" onChange={(v) => setSetting(settingKey, v === '' ? 0 : Number(v))} />
}

function BoolSetting({ settingKey, label, caption, disabled = false, disabledCaption }) {
  const stored = useLiveQuery(() => getSetting(settingKey), [settingKey])
  if (stored === undefined) return null
  return (
    <SettingRow label={label} caption={disabled ? disabledCaption : caption}>
      <Switch checked={Boolean(stored)} disabled={disabled} onChange={(v) => setSetting(settingKey, v)} label={label} />
    </SettingRow>
  )
}

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

// Settings (prd.md, "Settings"): default rest, per-exercise overrides behind
// each row, the cycle position, and attribution for the artwork and fonts.
export default function Settings() {
  const exercises = useLiveQuery(getExercisesByName, [], [])
  const days = useLiveQuery(getProgramDays, [], [])
  const nextDay = useLiveQuery(getNextProgramDay)
  const [picking, setPicking] = useState(false)
  const [resetting, setResetting] = useState(false)
  const exercisesById = new Map(exercises.map((e) => [e.id, e]))
  const firstDay = days[0]
  const fileRef = useRef(null)
  const [exportNote, setExportNote] = useState('')
  const [pending, setPending] = useState(null) // { data, summary } | { reason } | null

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
    try {
      const parsed = parseBackup(await file.text())
      setPending(parsed.ok ? { data: parsed.data, summary: parsed.summary } : { reason: parsed.reason })
    } catch {
      setPending({ reason: 'The file could not be read.' })
    }
  }

  const doImport = async () => {
    try {
      await importBackup(pending.data)
      setPending(null)
    } catch (e) {
      setPending({ reason: e.message })
    }
  }

  return (
    <main className="min-h-dvh px-5 pt-3.5 pb-8">
      <header className="flex h-11 items-center">
        <a href="#" className="inline-flex h-11 items-center font-semibold text-act">
          ‹ Home
        </a>
      </header>
      <h1 className="mt-3 font-num text-[40px] font-bold uppercase leading-none">Settings</h1>

      <Group>Default rest</Group>
      <DefaultRest label="Compound lifts" caption="bench, press, deadlift, rows, pull-ups" settingKey={DEFAULT_REST_KEYS.compound} />
      <DefaultRest label="Isolation and core" caption="curls, shrugs, pushdowns, crunches" settingKey={DEFAULT_REST_KEYS.isolation} />

      <Group>Exercises</Group>
      <ul>
        {exercises.map((e) => (
          <li key={e.id}>
            <a href={`#settings/${e.id}`} className="flex min-h-14 items-center gap-3 border-b border-rule py-1.5">
              <Illustration slug={e.illustration} size={36} tone="ink-3" />
              <span className="min-w-0 flex-1 text-base">{e.name}</span>
              <span className="text-right font-num text-sm leading-tight text-ink-2">
                <b className="block text-lg font-semibold text-ink">{e.displayUnit}</b>
                {e.displayUnit === 'kg' ? e.incrementKg : e.incrementLb} · {e.restSeconds} s
              </span>
              <span aria-hidden="true" className="font-num text-[22px] text-ink-3">
                ›
              </span>
            </a>
          </li>
        ))}
      </ul>

      <Group>Workout</Group>
      <BoolSetting settingKey={SETTING_KEYS.keepScreenOn} label="Keep screen on during workout" caption="while the workout screen is open" />
      <NotifySetting />
      <SettingRow label="Test buzz" caption="vibrates and beeps now, like the end of a rest" onClick={async () => testBuzz(await getRegistration())}>
        <span aria-hidden="true" className="font-num text-[22px] text-ink-3">
          ›
        </span>
      </SettingRow>

      <Group>Program</Group>
      <button type="button" onClick={() => setPicking(true)} className="flex min-h-14 w-full items-center gap-3 border-b border-rule py-2 text-left">
        <span className="min-w-0 flex-1">
          <span className="block text-base">Cycle position</span>
          <span className="block text-[13px] text-ink-2">
            next: {nextDay?.name ?? '–'} · day {nextDay?.order ?? '–'} of {days.length}
          </span>
        </span>
        <span aria-hidden="true" className="font-num text-[22px] text-ink-3">
          ›
        </span>
      </button>
      <button type="button" onClick={() => setResetting(true)} className="flex min-h-14 w-full items-center py-2 text-left text-base font-semibold text-flag">
        Reset cycle to {firstDay?.name ?? 'Push A'}
      </button>

      <Group>Backup</Group>
      <SettingRow label="Export history" caption={exportNote || 'Saves a file you can import on another phone'} onClick={doExport}>
        <span aria-hidden="true" className="font-num text-[22px] text-ink-3">
          ›
        </span>
      </SettingRow>
      <SettingRow label="Import from file" caption="Replaces everything on this phone" onClick={() => fileRef.current?.click()}>
        <span aria-hidden="true" className="font-num text-[22px] text-ink-3">
          ›
        </span>
      </SettingRow>
      <input ref={fileRef} type="file" accept="application/json,.json" onChange={onFile} className="hidden" aria-label="Backup file" />

      <Group>About</Group>
      <p className="text-[13px] leading-snug text-ink-3">
        Exercise illustrations: Workout Guide and Everkinetic, CC BY-SA 4.0. Fonts: Oswald and Source Sans 3, SIL Open Font License.
      </p>

      <DaySheet
        open={picking}
        days={days}
        exercisesById={exercisesById}
        nextDayId={nextDay?.id}
        title="Cycle position"
        copy="Pick the day the home screen offers next. Nothing is logged."
        onPick={async (day) => {
          await resetCycle(day.id)
          setPicking(false)
        }}
        onClose={() => setPicking(false)}
      />

      <BottomSheet open={resetting} title={`Reset cycle to ${firstDay?.name ?? 'Push A'}?`} onClose={() => setResetting(false)}>
        <p className="mt-1 mb-3.5 text-[15px] text-ink-2">The next workout becomes {firstDay?.name ?? 'Push A'}. Logged workouts are kept.</p>
        <button
          type="button"
          onClick={async () => {
            if (firstDay) await resetCycle(firstDay.id)
            setResetting(false)
          }}
          className="mb-2.5 h-[60px] w-full rounded-2xl bg-act text-lg font-semibold text-on-act"
        >
          Reset
        </button>
        <button type="button" onClick={() => setResetting(false)} className="h-[52px] w-full rounded-2xl border border-rule font-semibold text-ink-2">
          Cancel
        </button>
      </BottomSheet>

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
    </main>
  )
}
