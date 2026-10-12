# LiftTracker Night shift redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild every LiftTracker screen to the approved "Night shift" visual world (navy, amber, Oswald + Source Sans 3, animated motion-ghost exercise illustrations) without changing stored data or Phase 1 behaviour.

**Architecture:** Tokens, fonts and illustration CSS live in `src/index.css` (Tailwind v4 `@theme`). Five small presentational components (`Illustration`, `Stepper`, `BottomSheet`, `RestDock`, `CycleBar`, plus `NumberField` and `DaySheet`) are shared by four rebuilt screens. All new logic is in pure modules under `src/lib/` with Vitest tests; screens only compose. The Dexie schema stays at version 1; one seeded field (`illustration`) is added and backfilled on launch.

**Tech Stack:** React 19, Vite 8, Tailwind CSS 4 (`@tailwindcss/vite`), Dexie 4 + `dexie-react-hooks`, `vite-plugin-pwa`, Vitest 5, oxlint. Node 22. All commands run from `lifttracker/`.

**Spec:** `docs/superpowers/specs/2026-10-12-lifttracker-visual-redesign-design.md`

## Global Constraints

- Work on branch `redesign/night-shift`; never commit to `main`.
- Run every command from `/Users/administrator/Documents/liftApp/Holiday/lifttracker`.
- Weights are stored exactly as entered with their unit. No task may convert a stored value or change `src/db/db.js`.
- Dexie schema stays at `db.version(1)`.
- No runtime network fetches: fonts and illustrations ship in `public/` and are precached by the existing workbox glob `**/*.{js,css,html,svg,png,woff2}`.
- Every tap target is at least 44×44 px. Text contrast at least 4.5:1 on its surface, display text at least 3:1.
- Components use tokens only (`bg-canvas`, `text-ink-2`, `text-act`, …). No literal colours in JSX.
- Illustration licence: artwork is CC BY-SA 4.0 (Everkinetic, Workout Guide). Fonts are SIL OFL. Both attributed in `lifttracker/ATTRIBUTION.md` and the Settings "About" row.
- Existing 25 tests must stay green at every commit. `npm test` and `npm run lint` pass before each commit.
- Commit messages: plain English, imperative, one line, no prefixes (matches `git log`).

## Review Focus

1. A workout whose exercise lacks an `illustration` field (installed before this change, backfill failed): the `Illustration` component must render nothing rather than a broken mask. Test in Task 4.
2. All sets logged or skipped, nothing open: the active-set block must disappear, the header must read `16 / 16 sets`, Finish must complete without a sheet. Test in Task 5 (`activePosition` returns null, `remainingSentence` returns `''`).
3. Previous session logged in lb, display unit now kg: the "last" line must show the converted value and mark it (`last 90 lb (40.8 kg) × 8`). Test in Task 5 (`lastTimeText`).
4. Rest overtime past one minute: countdown shows `+1:05` in flag colour and the bar stays full. Test in Task 8 (`progressFraction` clamps to 1; `formatCountdown` already tested).
5. An exercise whose history has sets at different weights in one session (drop set): the history line must not collapse them into one weight. Test in Task 6 (`formatSession`).

---

### Task 1: Self-hosted fonts and attribution

**Files:**
- Create: `public/fonts/oswald-500.woff2`, `public/fonts/oswald-600.woff2`, `public/fonts/oswald-700.woff2`, `public/fonts/source-sans-3-400.woff2`, `public/fonts/source-sans-3-600.woff2`
- Create: `ATTRIBUTION.md`
- Create: `scripts/fetch-fonts.py`
- Modify: `src/index.css` (add `@font-face`, keep the rest for now)
- Test: `src/test/assets.test.js`

**Interfaces:**
- Produces: the five woff2 files and the font family names `Oswald` and `Source Sans 3` that Task 2 references in tokens.

- [ ] **Step 1: Write the failing test**

Create `src/test/assets.test.js`:

```js
import { existsSync, statSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const fonts = [
  'oswald-500.woff2',
  'oswald-600.woff2',
  'oswald-700.woff2',
  'source-sans-3-400.woff2',
  'source-sans-3-600.woff2',
]

describe('shipped fonts', () => {
  it.each(fonts)('ships public/fonts/%s as a real woff2 file', (file) => {
    const path = new URL(`../../public/fonts/${file}`, import.meta.url)
    expect(existsSync(path)).toBe(true)
    expect(statSync(path).size).toBeGreaterThan(5000)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/test/assets.test.js`
Expected: 5 failures, `expected false to be true`.

- [ ] **Step 3: Write the fetch script**

Create `scripts/fetch-fonts.py`:

```python
"""Downloads the latin woff2 files for Oswald and Source Sans 3 from Google
Fonts into public/fonts. Run once; the files are committed. Usage:
    python3 scripts/fetch-fonts.py
"""
import re
import sys
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / 'public' / 'fonts'
UA = ('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
      '(KHTML, like Gecko) Chrome/124.0 Safari/537.36')
FAMILIES = {
    'Oswald': ('oswald', [500, 600, 700]),
    'Source Sans 3': ('source-sans-3', [400, 600]),
}


def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req) as r:
        return r.read()


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for family, (slug, weights) in FAMILIES.items():
        q = family.replace(' ', '+') + ':wght@' + ';'.join(map(str, weights))
        css = fetch(f'https://fonts.googleapis.com/css2?family={q}&display=swap').decode()
        blocks = re.findall(r'/\* latin \*/\s*@font-face\s*{(.*?)}', css, re.S)
        for block in blocks:
            weight = int(re.search(r'font-weight:\s*(\d+)', block).group(1))
            url = re.search(r'url\((https://fonts\.gstatic\.com/[^)]+\.woff2)\)', block).group(1)
            if weight not in weights:
                continue
            target = OUT / f'{slug}-{weight}.woff2'
            target.write_bytes(fetch(url))
            print(f'{target.name}: {target.stat().st_size} bytes')
    missing = [f'{slug}-{w}.woff2' for slug, ws in FAMILIES.values() for w in ws
               if not (OUT / f'{slug}-{w}.woff2').exists()]
    if missing:
        print('missing:', missing, file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()
```

Run: `python3 scripts/fetch-fonts.py`
Expected: five lines, each with a size above 5000 bytes. If Google returns a variable-font block with `font-weight: 500 700` for Oswald, the regex still captures the first number; in that case the same file is saved under each weight name, which is acceptable because the variable file carries every weight.

- [ ] **Step 4: Add the `@font-face` rules**

In `src/index.css`, insert directly after `@import "tailwindcss";`:

```css
@font-face {
  font-family: "Oswald";
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url("/fonts/oswald-500.woff2") format("woff2");
}
@font-face {
  font-family: "Oswald";
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url("/fonts/oswald-600.woff2") format("woff2");
}
@font-face {
  font-family: "Oswald";
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url("/fonts/oswald-700.woff2") format("woff2");
}
@font-face {
  font-family: "Source Sans 3";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/fonts/source-sans-3-400.woff2") format("woff2");
}
@font-face {
  font-family: "Source Sans 3";
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url("/fonts/source-sans-3-600.woff2") format("woff2");
}
```

Vite rewrites `/fonts/...` under `base` at build time (the Pages build sets `BASE_PATH=/Holiday/`), so these absolute paths are correct in both environments.

- [ ] **Step 5: Write `ATTRIBUTION.md`**

Create `ATTRIBUTION.md`:

```markdown
# Attribution

## Exercise illustrations

The line-art exercise figures in `public/illustrations/` come from
[Workout Guide](https://github.com/bryllim/workout-guide) by Bryl Lim, which
builds on pose artwork from [Everkinetic](https://github.com/everkinetic/data).
Both are licensed under
[Creative Commons Attribution-ShareAlike 4.0](https://creativecommons.org/licenses/by-sa/4.0/).
The files are used unmodified except for colour, which is applied with a CSS
mask at render time.

## Fonts

[Oswald](https://fonts.google.com/specimen/Oswald) by Vernon Adams, Kalapi
Gajjar and Cyreal, and
[Source Sans 3](https://fonts.google.com/specimen/Source+Sans+3) by Paul D.
Hunt and Adobe, both under the
[SIL Open Font License 1.1](https://openfontlicense.org/). The woff2 files in
`public/fonts/` were downloaded from Google Fonts with
`scripts/fetch-fonts.py`.
```

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: 30 passed (25 existing + 5 new).

- [ ] **Step 7: Commit**

```bash
git add public/fonts scripts/fetch-fonts.py ATTRIBUTION.md src/index.css src/test/assets.test.js
git commit -m "Self-host Oswald and Source Sans 3 for LiftTracker"
```

---

### Task 2: Night shift colour and type tokens

**Files:**
- Modify: `src/index.css` (replace the `@theme` block, the light-theme block, and body rules)
- Modify: `index.html:5` (`theme-color`)
- Modify: `vite.config.js:20-21` (`background_color`, `theme_color`)
- Modify: `src/components/SetRow.jsx:393` (`text-up` / `text-down` → `text-flag`), `src/screens/Home.jsx:109,119`, `src/screens/Settings.jsx:200,210`, `src/screens/Workout.jsx:97`, `src/components/ExerciseCard.jsx:357`, `src/components/SetRow.jsx:448`, `src/components/SecondsField.jsx:522`, `src/screens/ExerciseSettings.jsx:234,263` (`border-rule-strong` → `border-rule`)

**Interfaces:**
- Produces: Tailwind utilities `bg-canvas`, `bg-card`, `bg-raised`, `border-rule`, `text-ink`, `text-ink-2`, `text-ink-3`, `bg-act`, `text-act`, `border-act`, `text-on-act`, `text-flag`, `font-ui`, `font-num`. Later tasks use only these.

- [ ] **Step 1: Replace the token block**

In `src/index.css`, replace everything from the comment `/* Design tokens from the accepted wireframe` through the end of the `@media (prefers-color-scheme: light)` block with:

```css
/* Night shift: deep navy ground, cool white ink, one amber accent for action
   and "now", coral only for reps outside the target range. Oswald carries
   display and numerals, Source Sans 3 carries text. Accepted October 12, 2026.
   See docs/superpowers/specs/2026-10-12-lifttracker-visual-redesign-design.md. */
@theme {
  --font-ui: "Source Sans 3", system-ui, sans-serif;
  --font-num: "Oswald", "Arial Narrow", sans-serif;

  --color-canvas: #0a1020;
  --color-card: #101a30;
  --color-raised: #15213a;
  --color-rule: #1f2b48;
  --color-ink: #eaf0ff;
  --color-ink-2: #9aa8c8;
  --color-ink-3: #5a6a90;
  --color-act: #ffb000;
  --color-on-act: #231800;
  --color-flag: #ff6f61;
}

@media (prefers-color-scheme: light) {
  :root {
    --color-canvas: #f2f4fa;
    --color-card: #ffffff;
    --color-raised: #e6eaf4;
    --color-rule: #d3d9e8;
    --color-ink: #121a2c;
    --color-ink-2: #4f5c7a;
    --color-ink-3: #8591ad;
    --color-act: #a86a00;
    --color-on-act: #ffffff;
    --color-flag: #c23b2e;
  }
}
```

Keep the existing `html { color-scheme: dark light; }` and `body` rules. Add to `body`: `font-variant-numeric: tabular-nums;`.

- [ ] **Step 2: Rename removed tokens in existing files**

Run from `lifttracker/`:

```bash
grep -rl "rule-strong" src | xargs sed -i '' 's/rule-strong/rule/g'
sed -i '' "s/up ? 'text-up' : 'text-down'/'text-flag'/" src/components/SetRow.jsx
grep -rn "text-up\|text-down\|rule-strong" src || echo "clean"
```

Expected final line: `clean`.

- [ ] **Step 3: Update manifest and theme colours**

In `index.html` change `content="#1a1e22"` to `content="#0a1020"`.
In `vite.config.js` change both `background_color: '#1a1e22'` and `theme_color: '#1a1e22'` to `'#0a1020'`.

- [ ] **Step 4: Verify**

Run: `npm test && npm run lint && npm run build`
Expected: 30 tests pass, lint clean, build writes `dist/`.

- [ ] **Step 5: Commit**

```bash
git add src/index.css index.html vite.config.js src
git commit -m "Switch LiftTracker to the Night shift tokens"
```

---

### Task 3: Illustration assets and exercise mapping

**Files:**
- Create: `scripts/fetch-illustrations.sh`
- Create: `public/illustrations/<slug>/1.svg`, `2.svg`, `3.svg` for 20 slugs
- Modify: `src/db/program.js:8-19` (add `illustration` to the `exercise` factory), `:21-45` (add slugs)
- Modify: `src/db/seed.js`
- Test: `src/test/illustrations.test.js`, `src/test/seed.test.js`

**Interfaces:**
- Produces: `exercise.illustration` (string slug) on every seeded exercise; `ILLUSTRATION_FRAMES = [1, 2, 3]` and `illustrationUrl(slug, frame)` exported from `src/lib/illustrations.js`; `seedIfEmpty` also backfills missing `illustration` fields.

- [ ] **Step 1: Write the failing tests**

Create `src/test/illustrations.test.js`:

```js
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
```

Create `src/test/seed.test.js`:

