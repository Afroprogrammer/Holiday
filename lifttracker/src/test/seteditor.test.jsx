// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SetEditor from '../components/SetEditor.jsx'

afterEach(cleanup)

const exercise = { id: 'barbell-bench-press', name: 'Barbell bench press', displayUnit: 'lb', incrementKg: 2.5, incrementLb: 5 }
const set = { id: 's1', setNumber: 2, weight: 60, unit: 'kg', reps: 8 }

describe('SetEditor', () => {
  it('prefills the stored values in the stored unit and saves without converting', () => {
    const onSave = vi.fn()
    render(<SetEditor set={set} exercise={exercise} targetText="5–8" onSave={onSave} onCancel={() => {}} onRemove={() => {}} />)
    expect(screen.getByLabelText('Weight').value).toBe('60')
    expect(screen.getByText('kg')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /unit/i })).toBeNull()
    fireEvent.click(screen.getByLabelText('Weight plus'))
    fireEvent.click(screen.getByLabelText('Reps minus'))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSave).toHaveBeenCalledWith({ weight: 62.5, unit: 'kg', reps: 7 })
  })

  it('cancels and removes', () => {
    const onCancel = vi.fn()
    const onRemove = vi.fn()
    render(<SetEditor set={set} exercise={exercise} targetText="5–8" onSave={() => {}} onCancel={onCancel} onRemove={onRemove} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove set' }))
    expect(onCancel).toHaveBeenCalled()
    expect(onRemove).toHaveBeenCalled()
  })
})
