// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRestWatcher } from '../lib/useRestWatcher.js'
import { startRest } from '../lib/timer.js'

vi.mock('../lib/restNotification.js', async (importOriginal) => {
  const real = await importOriginal()
  return { ...real, signalRestOver: vi.fn(), showRestNotification: vi.fn().mockResolvedValue(), getRegistration: vi.fn().mockResolvedValue({ showNotification: vi.fn() }) }
})
import { showRestNotification, signalRestOver } from '../lib/restNotification.js'

function Probe({ rest, notify = false, nextSet = null }) {
  const flash = useRestWatcher(rest, { notify, nextSet })
  return <span>{flash ? 'flash' : 'calm'}</span>
}

const NOW = 1_000_000

describe('useRestWatcher', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
    signalRestOver.mockClear()
    showRestNotification.mockClear()
  })
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('fires once at zero, flashes for FLASH_MS, and not again for the same rest', () => {
    const rest = startRest({ exerciseId: 'deadlift', exerciseName: 'Deadlift', restSeconds: 2 }, NOW)
    render(<Probe rest={rest} />)
    expect(screen.getByText('calm')).toBeTruthy()
    act(() => vi.advanceTimersByTime(2_250))
    expect(screen.getByText('flash')).toBeTruthy()
    expect(signalRestOver).toHaveBeenCalledTimes(1)
    act(() => vi.advanceTimersByTime(2_500))
    expect(screen.getByText('calm')).toBeTruthy()
    act(() => vi.advanceTimersByTime(5_000))
    expect(signalRestOver).toHaveBeenCalledTimes(1)
  })

  it('does not fire for a rest already over at mount', () => {
    const rest = startRest({ exerciseId: 'deadlift', exerciseName: 'Deadlift', restSeconds: 2 }, NOW - 10_000)
    render(<Probe rest={rest} />)
    act(() => vi.advanceTimersByTime(1_000))
    expect(signalRestOver).not.toHaveBeenCalled()
    expect(screen.getByText('calm')).toBeTruthy()
  })

  it('sends the notification only when notify is true', async () => {
    const next = { exerciseName: 'Deadlift', setNumber: 2, total: 3 }
    const rest = startRest({ exerciseId: 'deadlift', exerciseName: 'Deadlift', restSeconds: 2 }, NOW)
    const { rerender } = render(<Probe rest={rest} notify={false} nextSet={next} />)
    await act(async () => vi.advanceTimersByTime(2_250))
    expect(showRestNotification).not.toHaveBeenCalled()
    const second = startRest({ exerciseId: 'deadlift', exerciseName: 'Deadlift', restSeconds: 2 }, Date.now())
    rerender(<Probe rest={second} notify nextSet={next} />)
    await act(async () => vi.advanceTimersByTime(2_250))
    await act(async () => {})
    expect(showRestNotification).toHaveBeenCalledTimes(1)
    expect(showRestNotification.mock.calls[0][1]).toBe(second)
    expect(showRestNotification.mock.calls[0][2]).toEqual(next)
  })

  it('resets for a new rest and is calm with no rest', () => {
    const rest = startRest({ exerciseId: 'deadlift', exerciseName: 'Deadlift', restSeconds: 2 }, NOW)
    const { rerender } = render(<Probe rest={rest} />)
    act(() => vi.advanceTimersByTime(2_250))
    expect(screen.getByText('flash')).toBeTruthy()
    rerender(<Probe rest={null} />)
    expect(screen.getByText('calm')).toBeTruthy()
    const second = startRest({ exerciseId: 'deadlift', exerciseName: 'Deadlift', restSeconds: 2 }, Date.now())
    rerender(<Probe rest={second} />)
    expect(screen.getByText('calm')).toBeTruthy()
    act(() => vi.advanceTimersByTime(2_250))
    expect(screen.getByText('flash')).toBeTruthy()
    expect(signalRestOver).toHaveBeenCalledTimes(2)
  })
})
