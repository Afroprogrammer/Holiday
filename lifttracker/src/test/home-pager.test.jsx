// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const day = (id, name, order) => ({ id, name, order, slots: [{ exerciseIds: ['dips'], targetSets: 3, repMin: 8, repMax: 12 }, { exerciseIds: ['deadlift'], targetSets: 3, repMin: 5, repMax: 5 }] })
const days = [day('push-a', 'Push A', 1), day('pull-a', 'Pull A', 2), day('push-b', 'Push B', 3), day('pull-b', 'Pull B', 4)]
const exercisesById = new Map([
  ['dips', { id: 'dips', name: 'Dips, bodyweight or assisted', illustration: 'dips' }],
  ['deadlift', { id: 'deadlift', name: 'Deadlift', illustration: 'deadlift' }],
])
const homeView = {
  nextDay: days[1],
  days: days.map((d) => ({ day: d, stripSlugs: ['dips', 'deadlift'], firstExercise: exercisesById.get('dips'), firstSession: null, lastWorkout: null })),
  exercisesById,
}
vi.mock('dexie-react-hooks', () => ({ useLiveQuery: () => homeView }))
vi.mock('../lib/install.js', () => ({ useInstallPrompt: () => ({ canInstall: false, installed: false, install: () => {} }) }))
vi.mock('../db/workouts.js', () => ({ discardWorkout: vi.fn().mockResolvedValue() }))
vi.mock('../lib/restNotification.js', () => ({ closeRestNotifications: vi.fn(), getRegistration: vi.fn().mockResolvedValue(null) }))

import Home from '../screens/Home.jsx'
import DayPage from '../components/DayPage.jsx'
import { discardWorkout } from '../db/workouts.js'

const started = new Date(Date.now() - 14 * 60_000).toISOString()
const logged = (n) => ({ id: `s${n}`, workoutId: 'w1', exerciseId: 'dips', setNumber: n, weight: 0, unit: 'kg', reps: 10 })
const activeWith = (sets) => ({
  workout: { id: 'w1', programDayId: 'push-a', startedAt: started, finishedAt: null, skipped: {}, extra: {}, chosen: {} },
  day: days[0],
  loggedSets: sets,
  exercisesById,
})
const rest = { exerciseId: 'dips', exerciseName: 'Dips', durationSeconds: 90, startedAt: Date.now() - 48_000, endsAt: Date.now() + 42_000 }

function pager() {
  return document.querySelector('[aria-roledescription="carousel"]')
}

describe('Home pager', () => {
  beforeEach(() => {
    Element.prototype.scrollTo = vi.fn()
    discardWorkout.mockClear()
  })
  afterEach(cleanup)

  it('renders one page per day and no "Start a different day"', () => {
    render(<Home active={null} rest={null} flash={false} onStart={() => {}} onResume={() => {}} />)
    const pages = pager().querySelectorAll('section[aria-label]')
    expect([...pages].map((p) => p.getAttribute('aria-label'))).toEqual(['Push A', 'Pull A', 'Push B', 'Pull B'])
    expect(screen.queryByText('Start a different day')).toBeNull()
  })

  it('opens on the up-next page and labels it', () => {
    render(<Home active={null} rest={null} flash={false} onStart={() => {}} onResume={() => {}} />)
    expect(screen.getByText('Up next · day 2 of 4')).toBeTruthy()
    expect(screen.getByText('Day 3 of 4')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Start Pull A' })).toBeTruthy()
  })

  it('Start follows the page on scroll', () => {
    const onStart = vi.fn()
    render(<Home active={null} rest={null} flash={false} onStart={onStart} onResume={() => {}} />)
    const el = pager()
    Object.defineProperty(el, 'clientWidth', { value: 400, configurable: true })
    Object.defineProperty(el, 'scrollLeft', { value: 800, configurable: true })
    fireEvent.scroll(el)
    const start = screen.getByRole('button', { name: 'Start Push B' })
    fireEvent.click(start)
    expect(onStart).toHaveBeenCalledWith(days[2])
  })

  it('shows the Resume card, hides Start and the update banner while active', () => {
    const onResume = vi.fn()
    render(<Home active={activeWith([logged(1), logged(2)])} rest={rest} flash={false} update={{ ready: true, apply: () => {} }} onStart={() => {}} onResume={onResume} />)
    const resume = screen.getByRole('button', { name: /Resume Push A/ })
    expect(resume.textContent).toMatch(/2 \/ 6 sets · 14 min · resting 0:4\d/)
    expect(screen.queryByRole('button', { name: /^Start / })).toBeNull()
    expect(screen.queryByText('New version ready')).toBeNull()
    fireEvent.click(resume)
    expect(onResume).toHaveBeenCalled()
  })

  it('Discard confirms through a sheet with the set count', async () => {
    render(<Home active={activeWith([logged(1), logged(2)])} rest={null} flash={false} onStart={() => {}} onResume={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Discard workout' }))
    expect(screen.getByRole('dialog', { name: 'Discard Push A?' })).toBeTruthy()
    expect(screen.getByText('2 logged sets are deleted. Cycle position stays.')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Keep' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(discardWorkout).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Discard workout' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Discard' }))
    })
    expect(discardWorkout).toHaveBeenCalledWith('w1')
  })

  it('singular and empty discard copy', () => {
    const { unmount } = render(<Home active={activeWith([logged(1)])} rest={null} flash={false} onStart={() => {}} onResume={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Discard workout' }))
    expect(screen.getByText('1 logged set is deleted. Cycle position stays.')).toBeTruthy()
    unmount()
    render(<Home active={activeWith([])} rest={null} flash={false} onStart={() => {}} onResume={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Discard workout' }))
    expect(screen.getByText('Nothing was logged. Cycle position stays.')).toBeTruthy()
  })

  it('shrinks the strip figures when a day has six slots', () => {
    const six = { ...homeView.days[1], stripSlugs: ['a', 'b', 'c', 'd', 'e', 'f'] }
    const { container } = render(<DayPage entry={six} days={days} nextDayId="pull-a" upNext />)
    const sizes = [...container.querySelectorAll('.ill')].map((el) => el.style.width)
    expect(sizes).toHaveLength(6)
    expect(new Set(sizes)).toEqual(new Set(['52px']))
  })

  it('flash rings the resume button', () => {
    render(<Home active={activeWith([])} rest={rest} flash onStart={() => {}} onResume={() => {}} />)
    expect(screen.getByRole('button', { name: /Resume Push A/ }).className).toContain('ring-4')
  })
})
