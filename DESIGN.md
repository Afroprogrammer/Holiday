# LiftTracker visual system
<!-- impeccable:design-schema 1 -->

"Night shift", accepted October 12, 2026. Operate mode: scanability and thumb
reach first, identity in type, one accent, and the exercise figures. Source of
truth for tokens is `lifttracker/src/index.css` (Tailwind `@theme`). The full
screen-by-screen spec is
`docs/superpowers/specs/2026-10-12-lifttracker-visual-redesign-design.md`.

## Colour

Dark-first. Light theme follows the device setting with the same roles.

| Token | Dark | Light | Role |
|---|---|---|---|
| canvas | `#0a1020` | `#f2f4fa` | page ground |
| card | `#101a30` | `#ffffff` | docked timer, stepper fields, sheets |
| raised | `#15213a` | `#e6eaf4` | segmented control track, number fields |
| rule | `#1f2b48` | `#d3d9e8` | hairlines, ghost button borders |
| ink | `#eaf0ff` | `#121a2c` | primary text |
| ink-2 | `#9aa8c8` | `#4f5c7a` | secondary text, hero and strip figures |
| ink-3 | `#5a6a90` | `#8591ad` | tertiary text, idle figures, chevrons |
| act | `#ffb000` | `#a86a00` | primary action, current set, cycle position, unit |
| on-act | `#231800` | `#ffffff` | text on act |
| flag | `#ff6f61` | `#c23b2e` | reps outside the target range, reset action, overtime |

Components use tokens only (`bg-canvas`, `text-ink-2`, `text-act`, ...). No
literal colours in JSX. Semantic colour (flag) is separate from the accent.

## Type

Oswald (variable, 200 to 700) for display and numerals; Source Sans 3
(variable, 200 to 900) for text. Both self-hosted from `public/fonts/` with
`font-display: swap`. Numerals everywhere use `tabular-nums` (set on `body`).

| Role | Face | Size / weight |
|---|---|---|
| day name | Oswald | 92 / 700 uppercase |
| exercise title, screen title | Oswald | 40 / 700 uppercase |
| active weight | Oswald | 56 / 700 |
| active reps | Oswald | 44 / 700 |
| countdown, resting | Oswald | 72 / 700 |
| countdown, idle | Oswald | 44 / 700 |
| set label | Oswald | 22 / 700 uppercase |
| sheet title | Oswald | 28 / 700 uppercase |
| list numerals | Oswald | 17 to 24 / 600 |
| body | Source Sans 3 | 15 to 16 / 400 |
| caption | Source Sans 3 | 13 / 500 |
| group label | Source Sans 3 | 12 / 600, 0.08em tracking, uppercase |

## Illustrations

Line-art exercise figures from Workout Guide (CC BY-SA 4.0), three frames per
exercise under `public/illustrations/<slug>/{1,2,3}.svg`. Rendered by
`src/components/Illustration.jsx` as a CSS mask over `currentColor`, so they
take any token colour.

Motion ghost: three stacked layers. Static: frame 2 on top at full opacity,
frame 3 behind at 45 %, frame 1 at 18 %. Live (`live` prop): 1 → 2 → 3 → 2 → 1
over 2.6 s with `cubic-bezier(.65,0,.35,1)`, previous poses trailing at 14 %
and 8 %, an amber radial glow pulsing behind. `glow` adds an amber drop shadow
to the current pose. `prefers-reduced-motion: reduce` disables the keyframes.

Animated: workout hero (while a set is open) and the rest dock while resting.
Static everywhere else.

## Layout rules

- Phone first at 375 px. No horizontal scroll. Side gutter 20 px.
- Every tap target at least 44 px tall. Primary buttons 60 px, secondary 52 px,
  Done 64 px, steppers 92 px (weight) and 76 px (reps).
- Hairline rows, not cards. Cards only for the rest dock, stepper fields, and
  bottom sheets.
- Bottom sheets replace modals and `window.confirm`. The safe choice is the
  primary button ("Keep going", "Cancel" ordering varies by stakes).
- The rest dock is fixed to the bottom; the workout page pads by the dock's
  height (`DOCK_HEIGHT` in `RestDock.jsx`).
- Icons are typeset glyphs in Oswald (−, +, ›, ‹) or authored inline SVG. No
  emoji, no icon fonts.
