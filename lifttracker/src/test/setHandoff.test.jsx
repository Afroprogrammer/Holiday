// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useSetHandoff } from '../lib/useSetHandoff.js'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function Probe({ phase, cardSet }) {
  const { card, leaving, entering } = useSetHandoff(phase, cardSet)
  return <span>{`${card ? card.id : '-'}|${leaving ? 'leaving' : 'stay'}|${entering ? 'enter' : 'idle'}`}</span>
}

const s1 = { id: 's1', setNumber: 1 }

describe('useSetHandoff', () => {
  it('keeps the card for the slide-out in the same render the rest ends, then enters', () => {
    vi.useFakeTimers()
    const { rerender } = render(<Probe phase="running" cardSet={s1} />)
    expect(screen.getByText('s1|stay|idle')).toBeTruthy()
    rerender(<Probe phase="over" cardSet={s1} />)
    expect(screen.getByText('s1|leaving|idle')).toBeTruthy()
    act(() => vi.advanceTimersByTime(180))
    expect(screen.getByText('-|stay|enter')).toBeTruthy()
  })

  it('still slides out on Skip, when the rest and its set vanish together', () => {
    vi.useFakeTimers()
    const { rerender } = render(<Probe phase="running" cardSet={s1} />)
    rerender(<Probe phase="none" cardSet={null} />)
    expect(screen.getByText('s1|leaving|idle')).toBeTruthy()
    act(() => vi.advanceTimersByTime(180))
    expect(screen.getByText('-|stay|enter')).toBeTruthy()
  })

  it('resets when a new rest starts, even inside the leave window', () => {
    vi.useFakeTimers()
    const { rerender } = render(<Probe phase="running" cardSet={s1} />)
    rerender(<Probe phase="none" cardSet={null} />)
    act(() => vi.advanceTimersByTime(50))
    rerender(<Probe phase="running" cardSet={{ id: 's2', setNumber: 2 }} />)
    expect(screen.getByText('s2|stay|idle')).toBeTruthy()
    act(() => vi.advanceTimersByTime(500))
    expect(screen.getByText('s2|stay|idle')).toBeTruthy()
  })

  it('does not animate when nothing was showing (first mount in overtime, or no card)', () => {
    vi.useFakeTimers()
    const { rerender } = render(<Probe phase="over" cardSet={s1} />)
    expect(screen.getByText('-|stay|idle')).toBeTruthy()
    rerender(<Probe phase="none" cardSet={null} />)
    act(() => vi.advanceTimersByTime(500))
    expect(screen.getByText('-|stay|idle')).toBeTruthy()
  })
})
