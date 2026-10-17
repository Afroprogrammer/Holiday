// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { enterWorkout, leaveWorkout, replaceHash, resetNav } from '../lib/nav.js'

afterEach(() => {
  resetNav()
  window.location.hash = ''
  vi.restoreAllMocks()
})

describe('nav', () => {
  it('enterWorkout pushes #workout', () => {
    enterWorkout()
    expect(window.location.hash).toBe('#workout')
  })

  it('leaveWorkout goes back once after a push, then replaces', () => {
    const back = vi.spyOn(history, 'back').mockImplementation(() => {})
    enterWorkout()
    leaveWorkout()
    expect(back).toHaveBeenCalledTimes(1)
    window.location.hash = '#workout'
    leaveWorkout()
    expect(back).toHaveBeenCalledTimes(1)
    expect(window.location.hash).toBe('')
  })

  it('replaceHash fires hashchange', () => {
    const onChange = vi.fn()
    window.addEventListener('hashchange', onChange)
    replaceHash('#settings')
    expect(window.location.hash).toBe('#settings')
    expect(onChange).toHaveBeenCalledTimes(1)
    window.removeEventListener('hashchange', onChange)
  })
})
