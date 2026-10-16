# LiftTracker design brief

**Status:** Planning. Three wireframe directions are on the design canvas for
Franklin to choose from. Nothing visual is committed.
**Canvas:** https://claude.ai/artifact/Ekg2Bc9oMdtZtL6p3bFbeq (private until
shared)
**Last updated:** October 16, 2026

This brief sits beside `prd.md`, which owns scope and behavior. This document
owns how the Phase 1 screens look, feel, and move. It records the research the
directions are based on, the principles every direction follows, the three
directions themselves, and the motion spec.

## Research summary

Seven loggers were checked against their own help pages, App Store reviews,
and third-party reviews on October 16, 2026: Strong, Hevy, Fitbod, Boostcamp,
Alpha Progression, Liftosaur, and JEFIT. Reddit was unreachable from the
research environment, so user complaints come from App Store reviews quoted
on review sites.

### What the category agrees on

- **Previous values are prefilled, and Done is one tap** on the right of the
  row. Strong and Hevy are rated fastest because of this.
- **The rest timer auto-starts on Done.** Every app does this. The roundup at
  saylift.app calls it the single most important timer property.
- **Minus 15, plus 15, and Skip** are the standard timer controls. Hevy,
  Liftosaur, JEFIT, and Alpha Progression all converge on them.
- **Steppers that move by the real increment.** Liftosaur steps weight by the
  smallest loadable plate for that equipment and reps by one. Alpha
  Progression offers a picker of likely values instead of a bare keypad.
- **Large tabular numerals** for weight, reps, and timer digits so they don't
  jitter as they change.

### What users complain about

- A timer modal that covers the set table or the field being edited. JEFIT's
  timer "takes up 50% of my screen". Fitbod's overlay sits over the keyboard.
- Hiding the next exercise while the timer runs (Fitbod).
- Timers that forget the last-used duration or lose quick presets. Boostcamp
  lost a star in reviews over this.
- Confetti or scaling animation on every set. Apple's motion guidance says
  not to animate frequent interactions, and a set check happens dozens of
  times per session.
- Saturated accents on near-black that visually vibrate.

### Guidance that binds the directions

| Source | Rule applied |
|---|---|
| Apple Human Interface Guidelines, accessibility | 44 × 44 pt minimum touch target, 12 pt gutters around bezelled controls |
| Material Design, touch targets | 48 × 48 dp for the primary per-set action |
| Material dark theme | Surface near `#121212`, never pure black. Lighter surface means higher elevation. Desaturate the accent. |
| WCAG 2.1 | 4.5:1 contrast for body text, 3:1 for text at 24 px and above |
| Apple HIG, motion and haptics | Set done is a colour change plus a light haptic. Celebration is reserved for a personal record and gated on reduced motion. |
| Liftosaur rest timer | Store an end timestamp, not a counter. Keep counting past target and change colour. |
| Hoober one-handed grip data | Primary actions live in the lower half of the screen. |

Key sources: liftosaur.com/features/workout-screen,
liftosaur.com/features/rest-timer, hevyapp.com/features/track-exercises,
help.strongapp.io, saylift.app/best/workout-app-with-rest-timer,
screensdesign.com/articles/workout-tracker-app-design-examples,
developer.apple.com/design/human-interface-guidelines (accessibility, motion,
playing haptics), m2.material.io/design/color/dark-theme.

## Design principles

These hold in every direction. They come from the product record and the
research, not from taste.

1. **Last time is always beside now.** Every set shows the previous weight and
   reps at the point where the decision is made. Never a tap away.
2. **Prefilled is visibly not logged.** A prefilled value sits in a lighter
   tone, outlined, or dashed. It becomes solid only when Done is tapped. You
   can never mistake a suggestion for a record.
3. **Done lives in the thumb zone.** The per-set action is at least 48 px,
   sits right or bottom, and has 12 px of clear space from the steppers.
4. **The timer never covers the work.** It attaches to the exercise context as
   a pill, a bar, or a header, and the next set stays visible while it runs.
5. **Numbers are the typography.** Weight, reps, and timer digits use a
   display face at sizes readable at arm's length, with tabular numerals.
6. **Units are shown, never implied.** Every weight carries its unit. A
   pound value shows its kilogram conversion small beside it.
7. **Standard controls, one signature move.** Buttons, inputs, and lists
   behave as the platform expects. Each direction gets one recognisable idea
   and nothing else that competes with it.
8. **Light or dark follows the room.** Two of the three directions are
   dark-first for dim gym corners. One is light-first for bright rooms. The
   final app ships both as a token swap.

## The three directions

All three share the same screens and the same data: Push A, bench press on
set 3 of 4 after two logged sets, machine chest press and dumbbell shoulder
press below. They differ in organisation, as Impeccable's operate-mode
guidance asks: how the screen divides, which data leads, the density, and
where the signature move sits. The world lends only type, palette, density,
and that one move.

