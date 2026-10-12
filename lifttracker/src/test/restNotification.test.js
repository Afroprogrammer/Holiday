import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => vi.unstubAllGlobals())
import { buildRestNotification, closeRestNotifications, showRestNotification, signalRestOver, testBuzz } from '../lib/restNotification.js'

const rest = { exerciseId: 'barbell-bench-press', exerciseName: 'Barbell bench press', durationSeconds: 90, startedAt: 0, endsAt: 90_000 }

describe('buildRestNotification', () => {
  it('names the next set', () => {
    const n = buildRestNotification(rest, { exerciseName: 'Barbell bench press', setNumber: 3, total: 4 })
    expect(n.title).toBe('Rest over')
    expect(n.options.body).toBe('Barbell bench press · set 3 of 4 next')
    expect(n.options.tag).toBe('rest')
    expect(n.options.vibrate).toEqual([300, 100, 300, 100, 300])
    expect(n.options.icon).toMatch(/icon-192\.png$/)
    expect(n.options.data.url).toMatch(/\/$/)
  })

  it('says all sets done when nothing is next', () => {
    expect(buildRestNotification(rest, null).options.body).toBe('Barbell bench press · all sets done')
  })
})

describe('showRestNotification', () => {
  it('calls showNotification on the registration', async () => {
    const registration = { showNotification: vi.fn().mockResolvedValue() }
    await showRestNotification(registration, rest, null)
    expect(registration.showNotification).toHaveBeenCalledWith('Rest over', expect.objectContaining({ tag: 'rest' }))
  })

  it('resolves quietly with no registration or a failing one', async () => {
    await expect(showRestNotification(null, rest, null)).resolves.toBeUndefined()
    await expect(showRestNotification({ showNotification: () => Promise.reject(new Error('x')) }, rest, null)).resolves.toBeUndefined()
  })
})

describe('closeRestNotifications', () => {
  it('closes every notification tagged rest', async () => {
    const close = vi.fn()
    const registration = { getNotifications: vi.fn().mockResolvedValue([{ close }, { close }]) }
    await closeRestNotifications(registration)
    expect(registration.getNotifications).toHaveBeenCalledWith({ tag: 'rest' })
    expect(close).toHaveBeenCalledTimes(2)
    await expect(closeRestNotifications(null)).resolves.toBeUndefined()
  })
})

describe('signalRestOver', () => {
  it('vibrates a three-pulse pattern and resumes audio before beeping', async () => {
    const vibrate = vi.fn()
    const resume = vi.fn().mockResolvedValue()
    const osc = { frequency: {}, connect: vi.fn().mockReturnThis(), start: vi.fn(), stop: vi.fn() }
    const gain = { gain: {}, connect: vi.fn().mockReturnThis() }
    const ctx = { state: 'suspended', currentTime: 0, resume, createOscillator: () => osc, createGain: () => gain, destination: {}, close: vi.fn() }
    vi.stubGlobal('navigator', { vibrate })
    vi.stubGlobal('window', { AudioContext: function () { return ctx } })
    signalRestOver()
    await new Promise((r) => setTimeout(r, 0))
    expect(vibrate).toHaveBeenCalledWith([300, 100, 300, 100, 300])
    expect(resume).toHaveBeenCalled()
    expect(osc.start).toHaveBeenCalledTimes(2)
  })

  it('never throws without vibration or audio', () => {
    vi.stubGlobal('navigator', {})
    vi.stubGlobal('window', {})
    expect(() => signalRestOver()).not.toThrow()
  })
})

describe('testBuzz', () => {
  it('shows a test notification and signals in-app', async () => {
    const registration = { showNotification: vi.fn().mockResolvedValue() }
    const vibrate = vi.fn()
    vi.stubGlobal('navigator', { vibrate })
    vi.stubGlobal('window', {})
    await testBuzz(registration)
    expect(registration.showNotification).toHaveBeenCalledWith('Test buzz', expect.objectContaining({ tag: 'rest', vibrate: [300, 100, 300, 100, 300] }))
    expect(vibrate).toHaveBeenCalled()
  })
})