```js
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { beforeEach, describe, expect, it } from 'vitest'
import { seedIfEmpty } from '../db/seed.js'

function freshDb() {
  const database = new Dexie(`seed-test-${Math.random()}`)
  database.version(1).stores({
    exercises: 'id, name',
    programDays: 'id, order',
    workouts: 'id, programDayId, startedAt, finishedAt',
    sets: 'id, workoutId, exerciseId, [workoutId+exerciseId], loggedAt',
    settings: 'key',
  })
  return database
}

describe('seedIfEmpty', () => {
  let database
  beforeEach(() => {
    database = freshDb()
  })

  it('seeds exercises with an illustration slug on first launch', async () => {
    expect(await seedIfEmpty(database)).toBe(true)
    const bench = await database.exercises.get('barbell-bench-press')
    expect(bench.illustration).toBe('bench-press')
  })

  it('backfills a missing illustration without touching edited fields', async () => {
    await seedIfEmpty(database)
    await database.exercises.update('barbell-bench-press', { illustration: undefined, restSeconds: 75 })
    expect(await seedIfEmpty(database)).toBe(false)
    const bench = await database.exercises.get('barbell-bench-press')
    expect(bench.illustration).toBe('bench-press')
    expect(bench.restSeconds).toBe(75)
  })
})
```

Install the IndexedDB shim for Node tests:

```bash
npm install --save-dev fake-indexeddb@6.0.0
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/test/illustrations.test.js src/test/seed.test.js`
Expected: FAIL, `Cannot find module '../lib/illustrations.js'` and `expected undefined to be 'bench-press'`.

- [ ] **Step 3: Fetch the SVG frames**

Create `scripts/fetch-illustrations.sh`:

```bash
#!/usr/bin/env bash
# Copies the three SVG frames for each exercise we ship from the Workout Guide
# repository (CC BY-SA 4.0, see ATTRIBUTION.md). Run once; files are committed.
set -euo pipefail
cd "$(dirname "$0")/.."
BASE="https://raw.githubusercontent.com/bryllim/workout-guide/main/packages/workout-guide/assets"
SLUGS="bench-press machine-chest-press seated-dumbbell-press dip cable-crunch assisted-pull-up seated-row shrug dumbbell-shrug bicep-curl hanging-knee-raise cable-woodchop incline-dumbbell-press overhead-press tricep-pushdown decline-sit-up deadlift lat-pulldown barbell-row weighted-crunch"
for slug in $SLUGS; do
  mkdir -p "public/illustrations/$slug"
  for frame in 1 2 3; do
    out="public/illustrations/$slug/$frame.svg"
    curl -fsSL "$BASE/$slug/frame-$frame.svg" -o "$out"
    grep -q '<svg' "$out" || { echo "bad file $out" >&2; exit 1; }
  done
  echo "$slug"
done
```

Run:

```bash
chmod +x scripts/fetch-illustrations.sh && scripts/fetch-illustrations.sh && ls public/illustrations | wc -l
```

Expected: 20 slugs printed, then `20`.

- [ ] **Step 4: Add the slug to every seeded exercise**

In `src/db/program.js`, change the factory so the fifth positional argument is the slug:

```js
const exercise = (id, name, category, displayUnit, restSeconds, illustration, extra = {}) => ({
  id,
  name,
  category,
  displayUnit,
  incrementKg: 2.5,
  incrementLb: 5,
  restSeconds,
  illustration,
  lowerIsBetter: false,
  isTimeBased: false,
  ...extra,
})
```

Replace the `exercises` array with:

```js
export const exercises = [
  // Push A
  exercise('barbell-bench-press', 'Barbell bench press', 'compound', KG, 90, 'bench-press'),
  exercise('machine-chest-press', 'Machine chest press', 'isolation', KG, 60, 'machine-chest-press'),
  exercise('dumbbell-shoulder-press', 'Dumbbell shoulder press', 'compound', LB, 90, 'seated-dumbbell-press'),
  exercise('dips', 'Dips, bodyweight or assisted', 'compound', KG, 90, 'dip'),
  exercise('weighted-cable-crunch', 'Weighted cable crunch', 'core', KG, 60, 'cable-crunch'),
  // Pull A
  exercise('assisted-pull-ups', 'Assisted pull-ups', 'compound', KG, 90, 'assisted-pull-up', { lowerIsBetter: true }),
  exercise('row-machine', 'Row machine, seated cable or chest-supported', 'isolation', KG, 60, 'seated-row'),
  exercise('barbell-shrugs', 'Barbell shrugs', 'isolation', KG, 60, 'shrug'),
  exercise('dumbbell-shrugs', 'Dumbbell shrugs', 'isolation', LB, 60, 'dumbbell-shrug'),
  exercise('barbell-curls', 'Barbell curls', 'isolation', KG, 60, 'bicep-curl'),
  exercise('dumbbell-curls', 'Dumbbell curls', 'isolation', LB, 60, 'bicep-curl'),
  exercise('hanging-knee-raises', 'Hanging knee raises', 'core', KG, 60, 'hanging-knee-raise'),
  exercise('cable-woodchoppers', 'Cable woodchoppers', 'core', KG, 60, 'cable-woodchop'),
  // Push B (machine chest press is shared with Push A)
  exercise('incline-dumbbell-press', 'Incline dumbbell press', 'compound', LB, 90, 'incline-dumbbell-press'),
  exercise('barbell-overhead-press', 'Barbell overhead press', 'compound', KG, 90, 'overhead-press'),
  exercise('tricep-pushdowns', 'Tricep pushdowns, cable', 'isolation', KG, 60, 'tricep-pushdown'),
  exercise('weighted-decline-sit-ups', 'Weighted decline sit-ups', 'core', KG, 60, 'decline-sit-up'),
  // Pull B
  exercise('deadlift', 'Deadlift, conventional or Romanian', 'compound', KG, 120, 'deadlift'),
  exercise('lat-pulldown', 'Lat pulldown', 'isolation', KG, 60, 'lat-pulldown'),
  exercise('barbell-bent-over-row', 'Barbell bent-over row', 'compound', KG, 90, 'barbell-row'),
  exercise('heavy-dumbbell-shrugs', 'Heavy dumbbell shrugs', 'isolation', LB, 60, 'dumbbell-shrug'),
  exercise('machine-ab-crunch', 'Machine ab crunch', 'core', KG, 60, 'weighted-crunch'),
]
```

- [ ] **Step 5: Create `src/lib/illustrations.js`**

```js
// Exercise illustrations ship as three SVG frames per exercise under
// public/illustrations/<slug>/{1,2,3}.svg (start, middle, end of the
// movement). Frame 2 is the resting pose used wherever one frame is shown.
export const ILLUSTRATION_FRAMES = [1, 2, 3]

// Vite exposes the configured base as import.meta.env.BASE_URL ("/" locally,
// "/Holiday/" on GitHub Pages). Tests run in Node where it is undefined.
export function illustrationUrl(slug, frame) {
  const base = (import.meta.env && import.meta.env.BASE_URL) || '/'
  return `${base.replace(/\/$/, '')}/illustrations/${slug}/${frame}.svg`
}
```

- [ ] **Step 6: Backfill in `seedIfEmpty`**

Replace `src/db/seed.js` with:

```js
import { db } from './db.js'
import { exercises, programDays, defaultSettings } from './program.js'

// Seeds the program on first launch ("The program": "The program is seeded on
// first launch."). When exercises already exist it only backfills fields that
// later versions added (currently `illustration`), so edits made in settings
// are never overwritten. Returns true when it seeded from empty.
export async function seedIfEmpty(database = db) {
  const count = await database.exercises.count()
  if (count > 0) {
    await backfill(database)
    return false
  }
  await database.transaction('rw', database.exercises, database.programDays, database.settings, async () => {
    await database.exercises.bulkAdd(exercises)
    await database.programDays.bulkAdd(programDays)
    await database.settings.bulkAdd(defaultSettings)
  })
  return true
}

async function backfill(database) {
  for (const seeded of exercises) {
    const stored = await database.exercises.get(seeded.id)
    if (stored && !stored.illustration) {
      await database.exercises.update(seeded.id, { illustration: seeded.illustration })
    }
  }
}
```

- [ ] **Step 7: Run tests**

Run: `npm test`
Expected: 34 passed.

- [ ] **Step 8: Commit**

```bash
git add scripts/fetch-illustrations.sh public/illustrations src/db/program.js src/db/seed.js src/lib/illustrations.js src/test/illustrations.test.js src/test/seed.test.js package.json package-lock.json
git commit -m "Ship exercise illustrations and map them to the program"
```

---

### Task 4: Illustration component with motion ghost

**Files:**
- Create: `src/components/Illustration.jsx`
- Modify: `src/index.css` (append ghost CSS)
- Test: `src/test/illustration-component.test.jsx`

**Interfaces:**
- Produces: `<Illustration slug size tone live glow label />`. `slug: string | undefined`; `size: number` (px); `tone: 'ink-2' | 'ink-3' | 'act'` (default `'ink-2'`); `live: boolean` (animate); `glow: boolean`; `label: string` (aria-label, default `''` which marks it decorative). Renders `null` when `slug` is falsy.

- [ ] **Step 1: Install React test tooling**

```bash
npm install --save-dev @testing-library/react@16.3.0 jsdom@26.1.0
```

Component tests run in jsdom. The `test.environment` in `vite.config.js` stays `'node'`; every `.test.jsx` file opts in with this docblock as its first line:

```js
// @vitest-environment jsdom
```

- [ ] **Step 2: Write the failing test**

Create `src/test/illustration-component.test.jsx`:

```jsx
// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Illustration from '../components/Illustration.jsx'

describe('Illustration', () => {
  it('renders three masked layers, oldest first, current last', () => {
    const { container } = render(<Illustration slug="bench-press" size={96} />)
    const layers = container.querySelectorAll('.ill i')
    expect(layers).toHaveLength(3)
    expect(layers[0].style.getPropertyValue('--mm')).toContain('/bench-press/1.svg')
    expect(layers[1].style.getPropertyValue('--mm')).toContain('/bench-press/3.svg')
    expect(layers[2].style.getPropertyValue('--mm')).toContain('/bench-press/2.svg')
    expect(container.firstChild.style.width).toBe('96px')
  })

  it('adds live and glow classes only when asked', () => {
    const { container, rerender } = render(<Illustration slug="dip" size={40} />)
    expect(container.firstChild.className).not.toMatch(/live|glow/)
    rerender(<Illustration slug="dip" size={40} live glow />)
    expect(container.firstChild.className).toMatch(/live/)
    expect(container.firstChild.className).toMatch(/glow/)
  })

  it('renders nothing without a slug', () => {
    const { container } = render(<Illustration slug={undefined} size={40} />)
    expect(container.firstChild).toBeNull()
  })

  it('is decorative unless labelled', () => {
    const { container, rerender } = render(<Illustration slug="dip" size={40} />)
    expect(container.firstChild.getAttribute('aria-hidden')).toBe('true')
    rerender(<Illustration slug="dip" size={40} label="Dips" />)
    expect(container.firstChild.getAttribute('role')).toBe('img')
    expect(container.firstChild.getAttribute('aria-label')).toBe('Dips')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- src/test/illustration-component.test.jsx`
Expected: FAIL, `Cannot find module '../components/Illustration.jsx'`.

- [ ] **Step 4: Write the component**

Create `src/components/Illustration.jsx`:

```jsx
import { illustrationUrl } from '../lib/illustrations.js'

const TONE = {
  'ink-2': 'text-ink-2',
  'ink-3': 'text-ink-3',
  act: 'text-act',
}

// Order matters: the current pose (frame 2) is painted last so it sits on top
// of its ghosts. Each layer is a CSS mask over currentColor, so the figure
// takes whatever tone the surface asks for. Animation and opacities live in
// index.css under `.ill`.
const LAYER_FRAMES = [1, 3, 2]

export default function Illustration({ slug, size, tone = 'ink-2', live = false, glow = false, label = '' }) {
  if (!slug) return null
  const classes = ['ill', TONE[tone] ?? TONE['ink-2'], live ? 'live' : '', glow ? 'glow' : ''].filter(Boolean).join(' ')
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' }
  return (
    <span className={classes} style={{ width: size, height: size }} {...a11y}>
      {LAYER_FRAMES.map((frame) => (
        <i key={frame} style={{ '--mm': `url("${illustrationUrl(slug, frame)}")` }} />
      ))}
    </span>
  )
}
```

- [ ] **Step 5: Add the CSS**

Append to `src/index.css`:

```css
/* Motion ghost: three stacked masked layers. Static: frame 2 on top at full
   opacity, frame 3 behind at 45 %, frame 1 at 18 %. Live: the figure performs
   the movement 1 → 2 → 3 → 2 → 1 over 2.6 s and each pose leaves a trail.
   Layer order in the DOM is 1, 3, 2 (see Illustration.jsx). */
.ill {
  position: relative;
  display: inline-block;
  flex: none;
}
.ill i {
  position: absolute;
  inset: 0;
  background: currentColor;
  -webkit-mask: var(--mm) center / contain no-repeat;
  mask: var(--mm) center / contain no-repeat;
}
.ill i:nth-child(1) { opacity: 0.18; }
.ill i:nth-child(2) { opacity: 0.45; }
.ill i:nth-child(3) { opacity: 1; }

.ill.live i {
  animation-duration: 2.6s;
  animation-timing-function: cubic-bezier(0.65, 0, 0.35, 1);
  animation-iteration-count: infinite;
}
.ill.live i:nth-child(1) { animation-name: ill-pose-1; }
.ill.live i:nth-child(2) { animation-name: ill-pose-3; }
.ill.live i:nth-child(3) { animation-name: ill-pose-2; }
.ill.live::after {
  content: "";
  position: absolute;
  inset: -18%;
  pointer-events: none;
  background: radial-gradient(closest-side, color-mix(in srgb, var(--color-act) 22%, transparent), transparent 70%);
  animation: ill-pulse 2.6s cubic-bezier(0.65, 0, 0.35, 1) infinite;
}
.ill.live.glow i:nth-child(3) {
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--color-act) 70%, transparent));
}

@keyframes ill-pose-1 { 0% { opacity: 1 } 25% { opacity: 0.14 } 50% { opacity: 0.08 } 75% { opacity: 0.14 } 100% { opacity: 1 } }
@keyframes ill-pose-2 { 0% { opacity: 0.14 } 25% { opacity: 1 } 50% { opacity: 0.16 } 75% { opacity: 1 } 100% { opacity: 0.14 } }
@keyframes ill-pose-3 { 0% { opacity: 0.08 } 25% { opacity: 0.14 } 50% { opacity: 1 } 75% { opacity: 0.14 } 100% { opacity: 0.08 } }
@keyframes ill-pulse { 0%, 100% { opacity: 0.25 } 50% { opacity: 1 } }

@media (prefers-reduced-motion: reduce) {
  .ill.live i { animation: none; }
  .ill.live::after { display: none; }
}
```

