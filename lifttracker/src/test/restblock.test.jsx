// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import RestBlock, { LoggedLine, NextUpCard } from '../components/RestBlock.jsx'

afterEach(cleanup)

const chest = { id: 'machine-chest-press', name: 'Machine chest press, plate loaded', displayUnit: 'kg', restSeconds: 90, illustration: 'machine-chest-press' }
const bench = { id: 'barbell-bench-press', name: 'Barbell bench press', displayUnit: 'kg', restSeconds: 90, illustration: 'bench-press' }
const other = {
  kind: 'other',
  entry: { exercise: chest, slot: { targetSets: 3, repMin: 8, repMax: 10 }, total: 3 },
  row: { n: 1 },
  index: 2,
  count: 5,
  setupText: '50 kg',
  lastText: '50 kg × 10 · 10 · 9',
}
const same = {
  kind: 'same',
  entry: { exercise: bench, slot: { targetSets: 4, repMin: 5, repMax: 8 }, total: 4 },
  row: { n: 3 },
  index: 1,
  count: 5,
  setupText: '60 kg',
  lastText: '60 kg × 8',
  after: { name: 'Machine chest press', text: '3 × 8–10' },
}

describe('LoggedLine', () => {
  it('shows the set on one line with its flag and Edit', () => {
    const onEdit = vi.fn()
    render(<LoggedLine set={{ setNumber: 2, weight: 60, unit: 'kg', reps: 9 }} marker={{ kind: 'above', bound: 8 }} onEdit={onEdit} />)
    expect(screen.getByText('S2')).toBeTruthy()
    expect(screen.getByText('60 kg × 9')).toBeTruthy()
    expect(screen.getByText('above range')).toBeTruthy()
    expect(screen.getByText('logged')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalled()
  })
})

describe('NextUpCard', () => {
  it('shows another exercise in full and starts it', () => {
    const onStart = vi.fn()
    const { container } = render(<NextUpCard preview={other} onStart={onStart} />)
    expect(screen.getByText('Next · after this rest')).toBeTruthy()
    expect(screen.getByText('Exercise 2 of 5')).toBeTruthy()
    expect(screen.getByText('Machine chest press')).toBeTruthy()
    expect(screen.getByText('3 sets · 8–10 reps · rest 90 s')).toBeTruthy()
    expect(screen.getByText('Last time')).toBeTruthy()
    expect(screen.getByText('50 kg × 10 · 10 · 9')).toBeTruthy()
    expect(screen.getByText('Set up')).toBeTruthy()
    expect(screen.getByText('50 kg')).toBeTruthy()
    expect(container.querySelector('.ill.live')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Start Machine chest press now' }))
    expect(onStart).toHaveBeenCalled()
  })

  it('names the next set of the same exercise and what follows', () => {
    render(<NextUpCard preview={same} onStart={() => {}} />)
    expect(screen.getByText('Set 3 of 4')).toBeTruthy()
    expect(screen.getByText('Then: Machine chest press · 3 × 8–10')).toBeTruthy()
    expect(screen.getByText('60 kg × 8')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Start set 3 now' })).toBeTruthy()
  })

  it('says the exercise is last when nothing follows', () => {
    render(<NextUpCard preview={{ ...same, after: null }} onStart={() => {}} />)
    expect(screen.getByText('Then: last exercise')).toBeTruthy()
  })

  it('shows all sets logged and no start button when nothing is left', () => {
    render(<NextUpCard preview={{ kind: 'none' }} onStart={() => {}} />)
    expect(screen.getByText('All sets logged')).toBeTruthy()
    expect(screen.getByText('Finish when you are ready.')).toBeTruthy()
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('NextUpCard with the new program', () => {
  it('shows the set range and the finisher tag for another exercise', () => {
    render(<NextUpCard preview={{ ...other, entry: { ...other.entry, slot: { ...other.entry.slot, setsMax: 4, finisher: true } } }} onStart={() => {}} />)
    expect(screen.getByText('3–4 sets · 8–10 reps · rest 90 s')).toBeTruthy()
    expect(screen.getByText('Finisher')).toBeTruthy()
  })
})

describe('NextUpCard alternatives', () => {
  it('lets the next exercise switch to its alternative during the rest', () => {
    const onChoose = vi.fn()
    const options = [chest, { id: 'dumbbell-bench', name: 'Dumbbell bench press' }]
    render(<NextUpCard preview={{ ...other, entry: { ...other.entry, slot: { ...other.entry.slot, options } } }} onStart={() => {}} onChoose={onChoose} />)
    expect(screen.getByRole('button', { name: 'Machine chest press' }).className).toContain('bg-act')
    fireEvent.click(screen.getByRole('button', { name: 'Dumbbell bench press' }))
    expect(onChoose).toHaveBeenCalledWith('dumbbell-bench')
  })

  it('shows no toggle for one option or for the same exercise', () => {
    render(<NextUpCard preview={{ ...other, entry: { ...other.entry, slot: { ...other.entry.slot, options: [chest] } } }} onStart={() => {}} onChoose={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Machine chest press' })).toBeNull()
  })
})

describe('RestBlock', () => {
  it('has no Done button and takes the leaving class', () => {
    const { container } = render(<RestBlock set={{ setNumber: 4, weight: 60, unit: 'kg', reps: 8 }} marker={null} preview={other} leaving onEdit={() => {}} onStart={() => {}} />)
    expect(screen.queryByRole('button', { name: /done/i })).toBeNull()
    expect(container.firstChild.className).toContain('set-out')
  })
})
