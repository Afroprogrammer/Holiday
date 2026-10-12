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
