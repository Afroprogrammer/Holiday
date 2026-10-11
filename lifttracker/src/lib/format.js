// "Thursday, October 9", as shown on the wireframe's home screen.
export function formatWorkoutDate(isoString) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(isoString))
}
