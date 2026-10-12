import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import BottomSheet from '../components/BottomSheet.jsx'
import Illustration from '../components/Illustration.jsx'
import RestDock, { DOCK_HEIGHT } from '../components/RestDock.jsx'
import Stepper from '../components/Stepper.jsx'
import { getSetting, setSetting, SETTING_KEYS } from '../db/settings.js'
import { finishWorkout, getActiveRest, getWorkoutView, logSet, saveActiveRest, setDisplayUnit } from '../db/workouts.js'
import { formatSession } from '../lib/history.js'
import { closeRestNotifications, getRegistration, notificationPermission, requestNotificationPermission } from '../lib/restNotification.js'
import { adjustRest, startRest } from '../lib/timer.js'
import { convertWeight, incrementFor, otherUnit } from '../lib/units.js'
import { useWakeLock } from '../lib/wakeLock.js'
import { activePosition, buildPlan, formatElapsed, lastTimeText, remainingSentence, shortName } from '../lib/workoutProgress.js'

// Picks which alternative a slot shows today: the one already logged in this
// workout, else the one with the most recent history, else the first.
function defaultExerciseId(slot, loggedSets) {
  for (const option of slot.options) {
    if (loggedSets.some((s) => s.exerciseId === option.id)) return option.id
  }
  let best = null
  for (const option of slot.options) {
    const sets = slot.previousBy[option.id]
    if (sets.length === 0) continue
    const latest = sets.map((s) => s.loggedAt).sort().at(-1)
    if (!best || latest > best.latest) best = { id: option.id, latest }
  }
  return best?.id ?? slot.options[0].id
}

function repsText(slot) {
  return slot.repMin === slot.repMax ? `${slot.repMin} reps` : `${slot.repMin}–${slot.repMax} reps`
}

function useTicker(ms) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}

// The one set with controls. Two taps when last time's values are right:
// Done and nothing else. Exported for tests.
export function ActiveSet({ exercise, row, total, targetText, onDone, onFlipUnit }) {
  const unit = exercise.displayUnit
  const initialWeight = row.prefill ? String(convertWeight(row.prefill.weight, row.prefill.unit, unit)) : ''
  const [weight, setWeight] = useState(initialWeight)
  const [reps, setReps] = useState(row.prefill ? String(row.prefill.reps) : '')
  const ready = weight !== '' && reps !== '' && !Number.isNaN(Number(weight)) && !Number.isNaN(Number(reps))
  const weightNum = weight === '' ? 0 : Number(weight)
  const step = incrementFor(exercise, unit)
  const other = otherUnit(unit)

  return (
    <section>
      <div className="mt-5 flex items-baseline justify-between">
        <h3 className="font-num text-[22px] font-bold uppercase tracking-wide">
          Set {row.n} <span className="font-semibold text-ink-3">of {total}</span>
        </h3>
        <p className="text-[15px] text-ink-2">
          last <b className="font-num text-[17px] font-semibold text-ink">{lastTimeText(row.last, unit)}</b>
        </p>
      </div>
      <div className="mt-3">
        <Stepper
          value={weight}
          onChange={setWeight}
          step={step}
          size="weight"
          unit={unit}
          onFlipUnit={onFlipUnit}
          caption={`${weight === '' ? '–' : convertWeight(weightNum, unit, other)} ${other} · ±${step}`}
          label="Weight"
          inputMode="decimal"
        />
      </div>
      <div className="mt-3">
        <Stepper value={reps} onChange={setReps} step={1} size="reps" caption={`reps · target ${targetText}`} label="Reps" inputMode="numeric" />
      </div>
      <button
        type="button"
        disabled={!ready}
        onClick={() => onDone(row.n, { weight: Number(weight), unit, reps: Number(reps) })}
        className="mt-3.5 h-16 w-full rounded-2xl bg-act text-xl font-semibold text-on-act disabled:opacity-45"
      >
        Done · start rest
      </button>
    </section>
  )
}

