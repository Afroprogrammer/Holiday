// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useWakeLock } from '../lib/wakeLock.js'

afterEach(cleanup)

function Probe({ enabled }) {
  const { held } = useWakeLock(enabled)
  return <span>{held ? 'held' : 'free'}</span>
}

function stubWakeLock(impl) {
  Object.defineProperty(navigator, 'wakeLock', { value: { request: impl }, configurable: true })
}

describe('useWakeLock', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true })
  })

  it('requests a screen lock while enabled and releases it on disable', async () => {
    const release = vi.fn().mockResolvedValue()
    const request = vi.fn().mockResolvedValue({ release, addEventListener: () => {} })
    stubWakeLock(request)
    const { rerender } = render(<Probe enabled />)
    await act(async () => {})
    expect(request).toHaveBeenCalledWith('screen')
    expect(screen.getByText('held')).toBeTruthy()
    rerender(<Probe enabled={false} />)
    await act(async () => {})
    expect(release).toHaveBeenCalled()
    expect(screen.getByText('free')).toBeTruthy()
  })

  it('re-requests after the browser released the lock and the page is visible again', async () => {
    const listeners = []
    const request = vi.fn().mockResolvedValue({ release: vi.fn().mockResolvedValue(), addEventListener: (_, fn) => listeners.push(fn) })
    stubWakeLock(request)
    render(<Probe enabled />)
    await act(async () => {})
    // Hiding the page makes the browser release the lock and fire 'release'.
    await act(async () => {
      for (const fn of listeners) fn()
    })
    expect(screen.getByText('free')).toBeTruthy()
    await act(async () => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(request).toHaveBeenCalledTimes(2)
    expect(screen.getByText('held')).toBeTruthy()
  })

  it('stays free and calls once when the request is refused', async () => {
    const request = vi.fn().mockRejectedValue(new Error('NotAllowedError'))
    stubWakeLock(request)
    render(<Probe enabled />)
    await act(async () => {})
    expect(request).toHaveBeenCalledTimes(1)
    expect(screen.getByText('free')).toBeTruthy()
  })

  it('does nothing without the API', async () => {
    delete navigator.wakeLock
    render(<Probe enabled />)
    await act(async () => {})
    expect(screen.getByText('free')).toBeTruthy()
  })
})
