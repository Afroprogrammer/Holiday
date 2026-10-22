import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// The workout hero shows the short exercise name (gym round 1, 2.4); the
// done card during a rest and the editor replace the steppers; removing the
// set that started the rest clears the rest.
const src = readFileSync(new URL('../screens/Workout.jsx', import.meta.url), 'utf8')

describe('workout screen wiring', () => {
  it('uses the short name on the hero', () => {
    expect(src).toMatch(/<h2[^>]*>\{shortName\(heroEntry\.exercise\.name\)\}<\/h2>/)
  })
  it('passes the set id into the rest and removes a set through the db helper', () => {
    expect(src).toMatch(/startRest\(\{[^}]*setId: logged\.id/)
    expect(src).toMatch(/removeSet\(/)
  })
  it('locks Done at the screen level so a remount cannot double-log', () => {
    expect(src).toMatch(/busy\.current/)
  })
  it('shows the done card for any running rest, naming the exercise when it differs', () => {
    expect(src).toMatch(/exerciseName=\{/)
  })
  it('drives the done card from the handoff hook', () => {
    expect(src).toMatch(/useSetHandoff\(/)
  })
})

describe('workout screen round 2 wiring', () => {
  const src = readFileSync(new URL('../screens/Workout.jsx', import.meta.url), 'utf8')
  it('persists skipped, extra and chosen through updateWorkoutState and never keeps them in state', () => {
    expect(src).toMatch(/updateWorkoutState\(/)
    expect(src).not.toMatch(/useState\(\{\}\)/)
  })
  it('leaves through nav after finishing and from the header link', () => {
    expect(src).toMatch(/await finishWorkout\(workout\.id\)[\s\S]*leaveWorkout\(\)/)
    expect(src).toMatch(/‹ Home/)
  })
  it('passes flash to the dock and has no watcher or wake lock of its own', () => {
    expect(src).toMatch(/<RestDock[^>]*flash=\{flash\}/)
    expect(src).not.toMatch(/useWakeLock|useRestWatcher|notify=\{/)
  })
})

describe('workout screen rest next-up wiring', () => {
  const src = readFileSync(new URL('../screens/Workout.jsx', import.meta.url), 'utf8')
  it('shows the rest block with a preview instead of the done card', () => {
    expect(src).toMatch(/<RestBlock/)
    expect(src).not.toMatch(/DoneCard/)
    expect(src).toMatch(/restPreview\(plan, cardSet\.exerciseId\)/)
    expect(src).toMatch(/onStart=\{skipRest\}/)
  })
  it('keeps the hero and set rows on the rested exercise while the block shows', () => {
    expect(src).toMatch(/const heroEntry = cardSet && cardEntry \? cardEntry : active/)
    expect(src).toMatch(/\{shortName\(heroEntry\.exercise\.name\)\}/)
    expect(src).toMatch(/<SetRows\s+plan=\{heroEntry\}/)
  })
})
