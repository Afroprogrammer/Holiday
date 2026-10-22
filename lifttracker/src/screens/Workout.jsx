import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import BottomSheet from '../components/BottomSheet.jsx'
import Illustration from '../components/Illustration.jsx'
import RestBlock from '../components/RestBlock.jsx'
import RestDock, { DOCK_HEIGHT } from '../components/RestDock.jsx'
import SetEditor from '../components/SetEditor.jsx'
import Stepper from '../components/Stepper.jsx'
import { getSetting, setSetting, SETTING_KEYS } from '../db/settings.js'
import { finishWorkout, getActiveRest, getWorkoutView, logSet, removeSet, saveActiveRest, setDisplayUnit, updateSet, updateWorkoutState } from '../db/workouts.js'
import { formatSession } from '../lib/history.js'
import { leaveWorkout } from '../lib/nav.js'
import { toNumber } from '../lib/numberInput.js'
import { rangeMarker } from '../lib/prefill.js'
import { closeRestNotifications, getRegistration, notificationPermission, requestNotificationPermission } from '../lib/restNotification.js'
import { adjustRest, startRest } from '../lib/timer.js'
import { convertWeight, incrementFor, otherUnit } from '../lib/units.js'
import { useSetHandoff } from '../lib/useSetHandoff.js'
import { activePosition, buildPlan, formatElapsed, lastTimeText, remainingSentence, restPhase, restPreview, shortName, skippedSets } from '../lib/workoutProgress.js'

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
// Done and nothing else. `entering` runs the slide-in after a rest. Done is
// locked while the log is being written so a double tap cannot log twice.
// Exported for tests.
export function ActiveSet({ exercise, row, total, targetText, entering = false, onDone, onFlipUnit }) {
  const unit = exercise.displayUnit
  const initialWeight = row.prefill ? String(convertWeight(row.prefill.weight, row.prefill.unit, unit)) : ''
  const [weight, setWeight] = useState(initialWeight)
  const [reps, setReps] = useState(row.prefill ? String(row.prefill.reps) : '')
  const [pending, setPending] = useState(false)
  const ready = weight !== '' && reps !== '' && !Number.isNaN(Number(weight)) && !Number.isNaN(Number(reps))
  const weightNum = toNumber(weight)
  const step = incrementFor(exercise, unit)
  const other = otherUnit(unit)

  const submit = async () => {
    setPending(true)
    try {
      await onDone(row.n, { weight: weightNum, unit, reps: Math.round(toNumber(reps)) })
    } finally {
      setPending(false)
    }
  }

  return (
    <section className={entering ? 'set-in' : ''}>
      <div className="mt-5 flex items-baseline justify-between">
        <h3 className={`font-num text-[22px] font-bold uppercase tracking-wide ${entering ? 'heading-pulse' : ''}`}>
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
        <Stepper value={reps} onChange={setReps} step={1} size="reps" caption={`reps · target ${targetText}`} label="Reps" inputMode="numeric" integer />
      </div>
      <button type="button" disabled={!ready || pending} onClick={submit} className="mt-3.5 h-16 w-full rounded-2xl bg-act text-xl font-semibold text-on-act disabled:opacity-45">
        Done · start rest
      </button>
    </section>
  )
}

