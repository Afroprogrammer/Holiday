# LiftTracker: see what comes next during a rest

**Date:** October 22, 2026
**Status:** design A chosen by Franklin on October 22, 2026 from the "Rest Transition" mockups

## 1. Intent

During a rest the workout screen showed only the set just logged. Franklin
could not see what came next, so he could not walk to the next machine or
load the next weight while resting. This round shows the next set or
exercise during every rest, and adds a test for starting a timer in the
phone's own Clock app, so the rest-end sound can work when the app is closed.

## 2. Goals, non-goals, anti-goals

Goals

- During a running rest, the screen shows what you just did and what comes
  next, without scrolling, above the rest dock.
- When the next set belongs to another exercise, the next-up card shows that
  exercise in full: name, figure, sets, rep range, rest, last time, the
  weight to load.
- When the next set belongs to the same exercise, the card names the set
  and also says which exercise follows this one.
- One tap starts the next set at once (ends the rest).
- A Settings row tries the phone's Clock timer, to learn whether the phone
  allows it.

Non-goals

- Starting the Clock timer on every Done. That waits for Franklin's test.
- Logging a set of the next exercise while the rest runs.
- Any change to the rest dock.

Anti-goals

- A Done button anywhere while a rest runs (gym round 1 rule stays).
- The hero jumping to the next exercise while the user is still at the
  machine he just used.

## 3. Behaviour

### 3.1 Hero and set rows during a rest

While the done card would show today (a rest is running and its set is
known), the hero and the set rows show the exercise of that set, not the
next open exercise. When the rest ends or is skipped, the existing handoff
runs (the rest block slides out, the next set slides in) and the hero then
shows the next exercise.

### 3.2 The rest block

The done card is replaced by a rest block of two parts.

1. **Logged line**, one row, 48 px: `S4` in amber, `60 kg × 8`, the
   out-of-range flag when there is one, the word `logged`, and an `Edit`
   button. Edit opens the set editor as the done card's Edit did.
2. **Next-up card**, amber border, raised background:
   - Top line: `Next · after this rest` on the left, `Exercise 2 of 5` on
     the right.
   - **Next set is another exercise:** short name (Oswald, 30 px,
     uppercase), `3 sets · 8–10 reps · rest 90 s`, the exercise figure
     (live motion ghost, amber), then two cells: `Last time` with that
     exercise's previous session (`50 kg × 10, 10, 9`, or `–`) and
     `Set up` with the prefill weight of its open set in the display unit
     (`50 kg`, or `–`). No seat or machine settings.
   - **Next set is the same exercise:** `Set 3 of 4` as the title, `last
     60 kg × 8` (the row's last-time text) and `Set up 60 kg`, then one line
     `Then: Machine chest press · 3 × 8–10` naming the next exercise with
     sets remaining, or `Then: last exercise` when none.
   - **Nothing left:** the card reads `All sets logged` and `Finish when
     you are ready.`
   - Button, 44 px, amber outline: `Start <short name> now` for another
     exercise, `Start set 3 now` for the same exercise. It ends the rest
     (same as Skip). Absent when nothing is left.

### 3.3 Phone timer test

Settings › Workout gains a row `Try phone timer`, caption `Asks the Clock
app for a 10 s timer. If nothing happens, your phone does not allow it.`
The row is a link to an Android intent URL:

`intent:#Intent;action=android.intent.action.SET_TIMER;i.android.intent.extra.alarm.LENGTH=10;S.android.intent.extra.alarm.MESSAGE=LiftTracker%20test;B.android.intent.extra.alarm.SKIP_UI=true;end`

Chrome opens an intent only from a tap and only if the target app accepts
browser intents; Franklin's test tells us which. Nothing else uses it yet.

## 4. Tests

- `restPreview` (pure, in `workoutProgress.js`): next is another exercise,
  same exercise with a following exercise, same exercise and last, nothing
  left; set-up weight converted to the display unit.
- `NextUpCard` component: each variant's copy, the start button label and
  callback, the figure.
- `RestBlock` / logged line: Edit and the flag.
- Workout wiring: hero and rows follow the rest set during a rest.
- `phoneTimerUrl(seconds, message)` builds the URL above; Settings has the
  row.
