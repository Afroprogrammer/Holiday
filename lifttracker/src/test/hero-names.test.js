import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// The workout hero shows the short exercise name (gym round 1, 2.4); the
// done card during a rest and the editor replace the steppers; removing the
// set that started the rest clears the rest.
const src = readFileSync(new URL('../screens/Workout.jsx', import.meta.url), 'utf8')

describe('workout screen wiring', () => {
  it('uses the short name on the hero', () => {
    expect(src).toMatch(/<h2[^>]*>\{shortName\(active\.exercise\.name\)\}<\/h2>/)
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