function SetRows({ plan, editingId, hiddenId, editor, onEdit, onSkip, onUnskip, onAddSet }) {
  const rows = plan.rows.filter((r) => r.status !== 'open' && !(r.status === 'logged' && r.set.id === hiddenId))
  return (
    <ul className="mt-5 border-t border-rule">
      {rows.map((r) => {
        if (r.status === 'logged' && r.set.id === editingId) {
          return (
            <li key={r.n} className="border-b border-rule pb-3">
              {editor(r.set)}
            </li>
          )
        }
        return (
          <li key={r.n} className={`flex min-h-11 items-center gap-3 border-b border-rule text-[15px] ${r.status === 'logged' ? 'text-ink' : 'text-ink-2'}`}>
            {r.status === 'logged' && (
              <button type="button" onClick={() => onEdit(r.set)} className="flex h-11 w-full items-center gap-3 text-left">
                <span className="w-10 font-num text-[15px] font-bold tracking-wide text-act">S{r.n}</span>
                <span className="font-num text-[17px] font-semibold">
                  {r.set.weight} {r.set.unit} × {r.set.reps}
                </span>
                {r.marker && <span className="ml-auto text-xs font-semibold text-flag">{r.marker.kind} range</span>}
              </button>
            )}
            {r.status === 'skipped' && (
              <>
                <span className="w-10 font-num text-[15px] font-bold tracking-wide text-ink-3">S{r.n}</span>
                <span>skipped</span>
                <button type="button" onClick={() => onUnskip(r.n)} className="ml-auto h-11 px-2 font-semibold text-act">
                  Undo
                </button>
              </>
            )}
            {r.status === 'pending' && (
              <>
                <span className="w-10 font-num text-[15px] font-bold tracking-wide text-ink-3">S{r.n}</span>
                <span>last {lastTimeText(r.last, plan.exercise.displayUnit)}</span>
                <button type="button" onClick={() => onSkip(r.n)} className="ml-auto h-11 px-2 font-semibold text-act">
                  Skip
                </button>
              </>
            )}
          </li>
        )
      })}
      <li className="flex h-11 items-center gap-3">
        <span className="w-10 font-num text-[15px] font-bold text-ink-3">+</span>
        <button type="button" onClick={onAddSet} className="h-11 font-semibold text-act">
          Add set
        </button>
      </li>
    </ul>
  )
}

