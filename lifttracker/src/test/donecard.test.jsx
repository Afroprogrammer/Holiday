// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import DoneCard from '../components/DoneCard.jsx'

afterEach(cleanup)

describe('DoneCard', () => {
  it('shows the logged set with its flag and offers Edit and Skip rest', () => {
    const onEdit = vi.fn()
    const onSkipRest = vi.fn()
    const { container } = render(<DoneCard set={{ setNumber: 2, weight: 60, unit: 'kg', reps: 9 }} marker={{ kind: 'above', bound: 8 }} onEdit={onEdit} onSkipRest={onSkipRest} />)
    expect(screen.getByText('Set 2 logged')).toBeTruthy()
    expect(screen.getByText('60 kg × 9')).toBeTruthy()
    expect(screen.getByText('above range')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /done/i })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    fireEvent.click(screen.getByRole('button', { name: 'Skip rest' }))
    expect(onEdit).toHaveBeenCalled()
    expect(onSkipRest).toHaveBeenCalled()
    expect(container.firstChild.className).not.toContain('set-out')
  })

  it('takes the leaving animation class', () => {
    const { container } = render(<DoneCard set={{ setNumber: 1, weight: 0, unit: 'kg', reps: 10 }} marker={null} leaving onEdit={() => {}} onSkipRest={() => {}} />)
    expect(container.firstChild.className).toContain('set-out')
  })
})
