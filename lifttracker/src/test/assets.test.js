import { existsSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// One variable woff2 per family carries every weight the app uses.
const fonts = ['oswald.woff2', 'source-sans-3.woff2']

describe('shipped fonts', () => {
  it.each(fonts)('ships public/fonts/%s as a real woff2 file', (file) => {
    const path = new URL(`../../public/fonts/${file}`, import.meta.url)
    expect(existsSync(path)).toBe(true)
    expect(statSync(path).size).toBeGreaterThan(5000)
  })
})
