// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Routing table from gym round 2, 3.2. Queries and screens are stubbed; the
// test checks which screen App picks and what it pushes.
const live = { active: null, rest: null, keepScreenOn: true, restNotification: true }
vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: (fn) => {
    const name = fn.name || ''
    if (name === 'getActiveView') return live.active
    if (name === 'getActiveRest') return live.rest
    return fn.toString().includes('keepScreenOn') ? live.keepScreenOn : live.restNotification
  },
}))
vi.mock('../lib/update.js', () => ({ useAppUpdate: () => ({ ready: false, apply: () => {} }) }))
vi.mock('../lib/wakeLock.js', () => ({ useWakeLock: vi.fn() }))
vi.mock('../lib/useRestWatcher.js', () => ({ useRestWatcher: vi.fn(() => false) }))
vi.mock('../screens/Home.jsx', () => ({ default: () => <div>home</div> }))
vi.mock('../screens/Workout.jsx', () => ({ default: () => <div>workout</div> }))
vi.mock('../screens/Settings.jsx', () => ({ default: () => <div>settings</div> }))
vi.mock('../screens/ExerciseSettings.jsx', () => ({ default: () => <div>exercise-settings</div> }))

import App from '../App.jsx'
import { resetNav } from '../lib/nav.js'
import { useWakeLock } from '../lib/wakeLock.js'
import { useRestWatcher } from '../lib/useRestWatcher.js'

const ACTIVE = {
  workout: { id: 'w1', programDayId: 'push-a', startedAt: new Date().toISOString(), finishedAt: null, skipped: {}, extra: {}, chosen: {} },
  day: { id: 'push-a', name: 'Push A', slots: [{ exerciseIds: ['dips'], targetSets: 3, repMin: 8, repMax: 12 }] },
  loggedSets: [],
  exercisesById: new Map([['dips', { id: 'dips', name: 'Dips', illustration: 'dips' }]]),
}

describe('App router', () => {
  beforeEach(() => {
    resetNav()
    window.location.hash = ''
    live.active = null
    live.rest = null
    useWakeLock.mockClear()
    useRestWatcher.mockClear()
  })
  afterEach(cleanup)

  it.each([
    ['', null, 'home'],
    ['#settings', null, 'settings'],
    ['#settings/deadlift', null, 'exercise-settings'],
    ['#workout', 'active', 'workout'],
    ['#settings', 'active', 'settings'],
  ])('hash %s with active %s renders %s', (hash, active, expected) => {
    window.location.hash = hash
    live.active = active ? ACTIVE : null
    render(<App />)
    expect(screen.getByText(expected)).toBeTruthy()
    expect(window.location.hash).toBe(hash)
  })

  it('replaces #workout with empty when no workout is active', async () => {
    window.location.hash = '#workout'
    render(<App />)
    expect(screen.getByText('home')).toBeTruthy()
    await act(async () => {})
    expect(window.location.hash).toBe('')
  })

  it('cold open with a running workout lands on Home and pushes nothing', async () => {
    live.active = ACTIVE
    const before = history.length
    render(<App />)
    await act(async () => {})
    expect(screen.getByText('home')).toBeTruthy()
    expect(window.location.hash).toBe('')
    expect(history.length).toBe(before)
  })

  it('holds the wake lock only while a workout is active', () => {
    render(<App />)
    expect(useWakeLock).toHaveBeenLastCalledWith(false)
    cleanup()
    live.active = ACTIVE
    window.location.hash = '#workout'
    render(<App />)
    expect(useWakeLock).toHaveBeenLastCalledWith(true)
    cleanup()
    live.keepScreenOn = false
    render(<App />)
    expect(useWakeLock).toHaveBeenLastCalledWith(false)
    live.keepScreenOn = true
  })

  it('mounts the rest watcher with the rest only while a workout is active', () => {
    live.rest = { endsAt: Date.now() + 1000 }
    render(<App />)
    expect(useRestWatcher.mock.lastCall[0]).toBeNull()
    cleanup()
    live.active = ACTIVE
    window.location.hash = '#settings'
    render(<App />)
    expect(useRestWatcher.mock.lastCall[0]).toBe(live.rest)
    expect(useRestWatcher.mock.lastCall[1].nextSet).toEqual({ exerciseName: 'Dips', setNumber: 1, total: 3 })
  })
})
