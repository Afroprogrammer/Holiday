import { describe, expect, it, vi } from 'vitest'
import { buildRestNotification, closeRestNotifications, showRestNotification } from '../lib/restNotification.js'

const rest = { exerciseId: 'barbell-bench-press', exerciseName: 'Barbell bench press', durationSeconds: 90, startedAt: 0, endsAt: 90_000 }

describe('buildRestNotification', () => {
  it('names the next set', () => {
    const n = buildRestNotification(rest, { exerciseName: 'Barbell bench press', setNumber: 3, total: 4 })
    expect(n.title).toBe('Rest over')
    expect(n.options.body).toBe('Barbell bench press · set 3 of 4 next')
    expect(n.options.tag).toBe('rest')
    expect(n.options.vibrate).toEqual([300, 100, 300])
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
