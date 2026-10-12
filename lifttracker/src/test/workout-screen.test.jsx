// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ActiveSet } from '../screens/Workout.jsx'

afterEach(cleanup)

const exercise = { id: 'barbell-bench-press', name: 'Barbell bench press', displayUnit: 'kg', incrementKg: 2.5, incrementLb: 5 }
const row = { n: 3, status: 'open', prefill: { weight: 60, unit: 'kg', reps: 7 }, last: { weight: 60, unit: 'kg', reps: 7 } }

describe('ActiveSet', () => {
  it('prefills from last time and logs with two taps', () => {
    const onDone = vi.fn()
    render(<ActiveSet exercise={exercise} row={row} total={4} targetText="5–8" onDone={onDone} onFlipUnit={() => {}} />)
    expect(screen.getByText('60 kg × 7').closest('p').textContent).toBe('last 60 kg × 7')
    expect(screen.getByLabelText('Weight').value).toBe('60')
    expect(screen.getByLabelText('Reps').value).toBe('7')
    fireEvent.click(screen.getByRole('button', { name: /done/i }))
    expect(onDone).toHaveBeenCalledWith(3, { weight: 60, unit: 'kg', reps: 7 })
  })

  it('converts the prefill into the display unit', () => {
    render(<ActiveSet exercise={{ ...exercise, displayUnit: 'lb' }} row={{ ...row, prefill: { weight: 60, unit: 'kg', reps: 7 }, last: { weight: 60, unit: 'kg', reps: 7 } }} total={4} targetText="5–8" onDone={() => {}} onFlipUnit={() => {}} />)
    expect(screen.getByLabelText('Weight').value).toBe('132.3')
    expect(screen.getByText('60 kg (132.3 lb) × 7').closest('p').textContent).toBe('last 60 kg (132.3 lb) × 7')
  })

  it('disables Done until both fields have numbers', () => {
    render(<ActiveSet exercise={exercise} row={{ ...row, prefill: null, last: null }} total={4} targetText="5–8" onDone={() => {}} onFlipUnit={() => {}} />)
    expect(screen.getByText('–').closest('p').textContent).toBe('last –')
    expect(screen.getByRole('button', { name: /done/i }).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Weight'), { target: { value: '40' } })
    fireEvent.change(screen.getByLabelText('Reps'), { target: { value: '10' } })
    expect(screen.getByRole('button', { name: /done/i }).disabled).toBe(false)
  })
})
