// Android Clock timer through an intent URL (rest next-up spec, 3.3).
// Chrome opens it only from a tap, and only when the Clock app accepts
// intents from the browser; the Settings test row tells which phones do.
export function phoneTimerUrl(seconds, message) {
  return [
    'intent:#Intent',
    'action=android.intent.action.SET_TIMER',
    `i.android.intent.extra.alarm.LENGTH=${Math.max(1, Math.round(seconds))}`,
    `S.android.intent.extra.alarm.MESSAGE=${encodeURIComponent(message)}`,
    'B.android.intent.extra.alarm.SKIP_UI=true',
    'end',
  ].join(';')
}
