import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { exercises } from '../db/program.js'
import { ILLUSTRATION_FRAMES, illustrationUrl } from '../lib/illustrations.js'

describe('exercise illustrations', () => {
  it('gives every seeded exercise a slug with three frames on disk', () => {
    for (const e of exercises) {
      expect(e.illustration, e.id).toMatch(/^[a-z0-9-]+$/)
      for (const frame of ILLUSTRATION_FRAMES) {
        const path = new URL(`../../public/illustrations/${e.illustration}/${frame}.svg`, import.meta.url)
        expect(existsSync(path), `${e.id} frame ${frame}`).toBe(true)
      }
    }
  })

  it('builds the public url for a frame under the Vite base', () => {
    expect(illustrationUrl('bench-press', 2)).toBe('/illustrations/bench-press/2.svg')
  })
})