### A · Ledger

- **Organisation.** All five exercises on one scrolling page. Each exercise is
  a compact table: Set, Last, Weight, Reps, Done. Completed exercises collapse
  to a single row with their last values. This is the Strong and Hevy model,
  so there is nothing to learn.
- **Signature move.** Chalk to ink. Prefilled values sit in a lighter chalk
  tone and turn solid when Done is tapped. The row you're on is raised a shade
  and underlined in the accent.
- **Timer.** A pill at the bottom. It fills left to right as rest runs, shows
  elapsed large and target small, turns red and counts up past target. Tap to
  reveal minus 15, plus 15, and Skip above it. The table stays visible.
- **Palette.** Slate ground, chalk text, brass accent for Done and the active
  underline, a distinct red for overtime.
- **Type.** IBM Plex Sans for labels, IBM Plex Mono for every number.
- **Best when.** You want density and to see the whole session at once.

### B · Focus

- **Organisation.** One exercise per screen, swipe between them. A five
  segment strip at the top shows where you are. Completed sets collapse to one
  line each. The next set is expanded with a very large weight numeral, and
  Done is a full-width bar at the bottom. This is the Liftosaur model.
- **Signature move.** The numeral is the control. Minus and plus flank the
  weight, and a small accent tick under it reads "last 60 × 6". There is no
  table to scan, only the number you're about to lift.
- **Timer.** The bottom third of the screen becomes the timer when rest runs.
  A thin progress line crosses its top edge, the elapsed time fills the block,
  and minus 15, plus 15, and Skip sit along the bottom. The next set stays
  visible above it.
- **Palette.** Warm near-black ground, warm off-white text, desaturated mint
  accent, red for overtime.
- **Type.** Barlow Condensed for numerals and headings, Barlow for the rest.
- **Best when.** You want the fewest things on screen and the biggest numbers.

### C · Rack

- **Organisation.** Light theme. Exercises are a vertical list of cards. Each
  set is a chip in a row: logged chips are solid, the active set opens into a
  pair of stepper fields and a Done button, pending chips are dashed outlines
  showing last time's values. Collapsed exercises show their three pending
  chips.
- **Signature move.** The plate strip. Under every barbell exercise a row of
  plate glyphs shows what to load per side for the current weight, for
  example 20 and 1.25 kg on a 20 kg bar. Machines show their stack unit
  instead. This is the one piece of arithmetic the gym makes you do every set.
- **Timer.** A six pixel bar directly under the sticky header drains as rest
  runs. The elapsed time and target sit in the header's right side with the
  three controls under them. Tapping the header is the only expansion.
- **Palette.** Cool light grey ground, white cards with a soft offset shadow,
  cobalt accent for logged chips and the plate strip, near-black Done button,
  red for overtime.
- **Type.** Bricolage Grotesque for headings and numerals, Public Sans body.
- **Best when.** Your gym is bright, or you want a lighter and more playful
  look. The dark variant is a palette swap, not a redesign.

### How to choose

Open the canvas on your phone and look at the three Workout artboards at
thumbnail size first. The one you can read fastest wins the first round. Then
open each Rest timer artboard and imagine it propped on a bench. You can also
mix: a direction's organisation with another's palette is a legitimate
answer, since the world and the layout are separate decisions.

## Motion spec for Phase 1

Three authored moments, each with a job. Everything else is a plain state
change. All durations are from Impeccable's animate guidance and Apple's
motion guidance.

| Moment | Trigger | What moves | Duration and easing | Reduced motion |
|---|---|---|---|---|
| Set logged | Tap Done | The row's value tone goes from prefilled to solid and the Done control fills with the accent. In B the numeral settles into its collapsed line. Light haptic. | 150 to 220 ms, `cubic-bezier(0.16, 1, 0.3, 1)` | Colour change only, no translation |
| Rest running | Timer starts | The progress fill advances continuously. Digits change without jitter thanks to tabular numerals. | Linear, bound to the end timestamp | Unchanged, it carries meaning |
| Rest over | Timer reaches zero | Fill and digits switch to the overtime red in one step. Device vibrates. In A the pill border pulses twice. | 120 ms switch, two 400 ms pulses | Colour switch only, no pulse |

Deferred to Phase 2 or later: personal record celebration, exercise
illustrations or form animations, any per-exercise motion, and the summary
screen recap.

## Decisions log

| Date | Decision |
|---|---|
| October 16, 2026 | Three directions prepared rather than one, so the choice is visual, not described. |
| October 16, 2026 | The timer is never a modal in any direction. |
| October 16, 2026 | Phase 1 motion is limited to three moments. |

## Open items

- Franklin picks a direction, or a combination, from the canvas.
- Once picked, `DESIGN.md` is written for that direction with tokens, type
  scale, spacing scale, and component states, and the Phase 1 build follows
  it.