// `flash` is App's rest-end moment (the watcher hook); the dock paints it.
// Skipped, extra and chosen live on the workout record (gym round 2, 3.4)
// so leaving the screen or reloading keeps them.
export default function Workout({ workoutId, flash = false }) {
  const view = useLiveQuery(() => getWorkoutView(workoutId), [workoutId])
  const rest = useLiveQuery(getActiveRest)
  const askedPref = useLiveQuery(() => getSetting(SETTING_KEYS.restNotificationAsked))
  const [askingNotify, setAskingNotify] = useState(false)
  const now = useTicker(1000)
  const [focus, setFocus] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [editing, setEditing] = useState(null)
  const [removing, setRemoving] = useState(null)
  // One log at a time: ActiveSet remounts when the next row opens, so its
  // own pending flag is not enough to stop a fast second tap.
  const busy = useRef(false)

  const phase = restPhase(rest ?? null, now)
  // The set that started the running rest; the done card shows it for any
  // exercise, so no Done button exists anywhere while a rest runs.
  const loggedSets = view?.loggedSets ?? []
  const restSet = rest ? (loggedSets.find((s) => s.id === rest.setId) ?? null) : null
  const { card, leaving, entering } = useSetHandoff(phase, restSet)

  const workout = view?.workout ?? null
  const chosen = workout?.chosen ?? {}
  const skipped = skippedSets(workout?.skipped)
  const extra = workout?.extra ?? {}
  const entries = (view?.slots ?? []).map((slot, index) => {
    const stored = chosen[index]
    const id = stored && slot.exerciseIds.includes(stored) ? stored : defaultExerciseId(slot, loggedSets)
    const exercise = slot.options.find((o) => o.id === id)
    return { slot, exercise, previousSets: slot.previousBy[exercise.id], index }
  })

  // The resolved alternatives are written back once per workout so Home's
  // resume count and a reload read the same pick (gym round 2, 3.4).
  const resolvedFor = useRef(null)
  useEffect(() => {
    if (!workout || resolvedFor.current === workout.id) return
    resolvedFor.current = workout.id
    const resolved = Object.fromEntries(entries.map((e) => [e.index, e.exercise.id]))
    if (entries.some((e) => chosen[e.index] !== e.exercise.id)) updateWorkoutState(workout.id, { chosen: { ...chosen, ...resolved } })
  })

  if (view === undefined || rest === undefined || view === null) return null
  const { day } = view

  const plan = buildPlan(entries, loggedSets, skipped, extra, focus)
  const position = activePosition(plan)
  const activeIndex = position?.exerciseIndex ?? plan.exercises.length - 1
  const active = plan.exercises[activeIndex]
  const activeRow = position ? active.rows.find((r) => r.status === 'open') : null
  const sentence = remainingSentence(plan)
  const targetText = repsText(active.slot).replace(' reps', '')

  const cardSet = card
  const cardEntry = cardSet ? plan.exercises.find((e) => e.exercise.id === cardSet.exerciseId) : null
  const cardMarker = cardSet && cardEntry ? rangeMarker(cardSet.reps, cardEntry.slot.repMin, cardEntry.slot.repMax) : null
  // While the rest block shows, the hero and set rows stay on the exercise
  // just rested; the next one arrives with the handoff (rest next-up, 3.1).
  const heroEntry = cardSet && cardEntry ? cardEntry : active
  const heroIndex = plan.exercises.indexOf(heroEntry)
  const cardExerciseName = cardSet && cardSet.exerciseId !== heroEntry.exercise.id ? shortName(cardEntry?.exercise.name ?? rest?.exerciseName ?? '') : null
  const queue = plan.exercises.filter((e, i) => i !== heroIndex && e.remaining > 0)
  const completed = plan.exercises.filter((e, i) => i !== heroIndex && e.remaining === 0 && e.rows.some((r) => r.status === 'logged'))

  const finish = async () => {
    await saveActiveRest(null)
    await finishWorkout(workout.id)
    setConfirming(false)
    leaveWorkout()
  }

  const done = async (setNumber, values) => {
    if (busy.current) return
    busy.current = true
    try {
      const logged = await logSet({ workoutId: workout.id, exerciseId: active.exercise.id, setNumber, ...values })
      await saveActiveRest(
        startRest({ exerciseId: active.exercise.id, exerciseName: shortName(active.exercise.name), restSeconds: active.exercise.restSeconds, setId: logged.id }),
      )
    } finally {
      busy.current = false
    }
    getRegistration().then(closeRestNotifications)
    if (notificationPermission() === 'default' && askedPref === false) setAskingNotify(true)
  }

  const skipRest = () => {
    saveActiveRest(null)
    getRegistration().then(closeRestNotifications)
  }

  const saveEdit = async (set, values) => {
    await updateSet(set.id, values)
    setEditing(null)
  }

  const confirmRemove = async () => {
    const target = removing
    setRemoving(null)
    setEditing(null)
    await removeSet(target.id)
  }

  const toggleSkip = (exerciseId, setNumber, on) => {
    const next = new Set(skipped[exerciseId] ?? [])
    if (on) next.add(setNumber)
    else next.delete(setNumber)
    updateWorkoutState(workout.id, { skipped: { ...workout.skipped, [exerciseId]: [...next].sort((a, b) => a - b) } })
  }
  const addSet = (exerciseId) => updateWorkoutState(workout.id, { extra: { ...extra, [exerciseId]: (extra[exerciseId] ?? 0) + 1 } })
  const choose = (slotIndex, exerciseId) => updateWorkoutState(workout.id, { chosen: { ...chosen, [slotIndex]: exerciseId } })

  // Backdrop, Escape and "Not now" all mean the same thing: never ask again.
  const declineNotify = async () => {
    setAskingNotify(false)
    await setSetting(SETTING_KEYS.restNotificationAsked, true)
  }

  const nextSlug = rest && activeRow ? active.exercise.illustration : undefined

  const editorFor = (set) => {
    const entry = plan.exercises.find((e) => e.exercise.id === set.exerciseId) ?? active
    return (
      <SetEditor set={set} exercise={entry.exercise} targetText={repsText(entry.slot).replace(' reps', '')} onSave={(v) => saveEdit(set, v)} onCancel={() => setEditing(null)} onRemove={() => setRemoving(set)} />
    )
  }

  const showCard = cardSet !== null
  let activeArea
  if (cardSet && editing === cardSet.id) activeArea = editorFor(cardSet)
  else if (showCard)
    activeArea = (
      <RestBlock
        set={cardSet}
        marker={cardMarker}
        exerciseName={cardExerciseName}
        preview={restPreview(plan, cardSet.exerciseId)}
        leaving={leaving}
        onEdit={() => setEditing(cardSet.id)}
        onStart={skipRest}
      />
    )
  else if (activeRow && editing === null)
    activeArea = (
      <ActiveSet
        key={`${active.exercise.id}-${activeRow.n}-${active.exercise.displayUnit}`}
        exercise={active.exercise}
        row={activeRow}
        total={active.total}
        targetText={targetText}
        entering={entering}
        onDone={done}
        onFlipUnit={() => setDisplayUnit(active.exercise.id, otherUnit(active.exercise.displayUnit))}
      />
    )
  else if (!activeRow) activeArea = <p className="mt-6 font-num text-[22px] font-bold uppercase tracking-wide text-act">All {plan.total} sets logged</p>
  else activeArea = null

  return (
    <main className="min-h-dvh px-5 pt-3.5" style={{ paddingBottom: (rest ? DOCK_HEIGHT.resting : DOCK_HEIGHT.idle) + 16 }}>
      <header className="flex h-11 items-center justify-between text-sm font-medium text-ink-2">
        <span className="flex items-center gap-2">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault()
              leaveWorkout()
            }}
            className="inline-flex h-11 items-center font-semibold text-act"
          >
            ‹ Home
          </a>
          <span>
            {day.name} · {formatElapsed(workout.startedAt, now)}
          </span>
        </span>
        <span className="font-num font-semibold tracking-wide">
          <b className="text-[17px] text-ink">{plan.done}</b> / {plan.total} sets
        </span>
      </header>

      <section className={`mt-2 flex items-end gap-3 ${entering && heroEntry === active ? 'set-in' : ''}`}>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-act">
            Exercise {heroIndex + 1} of {plan.exercises.length}
          </p>
          <h2 className="mt-1 font-num text-[40px] font-bold uppercase leading-[0.95]">{shortName(heroEntry.exercise.name)}</h2>
          <p className="mt-1.5 text-[15px] text-ink-2">
            {heroEntry.slot.targetSets} sets · {repsText(heroEntry.slot)} · rest {heroEntry.exercise.restSeconds} s{heroEntry.exercise.lowerIsBetter ? ' · assistance' : ''}
          </p>
          {heroEntry.slot.options.length > 1 && (
            <div className="mt-2 flex overflow-hidden rounded-lg border border-rule bg-raised text-sm">
              {heroEntry.slot.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => choose(entries[heroIndex].index, option.id)}
                  className={`h-11 flex-1 px-2 ${option.id === heroEntry.exercise.id ? 'bg-act font-semibold text-on-act' : 'text-ink-2'}`}
                >
                  {shortName(option.name)}
                </button>
              ))}
            </div>
          )}
        </div>
        <Illustration slug={heroEntry.exercise.illustration} size={96} tone="ink-2" live={Boolean(activeRow) && !showCard} />
      </section>

      {activeArea}

      <SetRows
        plan={heroEntry}
        editingId={editing}
        hiddenId={showCard || (cardSet && editing === cardSet.id) ? cardSet.id : null}
        editor={editorFor}
        onEdit={(set) => setEditing(set.id)}
        onSkip={(n) => toggleSkip(heroEntry.exercise.id, n, true)}
        onUnskip={(n) => toggleSkip(heroEntry.exercise.id, n, false)}
        onAddSet={() => addSet(heroEntry.exercise.id)}
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

      <RestDock rest={rest} nextSlug={nextSlug} flash={flash} onAdjust={(delta) => saveActiveRest(adjustRest(rest, delta))} onSkip={skipRest} />

      <BottomSheet open={confirming} title={`Finish ${day.name}?`} onClose={() => setConfirming(false)}>
        <p className="mt-1 mb-3.5 text-[15px] text-ink-2">{sentence}</p>
        <button type="button" onClick={() => setConfirming(false)} className="mb-2.5 h-[60px] w-full rounded-2xl bg-act text-lg font-semibold text-on-act">
          Keep going
        </button>
        <button type="button" onClick={finish} className="h-[52px] w-full rounded-2xl border border-rule font-semibold text-ink-2">
          Finish anyway
        </button>
      </BottomSheet>

      <BottomSheet open={removing !== null} title={`Remove set ${removing?.setNumber}?`} onClose={() => setRemoving(null)}>
        <p className="mt-1 mb-3.5 text-[15px] text-ink-2">
          {removing?.weight} {removing?.unit} × {removing?.reps} is deleted. Later sets keep their numbers.
        </p>
        <button type="button" onClick={() => setRemoving(null)} className="mb-2.5 h-[60px] w-full rounded-2xl bg-act text-lg font-semibold text-on-act">
          Keep
        </button>
        <button type="button" onClick={confirmRemove} className="h-[52px] w-full rounded-2xl border border-rule font-semibold text-flag">
          Remove
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
