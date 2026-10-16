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
  it('passes the set id into the rest and clears the rest when that set is removed', () => {
    expect(src).toMatch(/startRest\(\{[^}]*setId: logged\.id/)
    expect(src).toMatch(/rest\?\.setId === target\.id/)
  })
  it('shows the done card while the rest runs', () => {
    expect(src).toMatch(/phase === 'running'[\s\S]*<DoneCard/)
  })
})
