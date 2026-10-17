// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(cleanup)
import RestDock from '../components/RestDock.jsx'
import { startRest } from '../lib/timer.js'

describe('RestDock', () => {
  it('shows the idle line with no rest', () => {
    render(<RestDock rest={null} nextSlug="bench-press" onAdjust={() => {}} onSkip={() => {}} />)
    expect(screen.getByText('Rest timer idle')).toBeTruthy()
    expect(screen.queryByRole('timer')).toBeNull()
  })

  it('counts down and shows the next exercise while resting', () => {
    vi.useFakeTimers()
    const now = 1_000_000
    vi.setSystemTime(now)
    const rest = startRest({ exerciseId: 'barbell-bench-press', exerciseName: 'Barbell bench press', restSeconds: 90 }, now)
    render(<RestDock rest={rest} nextSlug="machine-chest-press" onAdjust={() => {}} onSkip={() => {}} />)
    expect(screen.getByRole('timer').textContent).toContain('1:30')
    expect(screen.getByText('of 1:30')).toBeTruthy()
    expect(document.querySelector('.ill.live.glow')).toBeTruthy()
    vi.useRealTimers()
  })

  it('flashes amber from the prop and shows overtime otherwise', () => {
    vi.useFakeTimers()
    const now = 1_000_000
    vi.setSystemTime(now + 5_000)
    const rest = startRest({ exerciseId: 'deadlift', exerciseName: 'Deadlift', restSeconds: 2 }, now)
    const { rerender } = render(<RestDock rest={rest} nextSlug="deadlift" flash onAdjust={() => {}} onSkip={() => {}} />)
    const dock = () => screen.getByRole('timer').closest('aside')
    expect(dock().className).toContain('bg-act')
    expect(screen.getByRole('timer').className).not.toContain('text-flag')
    rerender(<RestDock rest={rest} nextSlug="deadlift" flash={false} onAdjust={() => {}} onSkip={() => {}} />)
    expect(dock().className).not.toContain('bg-act')
    expect(screen.getByRole('timer').className).toContain('text-flag')
    vi.useRealTimers()
  })

  it('shows overtime in flag colour with a full bar', () => {
    vi.useFakeTimers()
    const now = 1_000_000
    vi.setSystemTime(now + 155_000)
    const rest = startRest({ exerciseId: 'deadlift', exerciseName: 'Deadlift', restSeconds: 90 }, now)
    render(<RestDock rest={rest} nextSlug="deadlift" onAdjust={() => {}} onSkip={() => {}} />)
    const timer = screen.getByRole('timer')
    expect(timer.textContent).toContain('+1:05')
    expect(timer.className).toContain('text-flag')
    expect(screen.getByTestId('rest-bar').style.width).toBe('100%')
    vi.useRealTimers()
  })
})
