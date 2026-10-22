import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Settings offers a "Test buzz" row so the alert can be checked without a
// 90 s rest.
describe('test buzz row', () => {
  it('exists in Settings and calls testBuzz', () => {
    const src = readFileSync(new URL('../screens/Settings.jsx', import.meta.url), 'utf8')
    expect(src).toMatch(/label="Test buzz"/)
    expect(src).toMatch(/testBuzz\(/)
  })
})

describe('phone timer row', () => {
  it('links to the Clock timer intent for a 10 s test', () => {
    const src = readFileSync(new URL('../screens/Settings.jsx', import.meta.url), 'utf8')
    expect(src).toMatch(/Try phone timer/)
    expect(src).toMatch(/href=\{phoneTimerUrl\(10, 'LiftTracker test'\)\}/)
    expect(src).toMatch(/If nothing happens, your phone does not allow it\./)
  })
})
