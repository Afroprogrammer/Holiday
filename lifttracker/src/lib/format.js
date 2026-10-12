// "Thursday, October 9", as shown on the wireframe's home screen.
export function formatWorkoutDate(isoString) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(isoString))
}

// "09:52", the workout's start time in the workout screen header.
export function formatClockTime(isoString) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(new Date(isoString))
}

// "Thu 9 Oct", for the home screen's last-completed line and history rows.
export function formatShortDate(isoString) {
  const d = new Date(isoString)
  const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'short' }).format(d)
  const month = new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(d)
  return `${weekday} ${d.getDate()} ${month}`
}
