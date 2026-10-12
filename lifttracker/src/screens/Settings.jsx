import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import BottomSheet from '../components/BottomSheet.jsx'
import DaySheet from '../components/DaySheet.jsx'
import Illustration from '../components/Illustration.jsx'
import NumberField from '../components/NumberField.jsx'
import { getNextProgramDay, getProgramDays } from '../db/queries.js'
import { DEFAULT_REST_KEYS, getExercisesByName, getSetting, resetCycle, setSetting } from '../db/settings.js'

function Group({ children }) {
  return <h2 className="mt-6 mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-3">{children}</h2>
}

function DefaultRest({ label, caption, settingKey }) {
  const stored = useLiveQuery(() => getSetting(settingKey), [settingKey])
  if (stored === undefined) return null
  return <NumberField label={label} caption={caption} value={String(stored)} suffix="s" onChange={(v) => setSetting(settingKey, v === '' ? 0 : Number(v))} />
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

  return (
    <main className="min-h-dvh px-5 pt-3.5 pb-8">
      <header className="flex h-11 items-center">
        <a href="#" className="font-semibold text-act">
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
    </main>
  )
}