- [ ] **Step 6: Run tests**

Run: `npm test`
Expected: 38 passed.

- [ ] **Step 7: Commit**

```bash
git add src/components/Illustration.jsx src/index.css src/test/illustration-component.test.jsx package.json package-lock.json
git commit -m "Add the motion-ghost Illustration component"
```

---

### Task 5: Workout progress logic

**Files:**
- Create: `src/lib/workoutProgress.js`
- Test: `src/test/workoutProgress.test.js`

**Interfaces:**
- Consumes: `prefillForSet(previousSets, setNumber)` and `rangeMarker(reps, repMin, repMax)` from `src/lib/prefill.js`; `convertWeight` from `src/lib/units.js`.
- Produces:
  - `buildPlan(entries, loggedSets, skipped, extra)` where `entries = [{ exercise, slot, previousSets }]` in program order, `skipped = { [exerciseId]: Set<number> }`, `extra = { [exerciseId]: number }`. Returns `{ exercises: PlanExercise[], done: number, total: number }` with `PlanExercise = { exercise, slot, total, remaining, rows: Row[] }` and `Row = { n, status: 'logged' | 'skipped' | 'open' | 'pending', set?, prefill, marker? }`. Exactly one row across the whole plan has status `'open'`: the first unlogged, unskipped set of the first exercise with any remaining, unless `focusExerciseId` (fifth argument, optional) names an exercise that still has remaining sets, in which case that exercise's first unlogged set is open.
  - `activePosition(plan)` → `{ exerciseIndex, setNumber } | null`.
  - `remainingSentence(plan)` → string like `5 sets not logged: dips 2 and 3, cable crunch 1 to 3. They stay unlogged.` or `''`.
  - `lastTimeText(prefill, displayUnit)` → `'–'` | `'60 kg × 7'` | `'90 lb (40.8 kg) × 8'`.
  - `formatElapsed(startedAtIso, nowMs)` → `'00:14'`, `'72:05'`.
  - `shortName(exerciseName)` → text before the first comma, lower-cased first letter kept as is (`'Dips, bodyweight or assisted'` → `'dips'`? No: returns `'Dips'`; the sentence builder lower-cases).

- [ ] **Step 1: Write the failing tests**

Create `src/test/workoutProgress.test.js`:

```js
import { describe, expect, it } from 'vitest'
import {
  activePosition,
  buildPlan,
  formatElapsed,
  lastTimeText,
  remainingSentence,
  shortName,
} from '../lib/workoutProgress.js'

const bench = { id: 'barbell-bench-press', name: 'Barbell bench press', displayUnit: 'kg' }
const dips = { id: 'dips', name: 'Dips, bodyweight or assisted', displayUnit: 'kg' }
const crunch = { id: 'weighted-cable-crunch', name: 'Weighted cable crunch', displayUnit: 'kg' }
const slot4 = { targetSets: 4, repMin: 5, repMax: 8 }
const slot3 = { targetSets: 3, repMin: 8, repMax: 12 }
const prev = [
  { setNumber: 1, weight: 60, unit: 'kg', reps: 8 },
  { setNumber: 2, weight: 60, unit: 'kg', reps: 7 },
]
const entries = [
  { exercise: bench, slot: slot4, previousSets: prev },
  { exercise: dips, slot: slot3, previousSets: [] },
  { exercise: crunch, slot: slot3, previousSets: [] },
]
const logged = (exerciseId, setNumber, reps = 8, weight = 60) => ({ id: `${exerciseId}-${setNumber}`, exerciseId, setNumber, weight, unit: 'kg', reps })

describe('buildPlan', () => {
  it('opens the first set of the first exercise on a fresh workout', () => {
    const plan = buildPlan(entries, [], {}, {})
    expect(plan.done).toBe(0)
    expect(plan.total).toBe(10)
    expect(plan.exercises[0].rows.map((r) => r.status)).toEqual(['open', 'pending', 'pending', 'pending'])
    expect(plan.exercises[1].rows.map((r) => r.status)).toEqual(['pending', 'pending', 'pending'])
    expect(activePosition(plan)).toEqual({ exerciseIndex: 0, setNumber: 1 })
  })

  it('prefills each row from the previous session', () => {
    const plan = buildPlan(entries, [], {}, {})
    expect(plan.exercises[0].rows[0].prefill).toEqual({ weight: 60, unit: 'kg', reps: 8 })
    expect(plan.exercises[0].rows[3].prefill).toEqual({ weight: 60, unit: 'kg', reps: 7 })
    expect(plan.exercises[1].rows[0].prefill).toBeNull()
  })

  it('marks logged sets, flags reps outside the range, and moves the open set on', () => {
    const plan = buildPlan(entries, [logged(bench.id, 1, 8), logged(bench.id, 2, 9)], {}, {})
    const rows = plan.exercises[0].rows
    expect(rows[0]).toMatchObject({ status: 'logged', marker: null })
    expect(rows[1]).toMatchObject({ status: 'logged', marker: { kind: 'above', bound: 8 } })
    expect(rows[2].status).toBe('open')
    expect(plan.done).toBe(2)
    expect(activePosition(plan)).toEqual({ exerciseIndex: 0, setNumber: 3 })
  })

  it('counts skipped sets out of the total and extra sets into it', () => {
    const plan = buildPlan(entries, [], { dips: new Set([3]) }, { 'barbell-bench-press': 1 })
    expect(plan.total).toBe(10)
    expect(plan.exercises[0].total).toBe(5)
    expect(plan.exercises[0].rows).toHaveLength(5)
    expect(plan.exercises[1].rows[2].status).toBe('skipped')
    expect(plan.exercises[1].remaining).toBe(2)
  })

  it('moves to the next exercise once one is finished', () => {
    const sets = [1, 2, 3, 4].map((n) => logged(bench.id, n))
    const plan = buildPlan(entries, sets, {}, {})
    expect(plan.exercises[0].remaining).toBe(0)
    expect(activePosition(plan)).toEqual({ exerciseIndex: 1, setNumber: 1 })
  })

  it('honours a focused exercise that still has sets', () => {
    const plan = buildPlan(entries, [], {}, {}, 'weighted-cable-crunch')
    expect(activePosition(plan)).toEqual({ exerciseIndex: 2, setNumber: 1 })
    expect(plan.exercises[0].rows[0].status).toBe('pending')
  })

  it('ignores a focused exercise with nothing left', () => {
    const sets = [1, 2, 3, 4].map((n) => logged(bench.id, n))
    const plan = buildPlan(entries, sets, {}, {}, 'barbell-bench-press')
    expect(activePosition(plan)).toEqual({ exerciseIndex: 1, setNumber: 1 })
  })

  it('has no open set when everything is logged or skipped', () => {
    const sets = [
      ...[1, 2, 3, 4].map((n) => logged(bench.id, n)),
      ...[1, 2].map((n) => logged(dips.id, n)),
      ...[1, 2, 3].map((n) => logged(crunch.id, n)),
    ]
    const plan = buildPlan(entries, sets, { dips: new Set([3]) }, {})
    expect(activePosition(plan)).toBeNull()
    expect(plan.done).toBe(9)
    expect(plan.total).toBe(9)
    expect(remainingSentence(plan)).toBe('')
  })
})

describe('remainingSentence', () => {
  it('names the count and the sets per exercise', () => {
    const sets = [...[1, 2, 3, 4].map((n) => logged(bench.id, n)), logged(dips.id, 1)]
    const plan = buildPlan(entries, sets, {}, {})
    expect(remainingSentence(plan)).toBe('5 sets not logged: dips 2 and 3, weighted cable crunch 1 to 3. They stay unlogged.')
  })

  it('uses the singular for one set', () => {
    const sets = [...[1, 2, 3, 4].map((n) => logged(bench.id, n)), ...[1, 2, 3].map((n) => logged(dips.id, n)), logged(crunch.id, 1), logged(crunch.id, 2)]
    const plan = buildPlan(entries, sets, {}, {})
    expect(remainingSentence(plan)).toBe('1 set not logged: weighted cable crunch 3. It stays unlogged.')
  })

  it('lists non-consecutive sets individually', () => {
    const sets = [...[1, 2, 3, 4].map((n) => logged(bench.id, n)), ...[1, 2, 3].map((n) => logged(dips.id, n)), logged(crunch.id, 2)]
    const plan = buildPlan(entries, sets, {}, {})
    expect(remainingSentence(plan)).toBe('2 sets not logged: weighted cable crunch 1 and 3. They stay unlogged.')
  })
})

describe('lastTimeText', () => {
  it('shows a dash with no history', () => {
    expect(lastTimeText(null, 'kg')).toBe('–')
  })
  it('shows the stored value in its own unit', () => {
    expect(lastTimeText({ weight: 60, unit: 'kg', reps: 7 }, 'kg')).toBe('60 kg × 7')
  })
  it('converts and marks when the display unit changed since', () => {
    expect(lastTimeText({ weight: 90, unit: 'lb', reps: 8 }, 'kg')).toBe('90 lb (40.8 kg) × 8')
  })
})

describe('formatElapsed', () => {
  it('pads minutes and seconds', () => {
    const start = new Date(1_000_000).toISOString()
    expect(formatElapsed(start, 1_000_000 + 14_000)).toBe('00:14')
    expect(formatElapsed(start, 1_000_000 + 72 * 60_000 + 5_000)).toBe('72:05')
  })
})

describe('shortName', () => {
  it('drops the qualifier after a comma', () => {
    expect(shortName('Dips, bodyweight or assisted')).toBe('Dips')
    expect(shortName('Barbell bench press')).toBe('Barbell bench press')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/test/workoutProgress.test.js`
Expected: FAIL, `Cannot find module '../lib/workoutProgress.js'`.

- [ ] **Step 3: Write the module**

Create `src/lib/workoutProgress.js`:

```js
import { prefillForSet, rangeMarker } from './prefill.js'
import { convertWeight } from './units.js'

// Pure view logic for the workout screen. The screen passes the current
// exercise per slot (after alternative selection), this module decides which
// set is open, what each row shows, and the header count.

export function buildPlan(entries, loggedSets, skipped, extra, focusExerciseId = null) {
  const exercises = entries.map(({ exercise, slot, previousSets }) => {
    const total = slot.targetSets + (extra[exercise.id] ?? 0)
    const skippedSet = skipped[exercise.id] ?? new Set()
    const rows = []
    for (let n = 1; n <= total; n += 1) {
      const set = loggedSets.find((s) => s.exerciseId === exercise.id && s.setNumber === n)
      const prefill = prefillForSet(previousSets, n)
      if (set) rows.push({ n, status: 'logged', set, prefill, marker: rangeMarker(set.reps, slot.repMin, slot.repMax) })
      else if (skippedSet.has(n)) rows.push({ n, status: 'skipped', prefill })
      else rows.push({ n, status: 'pending', prefill })
    }
    const remaining = rows.filter((r) => r.status === 'pending').length
    return { exercise, slot, total, remaining, rows }
  })

  let openIndex = exercises.findIndex((e) => e.exercise.id === focusExerciseId && e.remaining > 0)
  if (openIndex === -1) openIndex = exercises.findIndex((e) => e.remaining > 0)
  if (openIndex !== -1) {
    const row = exercises[openIndex].rows.find((r) => r.status === 'pending')
    row.status = 'open'
  }

  const done = exercises.reduce((sum, e) => sum + e.rows.filter((r) => r.status === 'logged').length, 0)
  const total = exercises.reduce((sum, e) => sum + e.rows.filter((r) => r.status !== 'skipped').length, 0)
  return { exercises, done, total }
}

export function activePosition(plan) {
  for (const [exerciseIndex, e] of plan.exercises.entries()) {
    const row = e.rows.find((r) => r.status === 'open')
    if (row) return { exerciseIndex, setNumber: row.n }
  }
  return null
}

// "Dips, bodyweight or assisted" → "Dips". The qualifier is for settings.
export function shortName(name) {
  return name.split(',')[0].trim()
}

function describeRuns(numbers) {
  const runs = []
  for (const n of numbers) {
    const last = runs.at(-1)
    if (last && last.end === n - 1) last.end = n
    else runs.push({ start: n, end: n })
  }
  const parts = runs.map((r) => (r.start === r.end ? `${r.start}` : r.end === r.start + 1 ? `${r.start} and ${r.end}` : `${r.start} to ${r.end}`))
  if (parts.length <= 1) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`
}

// "5 sets not logged: dips 2 and 3, weighted cable crunch 1 to 3. They stay unlogged."
export function remainingSentence(plan) {
  const groups = plan.exercises
    .map((e) => ({ name: shortName(e.exercise.name).toLowerCase(), numbers: e.rows.filter((r) => r.status !== 'logged' && r.status !== 'skipped').map((r) => r.n) }))
    .filter((g) => g.numbers.length > 0)
  const count = groups.reduce((sum, g) => sum + g.numbers.length, 0)
  if (count === 0) return ''
  const list = groups.map((g) => `${g.name} ${describeRuns(g.numbers)}`).join(', ')
  return count === 1 ? `1 set not logged: ${list}. It stays unlogged.` : `${count} sets not logged: ${list}. They stay unlogged.`
}

