import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// The update banner belongs on Home only; a reload must never interrupt a
// workout (Android install spec, 3.4).
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

describe('update banner placement', () => {
  it('is rendered by Home', () => {
    expect(src('screens/Home.jsx')).toMatch(/<UpdateBanner /)
  })
  it.each(['screens/Workout.jsx', 'screens/Settings.jsx', 'screens/ExerciseSettings.jsx'])('is absent from %s', (file) => {
    expect(src(file)).not.toMatch(/UpdateBanner/)
  })
  it('registers from App so every screen gets the worker', () => {
    expect(src('App.jsx')).toMatch(/useAppUpdate\(\)/)
  })
  it('uses prompt registration without the injected script', () => {
    const cfg = src('../vite.config.js')
    expect(cfg).toMatch(/registerType: 'prompt'/)
    expect(cfg).toMatch(/injectRegister: false/)
  })
})