function SetRows({ plan, onSkip, onUnskip, onAddSet }) {
  const rows = plan.rows.filter((r) => r.status !== 'open')
  return (
    <ul className="mt-5 border-t border-rule">
      {rows.map((r) => (
        <li key={r.n} className={`flex h-11 items-center gap-3 border-b border-rule text-[15px] ${r.status === 'logged' ? 'text-ink' : 'text-ink-2'}`}>
          <span className={`w-10 font-num text-[15px] font-bold tracking-wide ${r.status === 'logged' ? 'text-act' : 'text-ink-3'}`}>S{r.n}</span>
          {r.status === 'logged' && (
            <>
              <span className="font-num text-[17px] font-semibold">
                {r.set.weight} {r.set.unit} × {r.set.reps}
              </span>
              {r.marker && <span className="ml-auto text-xs font-semibold text-flag">{r.marker.kind} range</span>}
            </>
          )}
          {r.status === 'skipped' && (
            <>
              <span>skipped</span>
              <button type="button" onClick={() => onUnskip(r.n)} className="ml-auto h-11 px-2 font-semibold text-act">
                Undo
              </button>
            </>
          )}
          {r.status === 'pending' && (
            <>
              <span>last {lastTimeText(r.last, plan.exercise.displayUnit)}</span>
              <button type="button" onClick={() => onSkip(r.n)} className="ml-auto h-11 px-2 font-semibold text-act">
                Skip
              </button>
            </>
          )}
        </li>
      ))}
      <li className="flex h-11 items-center gap-3">
        <span className="w-10 font-num text-[15px] font-bold text-ink-3">+</span>
        <button type="button" onClick={onAddSet} className="h-11 font-semibold text-act">
          Add set
        </button>
      </li>
    </ul>
  )
}