// The "last" value for a set. When the display unit was flipped since the
// previous session the stored value is shown converted and marked.
export function lastTimeText(prefill, displayUnit) {
  if (!prefill) return '–'
  const weight =
    prefill.unit === displayUnit
      ? `${prefill.weight} ${prefill.unit}`
      : `${prefill.weight} ${prefill.unit} (${convertWeight(prefill.weight, prefill.unit, displayUnit)} ${displayUnit})`
  return `${weight} × ${prefill.reps}`
}

// "00:14" since the workout started. Minutes are not capped at 59.
export function formatElapsed(startedAtIso, nowMs = Date.now()) {
  const total = Math.max(0, Math.floor((nowMs - new Date(startedAtIso).getTime()) / 1000))
  const m = String(Math.floor(total / 60)).padStart(2, '0')
  const s = String(total % 60).padStart(2, '0')
  return `${m}:${s}`
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/test/workoutProgress.test.js`
Expected: all pass. Note the run description for `[1, 3]` must give `1 and 3`; `describeRuns` produces `['1', '3']` → `1 and 3`. For `[2, 3]` a two-long run gives `2 and 3`. For `[1, 2, 3]` → `1 to 3`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/workoutProgress.js src/test/workoutProgress.test.js
git commit -m "Add workout progress view logic"
```

---

### Task 6: Exercise history and placement logic

**Files:**
- Create: `src/lib/history.js`, `src/lib/placement.js`
- Modify: `src/db/workouts.js` (add `getExerciseHistory`)
- Test: `src/test/history.test.js`, `src/test/placement.test.js`

**Interfaces:**
- Produces:
  - `groupSessions(sets, workouts, limit = 5)` → `[{ workoutId, finishedAt, sets }]` newest first, only finished workouts, sets sorted by `setNumber`.
  - `formatSession(sets)` → `'60 kg × 8 · 8 · 7 · 6'`; weight changes inside a session start a new group: `'60 kg × 8 · 8, 57.5 kg × 6'`. Empty array → `'–'`.
  - `exercisePlacements(exerciseId, programDays)` → `[{ dayName, index }]` (index is 1-based slot position).
  - `placementCaption(placements)` → `'Push A · exercise 1'`, `'Push A and Push B · exercise 2'`, `''` when empty.
  - `getExerciseHistory(exerciseId, limit = 5)` (async, `src/db/workouts.js`) → `groupSessions` output using the database.

- [ ] **Step 1: Write the failing tests**

Create `src/test/history.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { formatSession, groupSessions } from '../lib/history.js'

const w = (id, finishedAt) => ({ id, finishedAt, startedAt: finishedAt, programDayId: 'push-a' })
const s = (workoutId, setNumber, weight, reps, unit = 'kg') => ({ id: `${workoutId}-${setNumber}`, workoutId, exerciseId: 'barbell-bench-press', setNumber, weight, unit, reps, loggedAt: '2026-10-09T10:00:00Z' })

describe('groupSessions', () => {
  it('groups sets by finished workout, newest first, sorted by set number', () => {
    const workouts = [w('a', '2026-10-04T11:00:00Z'), w('b', '2026-10-09T11:00:00Z'), { id: 'c', finishedAt: null, startedAt: '2026-10-12T10:00:00Z', programDayId: 'push-a' }]
    const sets = [s('a', 1, 57.5, 8), s('b', 2, 60, 8), s('b', 1, 60, 8), s('c', 1, 62.5, 5)]
    const sessions = groupSessions(sets, workouts)
    expect(sessions.map((x) => x.workoutId)).toEqual(['b', 'a'])
    expect(sessions[0].sets.map((x) => x.setNumber)).toEqual([1, 2])
  })

  it('limits to the newest n sessions', () => {
    const workouts = [1, 2, 3, 4, 5, 6, 7].map((n) => w(`w${n}`, `2026-10-0${n}T11:00:00Z`))
    const sets = workouts.map((x) => s(x.id, 1, 60, 8))
    expect(groupSessions(sets, workouts, 5)).toHaveLength(5)
    expect(groupSessions(sets, workouts, 5)[0].workoutId).toBe('w7')
  })
})

describe('formatSession', () => {
  it('joins reps with middots after one weight', () => {
    expect(formatSession([s('a', 1, 60, 8), s('a', 2, 60, 8), s('a', 3, 60, 7), s('a', 4, 60, 6)])).toBe('60 kg × 8 · 8 · 7 · 6')
  })
  it('starts a new group when the weight or unit changes', () => {
    expect(formatSession([s('a', 1, 60, 8), s('a', 2, 60, 8), s('a', 3, 57.5, 6)])).toBe('60 kg × 8 · 8, 57.5 kg × 6')
    expect(formatSession([s('a', 1, 60, 8), s('a', 2, 130, 8, 'lb')])).toBe('60 kg × 8, 130 lb × 8')
  })
  it('shows a dash for no sets', () => {
    expect(formatSession([])).toBe('–')
  })
})
```

Create `src/test/placement.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { programDays } from '../db/program.js'
import { exercisePlacements, placementCaption } from '../lib/placement.js'

describe('exercise placement', () => {
  it('finds the day and slot position', () => {
    expect(exercisePlacements('barbell-bench-press', programDays)).toEqual([{ dayName: 'Push A', index: 1 }])
    expect(exercisePlacements('dumbbell-shrugs', programDays)).toEqual([{ dayName: 'Pull A', index: 3 }])
  })
  it('lists both days for the shared machine chest press', () => {
    expect(exercisePlacements('machine-chest-press', programDays)).toEqual([
      { dayName: 'Push A', index: 2 },
      { dayName: 'Push B', index: 2 },
    ])
  })
  it('writes the caption', () => {
    expect(placementCaption([{ dayName: 'Push A', index: 1 }])).toBe('Push A · exercise 1')
    expect(placementCaption([{ dayName: 'Push A', index: 2 }, { dayName: 'Push B', index: 2 }])).toBe('Push A and Push B · exercise 2')
    expect(placementCaption([])).toBe('')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/test/history.test.js src/test/placement.test.js`
Expected: FAIL, modules not found.

- [ ] **Step 3: Write `src/lib/history.js`**

```js
// History list for the exercise settings screen: the last few finished
// sessions that contain the exercise, each as one line of sets.

export function groupSessions(sets, workouts, limit = 5) {
  const finished = workouts.filter((w) => w.finishedAt).sort((a, b) => (a.finishedAt < b.finishedAt ? 1 : -1))
  const byWorkout = new Map()
  for (const set of sets) {
    if (!byWorkout.has(set.workoutId)) byWorkout.set(set.workoutId, [])
    byWorkout.get(set.workoutId).push(set)
  }
  const sessions = []
  for (const workout of finished) {
    const own = byWorkout.get(workout.id)
    if (!own) continue
    sessions.push({ workoutId: workout.id, finishedAt: workout.finishedAt, sets: [...own].sort((a, b) => a.setNumber - b.setNumber) })
    if (sessions.length === limit) break
  }
  return sessions
}

// "60 kg × 8 · 8 · 7 · 6"; a weight or unit change starts a new group so a
// drop set reads "60 kg × 8 · 8, 57.5 kg × 6".
export function formatSession(sets) {
  if (sets.length === 0) return '–'
  const groups = []
  for (const set of sets) {
    const last = groups.at(-1)
    if (last && last.weight === set.weight && last.unit === set.unit) last.reps.push(set.reps)
    else groups.push({ weight: set.weight, unit: set.unit, reps: [set.reps] })
  }
  return groups.map((g) => `${g.weight} ${g.unit} × ${g.reps.join(' · ')}`).join(', ')
}
```

- [ ] **Step 4: Write `src/lib/placement.js`**

```js
// Where an exercise sits in the program, for the exercise settings caption.
export function exercisePlacements(exerciseId, programDays) {
  const out = []
  for (const day of [...programDays].sort((a, b) => a.order - b.order)) {
    day.slots.forEach((slot, i) => {
      if (slot.exerciseIds.includes(exerciseId)) out.push({ dayName: day.name, index: i + 1 })
    })
  }
  return out
}

// "Push A · exercise 1" or "Push A and Push B · exercise 2".
export function placementCaption(placements) {
  if (placements.length === 0) return ''
  const days = placements.map((p) => p.dayName).join(' and ')
  return `${days} · exercise ${placements[0].index}`
}
```

- [ ] **Step 5: Add the query to `src/db/workouts.js`**

Append:

```js
// The last `limit` finished sessions containing an exercise, newest first,
// for the history list on the exercise settings screen.
export async function getExerciseHistory(exerciseId, limit = 5) {
  const sets = await db.sets.where('exerciseId').equals(exerciseId).toArray()
  const workouts = await db.workouts.toArray()
  return groupSessions(sets, workouts, limit)
}
```

and add `import { groupSessions } from '../lib/history.js'` at the top.

- [ ] **Step 6: Run tests**

Run: `npm test && npm run lint`
Expected: all pass (47 tests).

- [ ] **Step 7: Commit**

```bash
git add src/lib/history.js src/lib/placement.js src/db/workouts.js src/test/history.test.js src/test/placement.test.js
git commit -m "Add exercise history and placement logic"
```

---

### Task 7: Shared controls: Stepper, NumberField, BottomSheet, DaySheet, CycleBar

**Files:**
- Create: `src/components/Stepper.jsx`, `src/components/NumberField.jsx`, `src/components/BottomSheet.jsx`, `src/components/DaySheet.jsx`, `src/components/CycleBar.jsx`
- Delete: `src/components/SecondsField.jsx` (after Task 11 and 12 stop importing it; deletion happens in Task 12)
- Test: `src/test/controls.test.jsx`

**Interfaces:**
- `Stepper({ value, onChange, step, size, unit, onFlipUnit, caption, label, inputMode })`: `value` is a string; `onChange(string)`; `step` number; `size` `'weight' | 'reps'`; `unit` optional string rendered in amber beside the value, as a button when `onFlipUnit` is given; `caption` text under the value; `label` for aria; `inputMode` `'decimal' | 'numeric'`.
- `NumberField({ label, caption, value, suffix, onChange, inputMode = 'numeric' })`: 56 px row with a 44 px field right-aligned.
- `BottomSheet({ open, title, children, onClose })`: scrim + sheet; closes on scrim tap and Escape; `role="dialog" aria-modal="true"`; renders `null` when `!open`.
- `DaySheet({ open, days, nextDayId, title, copy, onPick, onClose })`: BottomSheet with one row per day; `onPick(day)`.
- `CycleBar({ days, nextDayId })`: four segments.
- `summaryOf(day, exercisesById)` (named export from `DaySheet.jsx`) → `'bench · chest press · shoulder press · dips · crunch'`: lower-cased short names of each slot's first exercise, with `'barbell '`, `'dumbbell '`, `'weighted '`, `'machine '`, `'assisted '`, `'heavy '`, `'cable '` prefixes dropped and `', ...'` qualifiers removed.

- [ ] **Step 1: Write the failing tests**

Create `src/test/controls.test.jsx`:

```jsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Stepper from '../components/Stepper.jsx'
import BottomSheet from '../components/BottomSheet.jsx'
import CycleBar from '../components/CycleBar.jsx'
import { summaryOf } from '../components/DaySheet.jsx'
import { exercises, programDays } from '../db/program.js'

describe('Stepper', () => {
  it('steps by the increment and never below zero', () => {
    const onChange = vi.fn()
    render(<Stepper value="60" onChange={onChange} step={2.5} size="weight" unit="kg" caption="132 lb · ±2.5" label="Weight" inputMode="decimal" />)
    fireEvent.click(screen.getByLabelText('Weight plus'))
    expect(onChange).toHaveBeenLastCalledWith('62.5')
    fireEvent.click(screen.getByLabelText('Weight minus'))
    expect(onChange).toHaveBeenLastCalledWith('57.5')
    onChange.mockClear()
    const { rerender } = render(<Stepper value="1" onChange={onChange} step={2.5} size="weight" label="W2" inputMode="decimal" />)
    fireEvent.click(screen.getByLabelText('W2 minus'))
    expect(onChange).toHaveBeenLastCalledWith('0')
    rerender(<Stepper value="" onChange={onChange} step={1} size="reps" label="W2" inputMode="numeric" />)
    fireEvent.click(screen.getByLabelText('W2 plus'))
    expect(onChange).toHaveBeenLastCalledWith('1')
  })

  it('strips non-numeric input', () => {
    const onChange = vi.fn()
    render(<Stepper value="6" onChange={onChange} step={1} size="reps" label="Reps" inputMode="numeric" />)
    fireEvent.change(screen.getByLabelText('Reps'), { target: { value: '7a.' } })
    expect(onChange).toHaveBeenLastCalledWith('7.')
  })

  it('offers the unit as a button only when it can flip', () => {
    const flip = vi.fn()
    const { rerender } = render(<Stepper value="60" onChange={() => {}} step={2.5} size="weight" unit="kg" label="Weight" inputMode="decimal" />)
    expect(screen.queryByRole('button', { name: /unit kg/i })).toBeNull()
    rerender(<Stepper value="60" onChange={() => {}} step={2.5} size="weight" unit="kg" onFlipUnit={flip} label="Weight" inputMode="decimal" />)
    fireEvent.click(screen.getByRole('button', { name: /unit kg/i }))
    expect(flip).toHaveBeenCalled()
  })
})

describe('BottomSheet', () => {
  it('renders nothing when closed and closes on scrim tap and Escape', () => {
    const onClose = vi.fn()
    const { container, rerender } = render(<BottomSheet open={false} title="T" onClose={onClose}>x</BottomSheet>)
    expect(container.firstChild).toBeNull()
    rerender(<BottomSheet open title="T" onClose={onClose}>x</BottomSheet>)
    expect(screen.getByRole('dialog', { name: 'T' })).toBeTruthy()
    fireEvent.click(screen.getByTestId('scrim'))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})

describe('CycleBar', () => {
  it('marks days before the next one as done and the next one as current', () => {
    const { container } = render(<CycleBar days={programDays} nextDayId="push-b" />)
    const segs = [...container.querySelectorAll('[data-state]')].map((s) => s.dataset.state)
    expect(segs).toEqual(['done', 'done', 'now', 'todo'])
  })
})

describe('summaryOf', () => {
  it('shortens each slot to a word or two', () => {
    const byId = new Map(exercises.map((e) => [e.id, e]))
    expect(summaryOf(programDays[0], byId)).toBe('bench press · chest press · shoulder press · dips · cable crunch')
    expect(summaryOf(programDays[3], byId)).toBe('deadlift · lat pulldown · bent-over row · dumbbell shrugs · ab crunch')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/test/controls.test.jsx`
Expected: FAIL, modules not found.

- [ ] **Step 3: Write `Stepper.jsx`**

```jsx
// The large weight and reps steppers of the active set. Minus and plus are
// 64 px columns; the value is editable by tapping it. See the spec's
// "Workout" section for sizes.
export default function Stepper({ value, onChange, step, size, unit, onFlipUnit, caption, label, inputMode }) {
  const num = value === '' ? 0 : Number(value)
  const bump = (delta) => onChange(String(Math.max(0, Math.round((num + delta) * 100) / 100)))
  const tall = size === 'weight'
  const valueClass = tall ? 'text-[56px]' : 'text-[44px]'
  return (
    <div className={`grid grid-cols-[64px_1fr_64px] overflow-hidden rounded-2xl border border-rule bg-card ${tall ? 'h-[92px]' : 'h-[76px]'}`}>
      <button type="button" aria-label={`${label} minus`} onClick={() => bump(-step)} className="border-r border-rule font-num text-[40px] leading-none text-ink-2">
        −
      </button>
      <div className="flex flex-col items-center justify-center">
        <div className="flex items-baseline">
          <input
            type="text"
            inputMode={inputMode}
            aria-label={label}
            value={value}
            onChange={(e) => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
            size={Math.max(1, value.length)}
            className={`w-auto min-w-[1ch] bg-transparent text-center font-num font-bold leading-none tracking-tight outline-none ${valueClass}`}
          />
          {unit &&
            (onFlipUnit ? (
              <button type="button" onClick={onFlipUnit} aria-label={`Unit ${unit}, tap to switch`} className="ml-1.5 font-num text-[22px] font-semibold text-act">
                {unit}
              </button>
            ) : (
              <span className="ml-1.5 font-num text-[22px] font-semibold text-act">{unit}</span>
            ))}
        </div>
        {caption && <span className="mt-0.5 text-[13px] font-medium text-ink-3">{caption}</span>}
      </div>
      <button type="button" aria-label={`${label} plus`} onClick={() => bump(step)} className="border-l border-rule font-num text-[40px] leading-none text-ink-2">
        +
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Write `NumberField.jsx`**

```jsx
// A settings row with a numeric field on the right: "Rest after a set  [90] s".
export default function NumberField({ label, caption, value, suffix, onChange, inputMode = 'numeric' }) {
  const pattern = inputMode === 'decimal' ? /[^0-9.]/g : /[^0-9]/g
  return (
    <label className="flex min-h-14 items-center justify-between gap-3 border-b border-rule py-2">
      <span className="min-w-0">
        <span className="block text-base">{label}</span>
        {caption && <span className="block text-[13px] text-ink-2">{caption}</span>}
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <input
          type="text"
          inputMode={inputMode}
          value={value}
          aria-label={label}
          onChange={(e) => onChange(e.target.value.replace(pattern, ''))}
          className="h-11 w-16 rounded-lg border border-rule bg-raised px-2 text-right font-num text-2xl font-semibold outline-none focus:border-act"
        />
        <span className="w-5 text-sm text-ink-2">{suffix}</span>
      </span>
    </label>
  )
}
```

- [ ] **Step 5: Write `BottomSheet.jsx`**

```jsx
import { useEffect } from 'react'

// Scrim plus a sheet that rises from the bottom. Used instead of modals and
// window.confirm: pick a day, finish with sets remaining, reset the cycle.
export default function BottomSheet({ open, title, children, onClose }) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-20">
      <div data-testid="scrim" onClick={onClose} className="absolute inset-0 bg-canvas/80" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-rule bg-card px-5 pt-3.5 pb-[calc(24px+env(safe-area-inset-bottom,0px))]"
      >
        <div className="mx-auto mb-3.5 h-1 w-10 rounded-full bg-rule" />
        <h2 className="font-num text-[28px] font-bold uppercase leading-none">{title}</h2>
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Write `DaySheet.jsx`**

```jsx
import BottomSheet from './BottomSheet.jsx'

const DROP = /^(barbell|dumbbell|weighted|machine|assisted|heavy|cable) /

// "bench press · chest press · shoulder press · dips · cable crunch": the first
// exercise of each slot, shortened so a day fits one caption line.
export function summaryOf(day, exercisesById) {
  return day.slots
    .map((slot) => {
      const name = exercisesById.get(slot.exerciseIds[0])?.name ?? slot.exerciseIds[0]
      const short = name.split(',')[0].trim().toLowerCase()
      return short === 'weighted cable crunch' ? 'cable crunch' : short.replace(DROP, '')
    })
    .join(' · ')
}

// The list of program days, used from Home ("Start a different day") and from
// Settings ("Cycle position"). `nextDayId` gets the "up next" tag.
export default function DaySheet({ open, days, exercisesById, nextDayId, title, copy, onPick, onClose }) {
  return (
    <BottomSheet open={open} title={title} onClose={onClose}>
      <p className="mt-1 mb-3.5 text-[15px] text-ink-2">{copy}</p>
      <ul>
        {days.map((day, i) => {
          const current = day.id === nextDayId
          return (
            <li key={day.id} className={i < days.length - 1 ? 'border-b border-rule' : ''}>
              <button type="button" onClick={() => onPick(day)} className="flex min-h-[60px] w-full items-center gap-3 py-2 text-left">
                <span className="min-w-0 flex-1">
                  <span className={`block font-num text-2xl font-bold uppercase leading-none ${current ? 'text-act' : ''}`}>{day.name}</span>
                  <span className="mt-1 block truncate text-[13px] text-ink-2">{summaryOf(day, exercisesById)}</span>
                </span>
                {current && <span className="rounded-md border border-act/50 px-1.5 py-0.5 text-xs font-semibold text-act">up next</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </BottomSheet>
  )
}
```

- [ ] **Step 7: Write `CycleBar.jsx`**

```jsx
// Four 4 px segments: days already done in this cycle, the one up next, the
// rest. `days` are program days with `order`.
export default function CycleBar({ days, nextDayId }) {
  const ordered = [...days].sort((a, b) => a.order - b.order)
  const nextOrder = ordered.find((d) => d.id === nextDayId)?.order ?? 1
  return (
    <div className="mt-3 flex gap-1.5" aria-hidden="true">
      {ordered.map((day) => {
        const state = day.order < nextOrder ? 'done' : day.order === nextOrder ? 'now' : 'todo'
        const cls = state === 'now' ? 'bg-act' : state === 'done' ? 'bg-act/40' : 'bg-rule'
        return <i key={day.id} data-state={state} className={`h-1 flex-1 rounded-full ${cls}`} />
      })}
    </div>
  )
}
```

- [ ] **Step 8: Run tests**

Run: `npm test && npm run lint`
Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add src/components/Stepper.jsx src/components/NumberField.jsx src/components/BottomSheet.jsx src/components/DaySheet.jsx src/components/CycleBar.jsx src/test/controls.test.jsx
git commit -m "Add the shared Night shift controls"
```

---

### Task 8: Rest dock

**Files:**
- Create: `src/components/RestDock.jsx`
- Delete: `src/components/RestTimer.jsx`
- Modify: `src/lib/timer.js` (add `progressFraction`)
- Modify: `src/screens/Workout.jsx:3,101-107` (import and render `RestDock` instead of `RestTimer`, temporary until Task 10 rewrites the screen)
- Test: `src/test/timer.test.js` (append), `src/test/restdock.test.jsx`

**Interfaces:**
- `progressFraction(rest, nowMs)` → number in `[0, 1]`: elapsed share of `durationSeconds`, clamped.
- `RestDock({ rest, nextSlug, onAdjust, onSkip })`: `rest` is the stored rest or `null`; `nextSlug` the illustration slug for the next set's exercise; idle height 76 px, resting height 236 px. Exports `DOCK_HEIGHT = { idle: 76, resting: 236 }` so the screen can pad.

- [ ] **Step 1: Write the failing tests**

Append to `src/test/timer.test.js` inside the existing `describe('rest timer')`:

```js
  it('reports elapsed progress clamped to one', () => {
    expect(progressFraction(rest, t0)).toBe(0)
    expect(progressFraction(rest, t0 + 60_000)).toBeCloseTo(0.5)
    expect(progressFraction(rest, t0 + 200_000)).toBe(1)
  })
```

and add `progressFraction` to the import line.

Create `src/test/restdock.test.jsx`:

```jsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import RestDock from '../components/RestDock.jsx'
import { startRest } from '../lib/timer.js'

describe('RestDock', () => {
  it('shows the idle line with no rest', () => {
    render(<RestDock rest={null} nextSlug="bench-press" onAdjust={() => {}} onSkip={() => {}} />)
    expect(screen.getByText('Rest timer idle')).toBeTruthy()
    expect(screen.queryByRole('timer')).toBeNull()
  })

  it('counts down and shows the next exercise while resting', () => {
    vi.useFakeTimers()
    const now = 1_000_000
    vi.setSystemTime(now)
    const rest = startRest({ exerciseId: 'barbell-bench-press', exerciseName: 'Barbell bench press', restSeconds: 90 }, now)
    render(<RestDock rest={rest} nextSlug="machine-chest-press" onAdjust={() => {}} onSkip={() => {}} />)
    expect(screen.getByRole('timer').textContent).toContain('1:30')
    expect(screen.getByText('of 1:30')).toBeTruthy()
    expect(document.querySelector('.ill.live.glow')).toBeTruthy()
    vi.useRealTimers()
  })

  it('shows overtime in flag colour with a full bar', () => {
    vi.useFakeTimers()
    const now = 1_000_000
    vi.setSystemTime(now + 155_000)
    const rest = startRest({ exerciseId: 'deadlift', exerciseName: 'Deadlift', restSeconds: 90 }, now)
    render(<RestDock rest={rest} nextSlug="deadlift" onAdjust={() => {}} onSkip={() => {}} />)
    const timer = screen.getByRole('timer')
    expect(timer.textContent).toContain('+1:05')
    expect(timer.className).toContain('text-flag')
    expect(screen.getByTestId('rest-bar').style.width).toBe('100%')
    vi.useRealTimers()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/test/timer.test.js src/test/restdock.test.jsx`
Expected: FAIL, `progressFraction is not a function` and module not found.

- [ ] **Step 3: Add `progressFraction` to `src/lib/timer.js`**

Append:

```js
// Share of the rest already elapsed, for the progress bar. Clamped to [0, 1]
// so overtime keeps the bar full.
export function progressFraction(rest, now = Date.now()) {
  if (rest.durationSeconds <= 0) return 1
  const elapsed = (now - rest.startedAt) / 1000
  return Math.min(1, Math.max(0, elapsed / rest.durationSeconds))
}
```

- [ ] **Step 4: Write `RestDock.jsx`**

Create `src/components/RestDock.jsx` (moves `signalRestOver` over from `RestTimer.jsx` unchanged):

```jsx
import { useEffect, useRef, useState } from 'react'
import Illustration from './Illustration.jsx'
import { formatCountdown, progressFraction, remainingSeconds } from '../lib/timer.js'

export const DOCK_HEIGHT = { idle: 76, resting: 236 }

// At zero the device vibrates if it can. Vibration isn't available on iOS web
// apps, so the dock also flashes and plays a short tone if audio is allowed
// (prd.md, "Risks and mitigations").
function signalRestOver() {
  try {
    navigator.vibrate?.(300)
  } catch {
    // Not supported; the flash and tone still run.
  }
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.value = 0.2
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.25)
    osc.onended = () => ctx.close()
  } catch {
    // Audio blocked until the user interacts; nothing else to do.
  }
}

function useNow(active) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return undefined
    const tick = () => setNow(Date.now())
    tick()
    const id = setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [active])
  return now
}

// The rest timer, docked to the bottom of the workout screen. Idle it is one
// line; while resting it shows the countdown, a draining bar, the next
// exercise performing its movement, and ±15 s / Skip.
export default function RestDock({ rest, nextSlug, onAdjust, onSkip }) {
  const now = useNow(Boolean(rest))
  const [flash, setFlash] = useState(false)
  const firedFor = useRef(null)
  const remaining = rest ? remainingSeconds(rest, now) : null

  useEffect(() => {
    if (!rest || remaining > 0 || firedFor.current === rest.endsAt) return undefined
    firedFor.current = rest.endsAt
    signalRestOver()
    setFlash(true)
    const id = setTimeout(() => setFlash(false), 1200)
    return () => clearTimeout(id)
  }, [rest, remaining])

  const shell = 'fixed inset-x-0 bottom-0 z-10 border-t border-rule px-5 pb-[calc(18px+env(safe-area-inset-bottom,0px))] pt-3'

  if (!rest) {
    return (
      <aside className={`${shell} bg-card`} style={{ minHeight: DOCK_HEIGHT.idle }}>
        <div className="flex items-center gap-3">
          <span className="font-num text-[44px] font-bold leading-none text-ink-3">–</span>
          <span className="text-sm text-ink-2">
            <b className="block font-semibold text-ink">Rest timer idle</b>
            starts when you tap Done
          </span>
        </div>
      </aside>
    )
  }

  const over = remaining < 0
  const width = `${Math.round(progressFraction(rest, now) * 100)}%`
  return (
    <aside className={`${shell} ${flash ? 'bg-act text-on-act' : 'bg-card'}`} style={{ minHeight: DOCK_HEIGHT.resting }}>
      <div className={`flex justify-between text-[13px] font-medium ${flash ? '' : 'text-ink-2'}`}>
        <span>
          Rest · <b className={flash ? 'font-semibold' : 'font-semibold text-ink'}>{rest.exerciseName}</b>
        </span>
        <span>of {formatCountdown(rest.durationSeconds)}</span>
      </div>
      <div className="mt-1 flex items-center gap-3.5">
        <span role="timer" aria-live="off" className={`flex-1 font-num text-[72px] font-bold leading-none tracking-tighter ${over && !flash ? 'text-flag' : ''}`}>
          {formatCountdown(remaining)}
        </span>
        <Illustration slug={nextSlug} size={64} tone="act" live glow />
      </div>
      <div className="my-2 h-1 overflow-hidden rounded-full bg-rule">
        <i data-testid="rest-bar" className="block h-full bg-act" style={{ width }} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button type="button" onClick={() => onAdjust(-15)} className="h-12 rounded-xl border border-rule font-semibold">
          −15 s
        </button>
        <button type="button" onClick={() => onAdjust(15)} className="h-12 rounded-xl border border-rule font-semibold">
          +15 s
        </button>
        <button type="button" onClick={onSkip} className="h-12 rounded-xl border border-act font-semibold text-act">
          Skip
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 5: Swap it into the existing Workout screen**

In `src/screens/Workout.jsx` replace `import RestTimer from '../components/RestTimer.jsx'` with `import RestDock from '../components/RestDock.jsx'`, and replace the `{rest && (<RestTimer … />)}` block with:

```jsx
      <RestDock
        rest={rest}
        nextSlug={rest ? slots.flatMap((s) => s.options).find((o) => o.id === rest.exerciseId)?.illustration : undefined}
        onAdjust={(delta) => saveActiveRest(adjustRest(rest, delta))}
        onSkip={() => saveActiveRest(null)}
      />
```

Delete `src/components/RestTimer.jsx`:

```bash
git rm -q src/components/RestTimer.jsx
```

- [ ] **Step 6: Run tests and lint**

Run: `npm test && npm run lint`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/RestDock.jsx src/lib/timer.js src/screens/Workout.jsx src/test/timer.test.js src/test/restdock.test.jsx
git commit -m "Replace the rest timer with the docked RestDock"
```

---

### Task 9: Home screen

**Files:**
- Modify: `src/screens/Home.jsx` (rewrite)
- Modify: `src/db/queries.js` (add `getHomeView`)
- Modify: `src/lib/format.js` (add `formatShortDate`)
- Test: `src/test/format.test.js`

**Interfaces:**
- `getHomeView()` (async) → `{ nextDay, days, lastWorkout, exercisesById: Map, firstExercise, firstSession: { sets } | null, stripSlugs: string[] }`. `firstExercise` is the first exercise of `nextDay`'s first slot; `firstSession` its most recent finished session's sets (via `getPreviousSets(id, null)`); `stripSlugs` one slug per slot of `nextDay`, choosing the alternative with the most recent history, else the first.
- `formatShortDate(iso)` → `'Thu 9 Oct'`.

- [ ] **Step 1: Write the failing test**

Create `src/test/format.test.js`:

```js
import { describe, expect, it } from 'vitest'
import { formatShortDate } from '../lib/format.js'

describe('formatShortDate', () => {
  it('writes weekday, day, month', () => {
    expect(formatShortDate('2026-10-09T18:30:00Z')).toBe('Fri 9 Oct')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/test/format.test.js`
Expected: FAIL, `formatShortDate is not a function`.

- [ ] **Step 3: Add the formatter**

Append to `src/lib/format.js`:

```js
// "Thu 9 Oct", for the home screen's last-completed line and history rows.
export function formatShortDate(isoString) {
  const d = new Date(isoString)
  const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(d)
  const month = new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(d)
  return `${weekday} ${d.getDate()} ${month}`
}
```

- [ ] **Step 4: Add `getHomeView` to `src/db/queries.js`**

Append (and add `import { getPreviousSets } from './workouts.js'` at the top):

```js
// Everything the home screen shows: the next day, the cycle, the last
// finished workout, one illustration per slot, and the first exercise's last
// session for the "last time" line.
export async function getHomeView() {
  const [nextDay, days, lastWorkout, exercises] = await Promise.all([
    getNextProgramDay(),
    getProgramDays(),
    getLastFinishedWorkout(),
    db.exercises.toArray(),
  ])
  const exercisesById = new Map(exercises.map((e) => [e.id, e]))
  if (!nextDay) return { nextDay, days, lastWorkout, exercisesById, firstExercise: null, firstSession: null, stripSlugs: [] }

  const stripSlugs = []
  for (const slot of nextDay.slots) {
    let pick = slot.exerciseIds[0]
    let latest = null
    for (const id of slot.exerciseIds) {
      const sets = await getPreviousSets(id, null)
      const when = sets.map((s) => s.loggedAt).sort().at(-1) ?? null
      if (when && (!latest || when > latest)) {
        latest = when
        pick = id
      }
    }
    stripSlugs.push(exercisesById.get(pick)?.illustration)
  }
  const firstExercise = exercisesById.get(nextDay.slots[0].exerciseIds[0]) ?? null
  const firstSets = firstExercise ? await getPreviousSets(firstExercise.id, null) : []
  return {
    nextDay,
    days,
    lastWorkout,
    exercisesById,
    firstExercise,
    firstSession: firstSets.length > 0 ? { sets: [...firstSets].sort((a, b) => a.setNumber - b.setNumber) } : null,
    stripSlugs,
  }
}
```

- [ ] **Step 5: Rewrite `src/screens/Home.jsx`**

```jsx
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import CycleBar from '../components/CycleBar.jsx'
import DaySheet from '../components/DaySheet.jsx'
import Illustration from '../components/Illustration.jsx'
import { getHomeView } from '../db/queries.js'
import { formatSession } from '../lib/history.js'
import { formatShortDate } from '../lib/format.js'
import { shortName } from '../lib/workoutProgress.js'

// Home ("Poster"): the next day as a poster, the cycle, today's exercises as
// a strip of figures, and what you did last time. Start is pinned to the
// bottom with the day override behind a sheet.
export default function Home({ onStart }) {
  const view = useLiveQuery(getHomeView)
  const [picking, setPicking] = useState(false)
  if (view === undefined) return null
  const { nextDay, days, lastWorkout, exercisesById, firstExercise, firstSession, stripSlugs } = view
  const [dayWord, dayLetter] = (nextDay?.name ?? '–').split(' ')

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="flex-1 px-5 pt-3.5">
        <header className="flex h-11 items-center justify-between">
          <span className="font-num text-lg font-bold uppercase tracking-wide">LiftTracker</span>
          <a href="#settings" className="font-semibold text-act">
            Settings
          </a>
        </header>

        <section className="mt-7">
          <p className="text-[15px] font-medium text-ink-2">
            Up next · day {nextDay?.order ?? '–'} of {days.length}
          </p>
          <h1 className="mt-1.5 font-num text-[92px] font-bold uppercase leading-[0.92] tracking-tight">
            {dayWord}
            {dayLetter && <span className="ml-2.5 text-act">{dayLetter}</span>}
          </h1>
          <CycleBar days={days} nextDayId={nextDay?.id} />
          <div className="-mx-1 mt-6 flex gap-1">
            {stripSlugs.map((slug, i) => (
              <span key={i} className="flex flex-1 justify-center">
                <Illustration slug={slug} size={68} tone="ink-2" />
              </span>
            ))}
          </div>
          <dl className="mt-6 border-t border-rule pt-4 text-[15px] text-ink-2">
            <div className="flex items-baseline justify-between">
              <dt>Last completed</dt>
              <dd className="font-semibold text-ink">{lastWorkout ? `${lastWorkout.programDay?.name} · ${formatShortDate(lastWorkout.finishedAt)}` : '–'}</dd>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <dt>{firstExercise ? `${shortName(firstExercise.name)} last time` : 'Last time'}</dt>
              <dd className="font-num text-[19px] font-semibold text-ink">{firstSession ? formatSession(firstSession.sets) : '–'}</dd>
            </div>
          </dl>
        </section>
      </div>

      <div className="sticky bottom-0 flex flex-col gap-2.5 bg-linear-to-t from-canvas from-70% to-transparent px-5 pt-3 pb-[calc(20px+env(safe-area-inset-bottom,0px))]">
        <button type="button" onClick={() => onStart?.(nextDay)} disabled={!nextDay} className="h-[60px] rounded-2xl bg-act text-lg font-semibold text-on-act">
          Start {nextDay?.name}
        </button>
        <button type="button" onClick={() => setPicking(true)} className="h-[52px] rounded-2xl border border-rule font-semibold text-ink-2">
          Start a different day
        </button>
      </div>

      <DaySheet
        open={picking}
        days={days}
        exercisesById={exercisesById}
        nextDayId={nextDay?.id}
        title="Start a different day"
        copy="Cycle position moves only when you finish the workout."
        onPick={(day) => {
          setPicking(false)
          onStart?.(day)
        }}
        onClose={() => setPicking(false)}
      />
    </main>
  )
}
```

- [ ] **Step 6: Run tests, lint, and look**

Run: `npm test && npm run lint`
Expected: all pass.

Start the dev server (`npm run dev`), open `http://localhost:5173/` at 375 px wide in dark mode. Check: "PUSH A" fits on one line with the A in amber, strip shows five figures, Start is pinned, the sheet opens and closes. Repeat in light mode (`prefers-color-scheme: light`). Fix anything that overflows.

- [ ] **Step 7: Commit**

```bash
git add src/screens/Home.jsx src/db/queries.js src/lib/format.js src/test/format.test.js
git commit -m "Rebuild the home screen as the Night shift poster"
```

---

### Task 10: Workout screen

**Files:**
- Modify: `src/screens/Workout.jsx` (rewrite)
- Delete: `src/components/ExerciseCard.jsx`, `src/components/SetRow.jsx`
- Test: `src/test/workout-screen.test.jsx`

**Interfaces:**
- Consumes: `buildPlan`, `activePosition`, `remainingSentence`, `lastTimeText`, `formatElapsed`, `shortName` (Task 5); `Stepper`, `BottomSheet` (Task 7); `RestDock`, `DOCK_HEIGHT` (Task 8); `Illustration` (Task 4); `getWorkoutView`, `logSet`, `finishWorkout`, `getActiveRest`, `saveActiveRest`, `setDisplayUnit` from `src/db/workouts.js`; `startRest`, `adjustRest` from `src/lib/timer.js`; `convertWeight`, `incrementFor`, `otherUnit` from `src/lib/units.js`.
- Produces: default export `Workout({ workoutId, onFinished })`, unchanged signature.

- [ ] **Step 1: Write the failing test**

Create `src/test/workout-screen.test.jsx`. It renders the pure `ActiveSet` section exported for testing, so no database is needed:

```jsx
// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ActiveSet } from '../screens/Workout.jsx'

const exercise = { id: 'barbell-bench-press', name: 'Barbell bench press', displayUnit: 'kg', incrementKg: 2.5, incrementLb: 5 }
const row = { n: 3, status: 'open', prefill: { weight: 60, unit: 'kg', reps: 7 } }

describe('ActiveSet', () => {
  it('prefills from last time and logs with two taps', () => {
    const onDone = vi.fn()
    render(<ActiveSet exercise={exercise} row={row} total={4} targetText="5–8" onDone={onDone} onFlipUnit={() => {}} />)
    expect(screen.getByText('last 60 kg × 7')).toBeTruthy()
    expect(screen.getByLabelText('Weight').value).toBe('60')
    expect(screen.getByLabelText('Reps').value).toBe('7')
    fireEvent.click(screen.getByRole('button', { name: /done/i }))
    expect(onDone).toHaveBeenCalledWith(3, { weight: 60, unit: 'kg', reps: 7 })
  })

  it('converts the prefill into the display unit', () => {
    render(<ActiveSet exercise={{ ...exercise, displayUnit: 'lb' }} row={{ ...row, prefill: { weight: 60, unit: 'kg', reps: 7 } }} total={4} targetText="5–8" onDone={() => {}} onFlipUnit={() => {}} />)
    expect(screen.getByLabelText('Weight').value).toBe('132.3')
    expect(screen.getByText('last 60 kg (132.3 lb) × 7')).toBeTruthy()
  })

  it('disables Done until both fields have numbers', () => {
    render(<ActiveSet exercise={exercise} row={{ ...row, prefill: null }} total={4} targetText="5–8" onDone={() => {}} onFlipUnit={() => {}} />)
    expect(screen.getByText('last –')).toBeTruthy()
    expect(screen.getByRole('button', { name: /done/i }).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Weight'), { target: { value: '40' } })
    fireEvent.change(screen.getByLabelText('Reps'), { target: { value: '10' } })
    expect(screen.getByRole('button', { name: /done/i }).disabled).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/test/workout-screen.test.jsx`
Expected: FAIL, `ActiveSet` is not exported.

- [ ] **Step 3: Rewrite `src/screens/Workout.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import BottomSheet from '../components/BottomSheet.jsx'
import Illustration from '../components/Illustration.jsx'
import RestDock, { DOCK_HEIGHT } from '../components/RestDock.jsx'
import Stepper from '../components/Stepper.jsx'
import { finishWorkout, getActiveRest, getWorkoutView, logSet, saveActiveRest, setDisplayUnit } from '../db/workouts.js'
import { formatSession } from '../lib/history.js'
import { adjustRest, startRest } from '../lib/timer.js'
import { convertWeight, incrementFor, otherUnit } from '../lib/units.js'
import { activePosition, buildPlan, formatElapsed, lastTimeText, remainingSentence, shortName } from '../lib/workoutProgress.js'

// Picks which alternative a slot shows today: the one already logged in this
// workout, else the one with the most recent history, else the first.
function defaultExerciseId(slot, loggedSets) {
  for (const option of slot.options) {
    if (loggedSets.some((s) => s.exerciseId === option.id)) return option.id
  }
  let best = null
  for (const option of slot.options) {
    const sets = slot.previousBy[option.id]
    if (sets.length === 0) continue
    const latest = sets.map((s) => s.loggedAt).sort().at(-1)
    if (!best || latest > best.latest) best = { id: option.id, latest }
  }
  return best?.id ?? slot.options[0].id
}

function repsText(slot) {
  return slot.repMin === slot.repMax ? `${slot.repMin} reps` : `${slot.repMin}–${slot.repMax} reps`
}

function useTicker(ms) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}

// The one set with controls. Two taps when last time's values are right:
// Done and nothing else. Exported for tests.
export function ActiveSet({ exercise, row, total, targetText, onDone, onFlipUnit }) {
  const unit = exercise.displayUnit
  const initialWeight = row.prefill ? String(convertWeight(row.prefill.weight, row.prefill.unit, unit)) : ''
  const [weight, setWeight] = useState(initialWeight)
  const [reps, setReps] = useState(row.prefill ? String(row.prefill.reps) : '')
  const ready = weight !== '' && reps !== '' && !Number.isNaN(Number(weight)) && !Number.isNaN(Number(reps))
  const weightNum = weight === '' ? 0 : Number(weight)
  const step = incrementFor(exercise, unit)
  const other = otherUnit(unit)

  return (
    <section>
      <div className="mt-5 flex items-baseline justify-between">
        <h3 className="font-num text-[22px] font-bold uppercase tracking-wide">
          Set {row.n} <span className="font-semibold text-ink-3">of {total}</span>
        </h3>
        <p className="text-[15px] text-ink-2">
          last <b className="font-num text-[17px] font-semibold text-ink">{lastTimeText(row.prefill, unit)}</b>
        </p>
      </div>
      <div className="mt-3">
        <Stepper
          value={weight}
          onChange={setWeight}
          step={step}
          size="weight"
          unit={unit}
          onFlipUnit={onFlipUnit}
          caption={`${weight === '' ? '–' : convertWeight(weightNum, unit, other)} ${other} · ±${step}`}
          label="Weight"
          inputMode="decimal"
        />
      </div>
      <div className="mt-3">
        <Stepper value={reps} onChange={setReps} step={1} size="reps" caption={`reps · target ${targetText}`} label="Reps" inputMode="numeric" />
      </div>
      <button
        type="button"
        disabled={!ready}
        onClick={() => onDone(row.n, { weight: Number(weight), unit, reps: Number(reps) })}
        className="mt-3.5 h-16 w-full rounded-2xl bg-act text-xl font-semibold text-on-act disabled:opacity-45"
      >
        Done · start rest
      </button>
    </section>
  )
}

function SetRows({ plan, onSkip, onUnskip, onAddSet }) {
  const rows = plan.rows.filter((r) => r.status !== 'open')
  return (
    <ul className="mt-5 border-t border-rule">
      {rows.map((r) => (
        <li key={r.n} className={`flex h-11 items-center gap-3 border-b border-rule text-[15px] ${r.status === 'logged' ? 'text-ink' : 'text-ink-2'}`}>
          <span className={`w-10 font-num text-[15px] font-bold tracking-wide ${r.status === 'logged' ? 'text-act' : 'text-ink-3'}`}>S{r.n}</span>
          {r.status === 'logged' && (
            <>
              <span className="font-num text-[17px] font-semibold">
                {r.set.weight} {r.set.unit} × {r.set.reps}
              </span>
              {r.marker && <span className="ml-auto text-xs font-semibold text-flag">{r.marker.kind} range</span>}
            </>
          )}
          {r.status === 'skipped' && (
            <>
              <span>skipped</span>
              <button type="button" onClick={() => onUnskip(r.n)} className="ml-auto h-11 px-2 font-semibold text-act">
                Undo
              </button>
            </>
          )}
          {r.status === 'pending' && (
            <>
              <span>last {lastTimeText(r.prefill, plan.exercise.displayUnit)}</span>
              <button type="button" onClick={() => onSkip(r.n)} className="ml-auto h-11 px-2 font-semibold text-act">
                Skip
              </button>
            </>
          )}
        </li>
      ))}
      <li className="flex h-11 items-center gap-3">
        <span className="w-10 font-num text-[15px] font-bold text-ink-3">+</span>
        <button type="button" onClick={onAddSet} className="h-11 font-semibold text-act">
          Add set
        </button>
      </li>
    </ul>
  )
}

export default function Workout({ workoutId, onFinished }) {
  const view = useLiveQuery(() => getWorkoutView(workoutId), [workoutId])
  const rest = useLiveQuery(getActiveRest)
  const now = useTicker(1000)
  const [chosen, setChosen] = useState({})
  const [skipped, setSkipped] = useState({})
  const [extra, setExtra] = useState({})
  const [focus, setFocus] = useState(null)
  const [confirming, setConfirming] = useState(false)

  if (view === undefined || rest === undefined || view === null) return null
  const { workout, day, slots, loggedSets } = view

  const entries = slots.map((slot, index) => {
    const id = chosen[index] ?? defaultExerciseId(slot, loggedSets)
    const exercise = slot.options.find((o) => o.id === id)
    return { slot, exercise, previousSets: slot.previousBy[exercise.id], index }
  })
  const plan = buildPlan(entries, loggedSets, skipped, extra, focus)
  const position = activePosition(plan)
  const activeIndex = position?.exerciseIndex ?? plan.exercises.length - 1
  const active = plan.exercises[activeIndex]
  const activeRow = position ? active.rows.find((r) => r.status === 'open') : null
  const queue = plan.exercises.filter((e, i) => i !== activeIndex && e.remaining > 0)
  const completed = plan.exercises.filter((e, i) => i !== activeIndex && e.remaining === 0 && e.rows.some((r) => r.status === 'logged'))
  const sentence = remainingSentence(plan)

  const finish = async () => {
    await saveActiveRest(null)
    await finishWorkout(workout.id)
    setConfirming(false)
    onFinished?.()
  }

  const done = async (setNumber, values) => {
    await logSet({ workoutId: workout.id, exerciseId: active.exercise.id, setNumber, ...values })
    await saveActiveRest(startRest({ exerciseId: active.exercise.id, exerciseName: shortName(active.exercise.name), restSeconds: active.exercise.restSeconds }))
  }

  const toggleSkip = (exerciseId, setNumber, on) =>
    setSkipped((s) => {
      const next = new Set(s[exerciseId] ?? [])
      if (on) next.add(setNumber)
      else next.delete(setNumber)
      return { ...s, [exerciseId]: next }
    })

  const nextSlug = rest ? (activeRow ? active.exercise.illustration : undefined) : undefined

  return (
    <main className="min-h-dvh px-5 pt-3.5" style={{ paddingBottom: (rest ? DOCK_HEIGHT.resting : DOCK_HEIGHT.idle) + 16 }}>
      <header className="flex h-11 items-center justify-between text-sm font-medium text-ink-2">
        <span>
          {day.name} · {formatElapsed(workout.startedAt, now)}
        </span>
        <span className="font-num font-semibold tracking-wide">
          <b className="text-[17px] text-ink">{plan.done}</b> / {plan.total} sets
        </span>
      </header>

      <section className="mt-2 flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-act">
            Exercise {activeIndex + 1} of {plan.exercises.length}
          </p>
          <h2 className="mt-1 font-num text-[40px] font-bold uppercase leading-[0.95]">{active.exercise.name}</h2>
          <p className="mt-1.5 text-[15px] text-ink-2">
            {active.slot.targetSets} sets · {repsText(active.slot)} · rest {active.exercise.restSeconds} s{active.exercise.lowerIsBetter ? ' · assistance' : ''}
          </p>
          {active.slot.options.length > 1 && (
            <div className="mt-2 flex overflow-hidden rounded-lg border border-rule bg-raised text-sm">
              {active.slot.options.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setChosen((c) => ({ ...c, [entries[activeIndex].index]: option.id }))}
                  className={`h-11 flex-1 px-2 ${option.id === active.exercise.id ? 'bg-act font-semibold text-on-act' : 'text-ink-2'}`}
                >
                  {shortName(option.name)}
                </button>
              ))}
            </div>
          )}
        </div>
        <Illustration slug={active.exercise.illustration} size={96} tone="ink-2" live={Boolean(activeRow)} />
      </section>

      {activeRow ? (
        <ActiveSet
          key={`${active.exercise.id}-${activeRow.n}-${active.exercise.displayUnit}`}
          exercise={active.exercise}
          row={activeRow}
          total={active.total}
          targetText={repsText(active.slot).replace(' reps', '')}
          onDone={done}
          onFlipUnit={() => setDisplayUnit(active.exercise.id, otherUnit(active.exercise.displayUnit))}
        />
      ) : (
        <p className="mt-6 font-num text-[22px] font-bold uppercase tracking-wide text-act">All {plan.total} sets logged</p>
      )}

      <SetRows
        plan={active}
        onSkip={(n) => toggleSkip(active.exercise.id, n, true)}
        onUnskip={(n) => toggleSkip(active.exercise.id, n, false)}
        onAddSet={() => setExtra((e) => ({ ...e, [active.exercise.id]: (e[active.exercise.id] ?? 0) + 1 }))}
      />

      {queue.length > 0 && (
        <>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-ink-3">Up next</p>
          <ul>
            {queue.map((e) => (
              <li key={e.exercise.id} className="border-b border-rule last:border-0">
                <button type="button" onClick={() => setFocus(e.exercise.id)} className="flex h-14 w-full items-center gap-3 text-left">
                  <Illustration slug={e.exercise.illustration} size={40} tone="ink-3" />
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{shortName(e.exercise.name)}</span>
                  <span className="font-num text-sm text-ink-3">
                    {e.remaining} × {repsText(e.slot).replace(' reps', '')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {completed.length > 0 && (
        <>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-ink-3">Done</p>
          <ul>
            {completed.map((e) => (
              <li key={e.exercise.id} className="flex h-12 items-center gap-3 border-b border-rule text-[15px] last:border-0">
                <span className="min-w-0 flex-1 truncate text-ink-2">{shortName(e.exercise.name)}</span>
                <span className="font-num text-[15px] font-semibold">{formatSession(e.rows.filter((r) => r.status === 'logged').map((r) => r.set))}</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="pt-4 pb-6">
        <button
          type="button"
          onClick={() => (sentence ? setConfirming(true) : finish())}
          className={`h-[52px] w-full rounded-2xl font-semibold ${sentence ? 'border border-rule text-ink-2' : 'bg-act text-on-act'}`}
        >
          Finish workout
        </button>
      </div>

      <RestDock rest={rest} nextSlug={nextSlug} onAdjust={(delta) => saveActiveRest(adjustRest(rest, delta))} onSkip={() => saveActiveRest(null)} />

      <BottomSheet open={confirming} title={`Finish ${day.name}?`} onClose={() => setConfirming(false)}>
        <p className="mt-1 mb-3.5 text-[15px] text-ink-2">{sentence}</p>
        <button type="button" onClick={() => setConfirming(false)} className="mb-2.5 h-[60px] w-full rounded-2xl bg-act text-lg font-semibold text-on-act">
          Keep going
        </button>
        <button type="button" onClick={finish} className="h-[52px] w-full rounded-2xl border border-rule font-semibold text-ink-2">
          Finish anyway
        </button>
      </BottomSheet>
    </main>
  )
}
```

Delete the old card components:

```bash
git rm -q src/components/ExerciseCard.jsx src/components/SetRow.jsx
```

- [ ] **Step 4: Run tests, lint, and look**

Run: `npm test && npm run lint`
Expected: all pass.

In the dev server at 375 px: start Push A, log a set, confirm the dock grows and the hero figure animates, tap an "Up next" row and confirm the hero changes, tap Skip on a pending row and Undo, tap Finish with sets remaining and confirm the sheet copy, then "Finish anyway". Flip the unit via the amber `kg` and confirm the prefill converts. Check in light mode. Fix overflow.

- [ ] **Step 5: Commit**

```bash
git add src/screens/Workout.jsx src/test/workout-screen.test.jsx
git commit -m "Rebuild the workout screen around the current set"
```

---

### Task 11: Settings screen

**Files:**
- Modify: `src/screens/Settings.jsx` (rewrite)
- Modify: `src/db/settings.js` (no change needed; uses `resetCycle`, `getExercisesByName`, `getSetting`, `setSetting`)

**Interfaces:**
- Consumes: `NumberField`, `DaySheet`, `BottomSheet`, `Illustration`; `getNextProgramDay`, `getProgramDays` from `src/db/queries.js`; `DEFAULT_REST_KEYS`, `getExercisesByName`, `getSetting`, `resetCycle`, `setSetting` from `src/db/settings.js`.

- [ ] **Step 1: Rewrite `src/screens/Settings.jsx`**

```jsx
import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import BottomSheet from '../components/BottomSheet.jsx'
import DaySheet from '../components/DaySheet.jsx'
import Illustration from '../components/Illustration.jsx'
import NumberField from '../components/NumberField.jsx'
import { getNextProgramDay, getProgramDays } from '../db/queries.js'
import { DEFAULT_REST_KEYS, getExercisesByName, getSetting, resetCycle, setSetting } from '../db/settings.js'

function Group({ children }) {
  return <h2 className="mt-6 mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-3">{children}</h2>
}

function DefaultRest({ label, caption, settingKey }) {
  const stored = useLiveQuery(() => getSetting(settingKey), [settingKey])
  if (stored === undefined) return null
  return <NumberField label={label} caption={caption} value={String(stored)} suffix="s" onChange={(v) => setSetting(settingKey, v === '' ? 0 : Number(v))} />
}

// Settings (prd.md, "Settings"): default rest, per-exercise overrides behind
// each row, the cycle position, and attribution for the artwork and fonts.
export default function Settings() {
  const exercises = useLiveQuery(getExercisesByName, [], [])
  const days = useLiveQuery(getProgramDays, [], [])
  const nextDay = useLiveQuery(getNextProgramDay)
  const [picking, setPicking] = useState(false)
  const [resetting, setResetting] = useState(false)
  const exercisesById = new Map(exercises.map((e) => [e.id, e]))
  const firstDay = days[0]

  return (
    <main className="min-h-dvh px-5 pt-3.5 pb-8">
      <header className="flex h-11 items-center">
        <a href="#" className="font-semibold text-act">
          ‹ Home
        </a>
      </header>
      <h1 className="mt-3 font-num text-[40px] font-bold uppercase leading-none">Settings</h1>

      <Group>Default rest</Group>
      <DefaultRest label="Compound lifts" caption="bench, press, deadlift, rows, pull-ups" settingKey={DEFAULT_REST_KEYS.compound} />
      <DefaultRest label="Isolation and core" caption="curls, shrugs, pushdowns, crunches" settingKey={DEFAULT_REST_KEYS.isolation} />

      <Group>Exercises</Group>
      <ul>
        {exercises.map((e) => (
          <li key={e.id}>
            <a href={`#settings/${e.id}`} className="flex min-h-14 items-center gap-3 border-b border-rule py-1.5">
              <Illustration slug={e.illustration} size={36} tone="ink-3" />
              <span className="min-w-0 flex-1 text-base">{e.name}</span>
              <span className="text-right font-num text-sm leading-tight text-ink-2">
                <b className="block text-lg font-semibold text-ink">{e.displayUnit}</b>
                {e.displayUnit === 'kg' ? e.incrementKg : e.incrementLb} · {e.restSeconds} s
              </span>
              <span aria-hidden="true" className="font-num text-[22px] text-ink-3">
                ›
              </span>
            </a>
          </li>
        ))}
      </ul>

      <Group>Program</Group>
      <button type="button" onClick={() => setPicking(true)} className="flex min-h-14 w-full items-center gap-3 border-b border-rule py-2 text-left">
        <span className="min-w-0 flex-1">
          <span className="block text-base">Cycle position</span>
          <span className="block text-[13px] text-ink-2">
            next: {nextDay?.name ?? '–'} · day {nextDay?.order ?? '–'} of {days.length}
          </span>
        </span>
        <span aria-hidden="true" className="font-num text-[22px] text-ink-3">
          ›
        </span>
      </button>
      <button type="button" onClick={() => setResetting(true)} className="flex min-h-14 w-full items-center py-2 text-left text-base font-semibold text-flag">
        Reset cycle to {firstDay?.name ?? 'Push A'}
      </button>

      <Group>About</Group>
      <p className="text-[13px] leading-snug text-ink-3">
        Exercise illustrations: Workout Guide and Everkinetic, CC BY-SA 4.0. Fonts: Oswald and Source Sans 3, SIL Open Font License.
      </p>

      <DaySheet
        open={picking}
        days={days}
        exercisesById={exercisesById}
        nextDayId={nextDay?.id}
        title="Cycle position"
        copy="Pick the day the home screen offers next. Nothing is logged."
        onPick={async (day) => {
          await resetCycle(day.id)
          setPicking(false)
        }}
        onClose={() => setPicking(false)}
      />

      <BottomSheet open={resetting} title={`Reset cycle to ${firstDay?.name ?? 'Push A'}?`} onClose={() => setResetting(false)}>
        <p className="mt-1 mb-3.5 text-[15px] text-ink-2">The next workout becomes {firstDay?.name ?? 'Push A'}. Logged workouts are kept.</p>
        <button
          type="button"
          onClick={async () => {
            if (firstDay) await resetCycle(firstDay.id)
            setResetting(false)
          }}
          className="mb-2.5 h-[60px] w-full rounded-2xl bg-act text-lg font-semibold text-on-act"
        >
          Reset
        </button>
        <button type="button" onClick={() => setResetting(false)} className="h-[52px] w-full rounded-2xl border border-rule font-semibold text-ink-2">
          Cancel
        </button>
      </BottomSheet>
    </main>
  )
}
```

- [ ] **Step 2: Run tests, lint, and look**

Run: `npm test && npm run lint`
Expected: all pass.

In the dev server open `#settings`: rows show figures and the unit stacked over the increment and rest, the cycle sheet opens and changes the home screen's next day, reset asks first. Check light mode.

- [ ] **Step 3: Commit**

```bash
git add src/screens/Settings.jsx
git commit -m "Rebuild the settings screen"
```

---

### Task 12: Exercise settings with history

**Files:**
- Modify: `src/screens/ExerciseSettings.jsx` (rewrite)
- Delete: `src/components/SecondsField.jsx`

**Interfaces:**
- Consumes: `NumberField`, `Illustration`; `getExercise`, `updateExercise` from `src/db/settings.js`; `getExerciseHistory` from `src/db/workouts.js`; `getProgramDays` from `src/db/queries.js`; `exercisePlacements`, `placementCaption` from `src/lib/placement.js`; `formatSession` from `src/lib/history.js`; `formatShortDate` from `src/lib/format.js`.

- [ ] **Step 1: Rewrite `src/screens/ExerciseSettings.jsx`**

```jsx
import { useLiveQuery } from 'dexie-react-hooks'
import Illustration from '../components/Illustration.jsx'
import NumberField from '../components/NumberField.jsx'
import { getProgramDays } from '../db/queries.js'
import { getExercise, updateExercise } from '../db/settings.js'
import { getExerciseHistory } from '../db/workouts.js'
import { formatShortDate } from '../lib/format.js'
import { formatSession } from '../lib/history.js'
import { exercisePlacements, placementCaption } from '../lib/placement.js'

function Group({ children }) {
  return <h2 className="mt-6 mb-1.5 text-xs font-semibold uppercase tracking-wider text-ink-3">{children}</h2>
}

// Per-exercise overrides (prd.md, "Settings"): display unit, increments, and
// rest, plus the last five sessions so history can be sanity-checked here.
export default function ExerciseSettings({ exerciseId }) {
  const exercise = useLiveQuery(() => getExercise(exerciseId), [exerciseId])
  const days = useLiveQuery(getProgramDays, [], [])
  const history = useLiveQuery(() => getExerciseHistory(exerciseId, 5), [exerciseId], [])
  if (exercise === undefined) return null
  if (!exercise) return <p className="p-5 text-ink-2">Unknown exercise.</p>

  const save = (patch) => updateExercise(exercise.id, patch)
  const num = (v) => (v === '' ? 0 : Number(v))
  const placements = exercisePlacements(exercise.id, days)
  const slot = days.flatMap((d) => d.slots).find((s) => s.exerciseIds.includes(exercise.id))
  const targets = slot ? `${slot.targetSets} sets · ${slot.repMin === slot.repMax ? slot.repMin : `${slot.repMin}–${slot.repMax}`} reps` : ''
  const compound = exercise.category === 'compound'

  return (
    <main className="min-h-dvh px-5 pt-3.5 pb-8">
      <header className="flex h-11 items-center">
        <a href="#settings" className="font-semibold text-act">
          ‹ Settings
        </a>
      </header>

      <section className="mt-1 flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold uppercase tracking-wider text-act">{placementCaption(placements)}</p>
          <h1 className="mt-1 font-num text-[40px] font-bold uppercase leading-[0.95]">{exercise.name}</h1>
          <p className="mt-1.5 text-[15px] text-ink-2">{targets}</p>
        </div>
        <Illustration slug={exercise.illustration} size={96} tone="ink-2" />
      </section>

      <Group>Units</Group>
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-rule py-2">
        <span>
          <span className="block text-base">Display unit</span>
          <span className="block text-[13px] text-ink-2">equipment is marked in</span>
        </span>
        <div role="group" aria-label="Display unit" className="flex h-11 overflow-hidden rounded-lg border border-rule bg-raised">
          {['kg', 'lb'].map((unit) => (
            <button
              key={unit}
              type="button"
              aria-pressed={exercise.displayUnit === unit}
              onClick={() => save({ displayUnit: unit })}
              className={`w-14 text-[15px] font-semibold ${exercise.displayUnit === unit ? 'bg-act text-on-act' : 'text-ink-2'}`}
            >
              {unit}
            </button>
          ))}
        </div>
      </div>
      <NumberField label="Step on kg equipment" value={String(exercise.incrementKg)} suffix="kg" inputMode="decimal" onChange={(v) => save({ incrementKg: num(v) })} />
      <NumberField label="Step on lb equipment" value={String(exercise.incrementLb)} suffix="lb" inputMode="decimal" onChange={(v) => save({ incrementLb: num(v) })} />

      <Group>Rest</Group>
      <NumberField
        label="Rest after a set"
        caption={`default for ${compound ? 'compound lifts is 90 s' : 'isolation and core is 60 s'}`}
        value={String(exercise.restSeconds)}
        suffix="s"
        onChange={(v) => save({ restSeconds: num(v) })}
      />

      <Group>History</Group>
      {history.length === 0 ? (
        <p className="min-h-14 py-2 text-[15px] text-ink-2">No sessions yet</p>
      ) : (
        <ul>
          {history.map((session) => (
            <li key={session.workoutId} className="flex min-h-14 items-center justify-between gap-3 border-b border-rule py-2 last:border-0">
              <span className="text-[13px] text-ink-2">{formatShortDate(session.finishedAt)}</span>
              <span className="text-right font-num text-[17px] font-semibold">{formatSession(session.sets)}</span>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
```

Delete the old field:

```bash
git rm -q src/components/SecondsField.jsx
```

- [ ] **Step 2: Run tests, lint, and look**

Run: `npm test && npm run lint && grep -rn "SecondsField\|ExerciseCard\|SetRow\|RestTimer" src || echo clean`
Expected: all pass, final line `clean`.

In the dev server open `#settings/barbell-bench-press`: caption reads "Push A · exercise 1", figure shows, segmented control flips, history lists finished sessions or "No sessions yet". Open `#settings/machine-chest-press` and confirm "Push A and Push B · exercise 2".

- [ ] **Step 3: Commit**

```bash
git add src/screens/ExerciseSettings.jsx
git commit -m "Rebuild exercise settings with a history list"
```

---

### Task 13: Visual verification, detector, and docs

**Files:**
- Modify: `PRODUCT.md` (visual direction paragraph), `lifttracker/prd.md` (decisions log entry)
- Create: `DESIGN.md` at repository root (Impeccable's visual system record)

- [ ] **Step 1: Full-app check at phone width**

Run `npm run dev`. At 375×812 in dark, then light: Home (empty history and with one finished workout), pick-a-day sheet, Workout fresh, Workout after three logged sets while resting, Workout with an alternative slot (start Pull A), Finish sheet, Settings, Exercise settings for `machine-chest-press`. Confirm no horizontal scroll (`document.documentElement.scrollWidth === 375`), every button at least 44 px tall, countdown and figure animate, reduced motion (`prefers-reduced-motion: reduce` in devtools) stops the animation. Fix in one batch, re-run `npm test && npm run lint`.

- [ ] **Step 2: Run the Impeccable detector once**

From the repository root:

```bash
.claude/skills/impeccable/scripts/impeccable detect --json lifttracker/src lifttracker/index.html
```

Fix every reported finding that is not a deliberate spec decision (the dark-first palette is deliberate). Re-run tests and lint.

- [ ] **Step 3: Production build**

```bash
npm run build && ls dist/fonts dist/illustrations | head && du -sh dist
```

Expected: five woff2 files, 20 illustration folders, `dist` under 6 MB. `dist/sw.js` precache includes `.woff2` and `.svg` entries (the existing glob covers them).

- [ ] **Step 4: Record the decision**

In `PRODUCT.md`, replace the paragraph beginning "Visual direction, accepted by Franklin on October 11, 2026" with:

```markdown
Visual direction, accepted by Franklin on October 12, 2026 ("Night shift"):
deep navy base with one amber action colour and coral for out-of-range reps,
a light theme that follows the device setting, Oswald for display text and
numerals and Source Sans 3 for text, both self-hosted. Exercise illustrations
are line-art figures from Workout Guide (CC BY-SA 4.0) shown as an animated
motion ghost on the workout hero and the rest dock. The rest timer is docked
to the bottom of the workout screen. Full spec:
`docs/superpowers/specs/2026-10-12-lifttracker-visual-redesign-design.md`.
```

Create `DESIGN.md` at the repository root with the token table and type scale copied from spec sections 2 ("Palette", "Type") and the illustration rules, headed `# LiftTracker visual system` and noting `<!-- impeccable:design-schema 1 -->` on the second line.

In `lifttracker/prd.md`, under the decisions log, add a dated entry: "October 12, 2026: Night shift redesign accepted; see the spec. Phase 1 behaviour unchanged. Exercise settings gained a read-only five-session history list."

- [ ] **Step 5: Final commit**

```bash
git add PRODUCT.md DESIGN.md lifttracker/prd.md
git commit -m "Record the Night shift visual system"
git log --oneline main..HEAD
```

Expected: 14 commits on `redesign/night-shift`.
