// Hash navigation for the workout route (gym round 2, 3.2). Entering the
// workout pushes a history entry so one back gesture returns Home. Leaving
// pops that entry when this session pushed it, and otherwise replaces the
// hash (a cold open straight onto #workout has nothing to go back to).

let pushed = false

export const WORKOUT_HASH = '#workout'

export function enterWorkout() {
  pushed = true
  window.location.hash = WORKOUT_HASH
}

export function leaveWorkout() {
  if (pushed) {
    pushed = false
    window.history.back()
    return
  }
  replaceHash('')
}

// replaceState does not fire hashchange, so useHash is told by hand.
export function replaceHash(hash) {
  const { pathname, search } = window.location
  window.history.replaceState(null, '', pathname + search + hash)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}

export function resetNav() {
  pushed = false
}