export default function Workout({ workoutId, onFinished }) {
  const view = useLiveQuery(() => getWorkoutView(workoutId), [workoutId])
  const rest = useLiveQuery(getActiveRest)
  const keepScreenOn = useLiveQuery(() => getSetting(SETTING_KEYS.keepScreenOn))
  useWakeLock(keepScreenOn !== false)
  const notifyPref = useLiveQuery(() => getSetting(SETTING_KEYS.restNotification))
  const askedPref = useLiveQuery(() => getSetting(SETTING_KEYS.restNotificationAsked))
  const [askingNotify, setAskingNotify] = useState(false)
  const now = useTicker(1000)
  const [chosen, setChosen] = useState({})
  const [skipped, setSkipped] = useState({})
  const [extra, setExtra] = useState({})
  const [focus, setFocus] = useState(null)
  const [confirming, setConfirming] = useState(false)

  if (view === undefined || rest === undefined || view === null) return null
  const { workout, day, slots, loggedSets } = view

  const entries = slots.map((slot, index) => {
    const id = chosen[index] ?? defaultExerciseId(slot, loggedSets)
    const exercise = slot.options.find((o) => o.id === id)
    return { slot, exercise, previousSets: slot.previousBy[exercise.id], index }
  })
  const plan = buildPlan(entries, loggedSets, skipped, extra, focus)
  const position = activePosition(plan)
  const activeIndex = position?.exerciseIndex ?? plan.exercises.length - 1
  const active = plan.exercises[activeIndex]
  const activeRow = position ? active.rows.find((r) => r.status === 'open') : null
  const queue = plan.exercises.filter((e, i) => i !== activeIndex && e.remaining > 0)
  const completed = plan.exercises.filter((e, i) => i !== activeIndex && e.remaining === 0 && e.rows.some((r) => r.status === 'logged'))
  const sentence = remainingSentence(plan)

  const finish = async () => {
    await saveActiveRest(null)
    await finishWorkout(workout.id)
    setConfirming(false)
    onFinished?.()
  }

  const done = async (setNumber, values) => {
    await logSet({ workoutId: workout.id, exerciseId: active.exercise.id, setNumber, ...values })
    await saveActiveRest(startRest({ exerciseId: active.exercise.id, exerciseName: shortName(active.exercise.name), restSeconds: active.exercise.restSeconds }))
    getRegistration().then(closeRestNotifications)
    if (notificationPermission() === 'default' && askedPref === false) setAskingNotify(true)
  }

  const toggleSkip = (exerciseId, setNumber, on) =>
    setSkipped((s) => {
      const next = new Set(s[exerciseId] ?? [])
      if (on) next.add(setNumber)
      else next.delete(setNumber)
      return { ...s, [exerciseId]: next }
    })

  // Backdrop, Escape and "Not now" all mean the same thing: never ask again.
  const declineNotify = async () => {
    setAskingNotify(false)
    await setSetting(SETTING_KEYS.restNotificationAsked, true)
  }

  const nextSlug = rest && activeRow ? active.exercise.illustration : undefined
  const notify = notifyPref !== false && notificationPermission() === 'granted'
  // After this rest the next set is the row that is open now.
  const nextSet = rest && activeRow ? { exerciseName: shortName(active.exercise.name), setNumber: activeRow.n, total: active.total } : null

  return (
    <main className="min-h-dvh px-5 pt-3.5" style={{ paddingBottom: (rest ? DOCK_HEIGHT.resting : DOCK_HEIGHT.idle) + 16 }}>
      <header className="flex h-11 items-center justify-between text-sm font-medium text-ink-2">
        <span>
          {day.name} · {formatElapsed(workout.startedAt, now)}
        </span>
        <span className="font-num font-semibold tracking-wide">
          <b className="text-[17px] text-ink">{plan.done}</b> / {plan.total} sets
        </span>
      </header>

      <section className="mt-2 flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-act">
            Exercise {activeIndex + 1} of {plan.exercises.length}
          </p>
          <h2 className="mt-1 font-num text-[40px] font-bold uppercase leading-[0.95]">{active.exercise.name}</h2>
          <p className="mt-1.5 text-[15px] text-ink-2">
            {active.slot.targetSets} sets · {repsText(active.slot)} · rest {active.exercise.restSeconds} s{active.exercise.lowerIsBetter ? ' · assistance' : ''}
          </p>
          {active.slot.options.length > 1 && (
            <div className="mt-2 flex overflow-hidden rounded-lg border border-rule bg-raised text-sm">
              {active.slot.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setChosen((c) => ({ ...c, [entries[activeIndex].index]: option.id }))}
                  className={`h-11 flex-1 px-2 ${option.id === active.exercise.id ? 'bg-act font-semibold text-on-act' : 'text-ink-2'}`}
                >
                  {shortName(option.name)}
                </button>
              ))}
            </div>
          )}
        </div>
        <Illustration slug={active.exercise.illustration} size={96} tone="ink-2" live={Boolean(activeRow)} />
      </section>

      {activeRow ? (
        <ActiveSet
          key={`${active.exercise.id}-${activeRow.n}-${active.exercise.displayUnit}`}
          exercise={active.exercise}
          row={activeRow}
          total={active.total}
          targetText={repsText(active.slot).replace(' reps', '')}
          onDone={done}
          onFlipUnit={() => setDisplayUnit(active.exercise.id, otherUnit(active.exercise.displayUnit))}
        />
      ) : (
        <p className="mt-6 font-num text-[22px] font-bold uppercase tracking-wide text-act">All {plan.total} sets logged</p>
      )}

      <SetRows
        plan={active}
        onSkip={(n) => toggleSkip(active.exercise.id, n, true)}
        onUnskip={(n) => toggleSkip(active.exercise.id, n, false)}
        onAddSet={() => setExtra((e) => ({ ...e, [active.exercise.id]: (e[active.exercise.id] ?? 0) + 1 }))}
      />

      {queue.length > 0 && (
        <>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-ink-3">Up next</p>
          <ul>
            {queue.map((e) => (
              <li key={e.exercise.id} className="border-b border-rule last:border-0">
                <button type="button" onClick={() => setFocus(e.exercise.id)} className="flex h-14 w-full items-center gap-3 text-left">
                  <Illustration slug={e.exercise.illustration} size={40} tone="ink-3" />
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{shortName(e.exercise.name)}</span>
                  <span className="font-num text-sm text-ink-3">
                    {e.remaining} × {repsText(e.slot).replace(' reps', '')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {completed.length > 0 && (
        <>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-ink-3">Done</p>
          <ul>
            {completed.map((e) => (
              <li key={e.exercise.id} className="flex h-12 items-center gap-3 border-b border-rule text-[15px] last:border-0">
                <span className="min-w-0 flex-1 truncate text-ink-2">{shortName(e.exercise.name)}</span>
                <span className="font-num text-[15px] font-semibold">{formatSession(e.rows.filter((r) => r.status === 'logged').map((r) => r.set))}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="pt-4 pb-6">
        <button
          type="button"
          onClick={() => (sentence ? setConfirming(true) : finish())}
          className={`h-[52px] w-full rounded-2xl font-semibold ${sentence ? 'border border-rule text-ink-2' : 'bg-act text-on-act'}`}
        >
          Finish workout
        </button>
      </div>

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

      <BottomSheet open={confirming} title={`Finish ${day.name}?`} onClose={() => setConfirming(false)}>
        <p className="mt-1 mb-3.5 text-[15px] text-ink-2">{sentence}</p>
        <button type="button" onClick={() => setConfirming(false)} className="mb-2.5 h-[60px] w-full rounded-2xl bg-act text-lg font-semibold text-on-act">
          Keep going
        </button>
        <button type="button" onClick={finish} className="h-[52px] w-full rounded-2xl border border-rule font-semibold text-ink-2">
          Finish anyway
        </button>
      </BottomSheet>

      <BottomSheet open={askingNotify} title="Buzz when a rest ends?" onClose={declineNotify}>
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
        <button type="button" onClick={declineNotify} className="h-[52px] w-full rounded-2xl border border-rule font-semibold text-ink-2">
          Not now
        </button>
      </BottomSheet>
    </main>
  )
}
