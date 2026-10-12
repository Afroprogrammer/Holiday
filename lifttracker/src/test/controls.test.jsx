// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(cleanup)
import Stepper from '../components/Stepper.jsx'
import BottomSheet from '../components/BottomSheet.jsx'
import CycleBar from '../components/CycleBar.jsx'
import { summaryOf } from '../components/DaySheet.jsx'
import Switch from '../components/Switch.jsx'
import SettingRow from '../components/SettingRow.jsx'
import { exercises, programDays } from '../db/program.js'

describe('Stepper', () => {
  it('steps by the increment and never below zero', () => {
    const onChange = vi.fn()
    render(<Stepper value="60" onChange={onChange} step={2.5} size="weight" unit="kg" caption="132 lb · ±2.5" label="Weight" inputMode="decimal" />)
    fireEvent.click(screen.getByLabelText('Weight plus'))
    expect(onChange).toHaveBeenLastCalledWith('62.5')
    fireEvent.click(screen.getByLabelText('Weight minus'))
    expect(onChange).toHaveBeenLastCalledWith('57.5')
    onChange.mockClear()
    const { rerender } = render(<Stepper value="1" onChange={onChange} step={2.5} size="weight" label="W2" inputMode="decimal" />)
    fireEvent.click(screen.getByLabelText('W2 minus'))
    expect(onChange).toHaveBeenLastCalledWith('0')
    rerender(<Stepper value="" onChange={onChange} step={1} size="reps" label="W2" inputMode="numeric" />)
    fireEvent.click(screen.getByLabelText('W2 plus'))
    expect(onChange).toHaveBeenLastCalledWith('1')
  })

  it('strips non-numeric input', () => {
    const onChange = vi.fn()
    render(<Stepper value="6" onChange={onChange} step={1} size="reps" label="Reps" inputMode="numeric" />)
    fireEvent.change(screen.getByLabelText('Reps'), { target: { value: '7a.' } })
    expect(onChange).toHaveBeenLastCalledWith('7.')
  })

  it('offers the unit as a button only when it can flip', () => {
    const flip = vi.fn()
    const { rerender } = render(<Stepper value="60" onChange={() => {}} step={2.5} size="weight" unit="kg" label="Weight" inputMode="decimal" />)
    expect(screen.queryByRole('button', { name: /unit kg/i })).toBeNull()
    rerender(<Stepper value="60" onChange={() => {}} step={2.5} size="weight" unit="kg" onFlipUnit={flip} label="Weight" inputMode="decimal" />)
    fireEvent.click(screen.getByRole('button', { name: /unit kg/i }))
    expect(flip).toHaveBeenCalled()
  })
})

describe('BottomSheet', () => {
  it('renders nothing when closed and closes on scrim tap and Escape', () => {
    const onClose = vi.fn()
    const { container, rerender } = render(<BottomSheet open={false} title="T" onClose={onClose}>x</BottomSheet>)
    expect(container.firstChild).toBeNull()
    rerender(<BottomSheet open title="T" onClose={onClose}>x</BottomSheet>)
    expect(screen.getByRole('dialog', { name: 'T' })).toBeTruthy()
    fireEvent.click(screen.getByTestId('scrim'))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})

describe('CycleBar', () => {
  it('marks days before the next one as done and the next one as current', () => {
    const { container } = render(<CycleBar days={programDays} nextDayId="push-b" />)
    const segs = [...container.querySelectorAll('[data-state]')].map((s) => s.dataset.state)
    expect(segs).toEqual(['done', 'done', 'now', 'todo'])
  })
})

describe('summaryOf', () => {
  it('shortens each slot to a word or two', () => {
    const byId = new Map(exercises.map((e) => [e.id, e]))
    expect(summaryOf(programDays[0], byId)).toBe('bench press · chest press · shoulder press · dips · cable crunch')
    expect(summaryOf(programDays[3], byId)).toBe('deadlift · lat pulldown · bent-over row · dumbbell shrugs · ab crunch')
  })
})

describe('Switch', () => {
  it('toggles and reports its state', () => {
    const onChange = vi.fn()
    const { rerender } = render(<Switch checked={false} onChange={onChange} label="Keep screen on" />)
    const sw = screen.getByRole('switch', { name: 'Keep screen on' })
    expect(sw.getAttribute('aria-checked')).toBe('false')
    fireEvent.click(sw)
    expect(onChange).toHaveBeenCalledWith(true)
    rerender(<Switch checked onChange={onChange} label="Keep screen on" disabled />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledTimes(1)
  })
})

describe('SettingRow', () => {
  it('is a button only when it has an action', () => {
    const onClick = vi.fn()
    const { rerender } = render(<SettingRow label="Export history" caption="Saves a file" onClick={onClick} />)
    fireEvent.click(screen.getByRole('button', { name: /export history/i }))
    expect(onClick).toHaveBeenCalled()
    rerender(<SettingRow label="Keep screen on"><span>x</span></SettingRow>)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('Keep screen on')).toBeTruthy()
  })
})
