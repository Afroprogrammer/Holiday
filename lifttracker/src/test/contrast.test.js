import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Every text token must reach 4.5:1 on the surfaces it is used on, in both
// themes (spec, "Screens"; plan, Global Constraints).
const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')
const [, darkBlock, lightBlock] = css.match(/@theme \{([^}]*)\}[\s\S]*?prefers-color-scheme: light\) \{\s*:root \{([^}]*)\}/)
const read = (block) => Object.fromEntries([...block.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-f]{6})/g)].map((m) => [m[1], m[2]]))
const dark = read(darkBlock)
const light = read(lightBlock)

function luminance(hex) {
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  const [r, g, b] = [1, 3, 5].map((i) => f(parseInt(hex.slice(i, i + 2), 16) / 255))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const pairs = [
  ['ink', 'canvas'], ['ink', 'card'], ['ink', 'raised'],
  ['ink-2', 'canvas'], ['ink-2', 'card'],
  ['ink-3', 'canvas'], ['ink-3', 'card'],
  ['act', 'canvas'], ['act', 'card'],
  ['flag', 'canvas'], ['flag', 'card'],
  ['on-act', 'act'],
]

describe.each([['dark', dark], ['light', light]])('%s theme text contrast', (_, t) => {
  it.each(pairs)('%s on %s is at least 4.5:1', (fg, bg) => {
    expect(contrast(t[fg], t[bg]), `${t[fg]} on ${t[bg]}`).toBeGreaterThanOrEqual(4.5)
  })
})
