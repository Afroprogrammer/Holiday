import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Dismissing the permission sheet by backdrop or Escape counts as "Not now":
// otherwise it returns on every Done (Android install spec, 3.2).
describe('permission sheet dismissal', () => {
  it('routes onClose and Not now through the same decline handler', () => {
    const src = readFileSync(new URL('../screens/Workout.jsx', import.meta.url), 'utf8')
    expect(src).toMatch(/title="Buzz when a rest ends\?" onClose=\{declineNotify\}/)
    expect(src).toMatch(/onClick=\{declineNotify\}/)
  })
})
