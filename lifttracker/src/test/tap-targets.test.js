import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Header links and the unit flip are tapped with a thumb between sets; each
// must be at least 44 px tall (plan, Global Constraints).
const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

describe('tap targets', () => {
  it.each(['screens/Home.jsx', 'screens/Settings.jsx', 'screens/ExerciseSettings.jsx'])('%s header link fills the 44 px header', (file) => {
    const anchors = [...src(file).matchAll(/<a href="#[^"]*" className="([^"]*)"/g)].map((m) => m[1])
    expect(anchors.length).toBeGreaterThan(0)
    for (const cls of anchors) expect(cls, cls).toMatch(/\bh-11\b/)
  })

  it('unit flip button is at least 44 px', () => {
    const m = src('components/Stepper.jsx').match(/aria-label=\{`Unit \$\{unit\}, tap to switch`\} className="([^"]*)"/)
    expect(m[1]).toMatch(/\bmin-h-11\b/)
    expect(m[1]).toMatch(/\bmin-w-11\b/)
  })
})
