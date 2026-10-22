import { describe, expect, it } from 'vitest'
import { phoneTimerUrl } from '../lib/phoneTimer.js'

describe('phoneTimerUrl', () => {
  it('builds the Clock SET_TIMER intent URL', () => {
    expect(phoneTimerUrl(10, 'LiftTracker test')).toBe(
      'intent:#Intent;action=android.intent.action.SET_TIMER;i.android.intent.extra.alarm.LENGTH=10;S.android.intent.extra.alarm.MESSAGE=LiftTracker%20test;B.android.intent.extra.alarm.SKIP_UI=true;end',
    )
  })
})
