import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import SecondsField from '../components/SecondsField.jsx'
import { getNextProgramDay, getProgramDays } from '../db/queries.js'
import { DEFAULT_REST_KEYS, getExercisesByName, getSetting, resetCycle, setSetting } from '../db/settings.js'

function Heading({ children }) {
  return <h2 className="mt-4 text-[11px] font-medium uppercase tracking-wide text-ink-2">{children}</h2>
}

function DefaultRest({ label, settingKey }) {
  const stored = useLiveQuery(() => getSetting(settingKey), [settingKey])
  if (stored === undefined) return null
  return (
    <SecondsField
      label={label}
      value={String(stored)}
      onChange={(v) => setSetting(settingKey, v === '' ? 0 : Number(v))}
    />
  )
}

// Settings screen (prd.md, "Settings"; wireframe "Settings" frame).
export default function Settings() {
  const exercises = useLiveQuery(getExercisesByName, [], [])
  const days = useLiveQuery(getProgramDays, [], [])
  const nextDay = useLiveQuery(getNextProgramDay)
  const [choosingDay, setChoosingDay] = useState(false)

  return (
    <main className="flex min-h-dvh flex-col gap-2 p-4">
      <header className="flex items-baseline justify-between">
        <span className="font-num text-2xl font-semibold">Settings</span>
        <a href="#" className="font-medium text-act">
          Back
        </a>
      </header>

      <Heading>Default rest</Heading>
      <DefaultRest label="Compound lifts" settingKey={DEFAULT_REST_KEYS.compound} />
      <DefaultRest label="Isolation and core" settingKey={DEFAULT_REST_KEYS.isolation} />

      <Heading>Exercises</Heading>
      <ul>
        {exercises.map((e) => (
          <li key={e.id}>
            <a href={`#settings/${e.id}`} className="flex items-center justify-between gap-3 border-b border-rule py-2">
              <span>{e.name}</span>
              <span className="shrink-0 text-sm text-ink-2 tabular-nums">
                {e.displayUnit} · {e.displayUnit === 'kg' ? e.incrementKg : e.incrementLb} · {e.restSeconds} s
              </span>
            </a>
          </li>
        ))}
      </ul>

      <Heading>Cycle</Heading>
      <div className="flex items-center justify-between py-2">
        <span className="text-ink-2">Next day</span>
        <span className="font-num text-base font-semibold">{nextDay?.name ?? '–'}</span>
      </div>
      {choosingDay ? (
        <div className="grid gap-2">
          {days.map((day) => (
            <button
              key={day.id}
              type="button"
              onClick={async () => {
                await resetCycle(day.id)
                setChoosingDay(false)
              }}
              className={`rounded-xl border px-4 py-3 font-medium ${day.id === nextDay?.id ? 'border-act text-act' : 'border-rule-strong'}`}
            >
              {day.name}
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setChoosingDay(true)}
          className="rounded-xl border border-rule-strong px-4 py-3 text-sm font-medium"
        >
          Reset cycle
        </button>
      )}
    </main>
  )
}
