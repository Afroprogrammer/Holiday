# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React with Vite, Tailwind CSS, IndexedDB through Dexie, Vite PWA plugin.
Decided in `lifttracker/prd.md` on October 11, 2026. Static hosting, no
backend in Phase 1.

## Users

One user: Franklin, training alone in a commercial gym four days a week on a
fixed push/pull program. Knee issues keep leg training light. He opens the app
between sets, phone in one hand, often propped on a bench or rack, under gym
lighting that ranges from bright to dim. Fingers may be chalky or sweaty. Gym
signal is unreliable.

The job: see what he lifted last time for this exact set, log what he does
now, and decide for himself whether to add weight.

## Product Purpose

LiftTracker is a personal workout logger built around one fixed 4-day program.
It exists because general-purpose loggers make him build the program, pick
exercises, and fight suggestions every session. Success is a logged set in two
taps when last session's numbers are right, and a full session completed with
no network.

## Positioning

The program is the product. Sets and rep ranges are fixed by the template, the
app never suggests a weight, and every exercise remembers its own unit (kg or
lb) because the gym's equipment is mixed. A generic tracker cannot truthfully
claim any of these three.

## Operating Context

- Four days cycle in order: Push A, Pull A, Push B, Pull B, advanced by the
  last completed day, not the calendar.
- 20 exercises. Barbells and most machines are marked in kg. Dumbbells are
  marked in lb. The assisted pull-up stack shows both. Some machines may be
  marked in lb and are flipped once in the app.
- Rest between sets is timed by the app and is user-adjustable per exercise,
  during a set, and globally.
- The app is installed to the phone's home screen and used offline.
- Repository: `Afroprogrammer/Holiday`, which also contains an unrelated
  WanderAI project. LiftTracker lives under `lifttracker/`.

## Capabilities and Constraints

Phase 1, as specified in `lifttracker/prd.md`:

- Home screen with next day and start action.
- Active workout screen: one card per exercise, set rows prefilled from the
  last session, weight and reps with steppers, Done per set, optional knee
  pain flag per set.
- Automatic rest timer that survives screen lock and shows overtime.
- Per-exercise display unit with the other unit shown beside it. Weight is
  stored exactly as entered, with its unit.
- Local storage only. No accounts, no sync, no charts in Phase 1.

Constraints: works at 400 px width, one-handed, offline. No automatic
progression. No AI features. Reps may be logged above or below the target
range.

Undecided: visual direction. Three wireframe directions are being prepared for
Franklin to choose from. Nothing visual is committed.

## Brand Commitments

Name: LiftTracker (confirmed October 11, 2026). No logo, palette, or
typeface exists yet. Voice: plain, direct, no hype, no coaching tone.

## Evidence on Hand

- The full program with sets, rep ranges, and default rest times:
  `lifttracker/prd.md`.
- No screenshots, user research, or testimonials exist. Future work must not
  invent them.

## Product Principles

1. The program is fixed. The app shows it and records against it.
2. Last time is always visible. Every decision about weight is the user's.
3. Two taps for a correct set. Every extra tap must earn its place.
4. Exact storage. Numbers are kept in the unit they were entered in.
5. Offline is the normal state, not a fallback.

## Accessibility & Inclusion

Touch targets at or above 48 px, with the primary per-set action larger. Large
numerals readable at arm's length. Dark-first palette for dim gym corners, with
a light theme for bright rooms. All timer feedback has a visual form, not only
vibration or sound. Respects reduced-motion preferences.
