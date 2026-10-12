// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useInstallPrompt } from '../lib/install.js'

afterEach(cleanup)

function Probe() {
  const { canInstall, installed, install } = useInstallPrompt()
  return (
    <div>
      <span>{installed ? 'installed' : canInstall ? 'can' : 'no'}</span>
      <button type="button" onClick={install}>go</button>
    </div>
  )
}

function fakePromptEvent(outcome) {
  const e = new Event('beforeinstallprompt')
  e.prompt = vi.fn().mockResolvedValue()
  e.userChoice = Promise.resolve({ outcome })
  return e
}

describe('useInstallPrompt', () => {
  it('starts hidden, shows after the browser offers, and hides after dismissal', async () => {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
    render(<Probe />)
    expect(screen.getByText('no')).toBeTruthy()
    const e = fakePromptEvent('dismissed')
    await act(async () => {
      window.dispatchEvent(e)
    })
    expect(screen.getByText('can')).toBeTruthy()
    await act(async () => {
      fireEvent.click(screen.getByText('go'))
    })
    expect(e.prompt).toHaveBeenCalled()
    expect(screen.getByText('no')).toBeTruthy()
  })

  it('reports installed after acceptance and when already standalone', async () => {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
    render(<Probe />)
    await act(async () => {
      window.dispatchEvent(fakePromptEvent('accepted'))
    })
    await act(async () => {
      fireEvent.click(screen.getByText('go'))
      window.dispatchEvent(new Event('appinstalled'))
    })
    expect(screen.getByText('installed')).toBeTruthy()
    cleanup()
    window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} })
    render(<Probe />)
    expect(screen.getByText('installed')).toBeTruthy()
  })
})
