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

describe('install screenshots', () => {
  it.each(['screenshot-home.png', 'screenshot-workout.png'])('ships public/%s', (file) => {
    const path = new URL(`../../public/${file}`, import.meta.url)
    expect(existsSync(path)).toBe(true)
    expect(statSync(path).size).toBeGreaterThan(10_000)
  })
})
