# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React with Vite, Tailwind CSS, IndexedDB through Dexie, Vite PWA plugin,
Vitest for unit tests, static hosting. Decided in `lifttracker/prd.md` on
October 11, 2026. No backend in Phase 1.

## Users

One user: Franklin, the owner, training on a fixed 4-day push/pull program.
He opens the app in the gym between sets and logs each set with his thumb.
Gym signal is unreliable, so the app must work with no connection.

The job: see what he lifted last time for this exact set, log what he does
now, and decide for himself whether to add weight.

## Product Purpose

LiftTracker is a personal workout logger built around one fixed 4-day program.
Success is a logged set in two taps when last session's numbers are right, and
a full session completed with no network.

## Positioning

The program is the product. Sets and rep ranges are fixed by the template, the
app never suggests a weight, and every exercise remembers its own unit (kg or
lb) because the gym's equipment is mixed. A generic tracker cannot truthfully
claim any of these three.

## Operating Context

- Four days cycle in order: Push A, Pull A, Push B, Pull B, advanced by the
  last completed day, not the calendar.
- 20 slots across the four days, 23 seeded exercises. Slots with two
  alternatives (shrugs, curls, Pull A core) seed each alternative with its own
  history. Machine chest press appears on both push days.
- Barbells and most machines are marked in kg. Dumbbells are marked in lb. The
  assisted pull-up stack shows both. A machine marked in lb is flipped once in
  the app, and the app remembers.
- Rest between sets is timed by the app. The duration is adjustable per
  exercise, on the running timer during a workout, and globally.
- The app is added to the phone's home screen and used offline.
- Repository: `Afroprogrammer/Holiday`, which also contains an unrelated
  WanderAI project. LiftTracker lives under `lifttracker/`.

## Capabilities and Constraints

Phase 1, as specified in `lifttracker/prd.md`:

- Home screen with the next day, the last completed workout, a start action,
  an override to start a different day, and a settings link.
- Active workout screen: one card per exercise, a toggle for slots with
  alternatives, set rows prefilled from the last session, weight and reps with
  steppers, Done per set, add an extra set, skip a set, Finish with
  confirmation when sets remain.
- Automatic rest timer that survives screen lock and shows overtime.
- Per-exercise display unit with the other unit shown beside it. Weight is
  stored exactly as entered, with its unit.
- The active workout is saved as you go and resumes when you return.
- Settings: default rest durations, per-exercise overrides, reset cycle.
- Local storage only. No accounts, no sync, no charts in Phase 1.

Constraints: one-handed, offline, no automatic progression, no AI features.
Reps may be logged above or below the target range.

Visual direction, accepted by Franklin on October 11, 2026: dark base with one
cyan action color, a light theme that follows the device setting, Barlow for
text and Barlow Condensed for numerals. The rest timer sits at the bottom of
the workout screen. Touch target sizes and the type scale are not yet fixed.

## Brand Commitments

Name: LiftTracker (confirmed October 11, 2026). Palette and typefaces are
recorded in the decisions log of `lifttracker/prd.md`. No logo or voice has
been decided.

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

Timer feedback has a visual form as well as vibration or sound, because
vibration isn't available on iOS web apps. No other requirement has been
established.
