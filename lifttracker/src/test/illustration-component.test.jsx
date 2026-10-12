// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Illustration from '../components/Illustration.jsx'

describe('Illustration', () => {
  it('renders three masked layers, oldest first, current last', () => {
    const { container } = render(<Illustration slug="bench-press" size={96} />)
    const layers = container.querySelectorAll('.ill i')
    expect(layers).toHaveLength(3)
    expect(layers[0].style.getPropertyValue('--mm')).toContain('/bench-press/1.svg')
    expect(layers[1].style.getPropertyValue('--mm')).toContain('/bench-press/3.svg')
    expect(layers[2].style.getPropertyValue('--mm')).toContain('/bench-press/2.svg')
    expect(container.firstChild.style.width).toBe('96px')
  })

  it('adds live and glow classes only when asked', () => {
    const { container, rerender } = render(<Illustration slug="dip" size={40} />)
    expect(container.firstChild.className).not.toMatch(/live|glow/)
    rerender(<Illustration slug="dip" size={40} live glow />)
    expect(container.firstChild.className).toMatch(/live/)
    expect(container.firstChild.className).toMatch(/glow/)
  })

  it('renders nothing without a slug', () => {
    const { container } = render(<Illustration slug={undefined} size={40} />)
    expect(container.firstChild).toBeNull()
  })

  it('is decorative unless labelled', () => {
    const { container, rerender } = render(<Illustration slug="dip" size={40} />)
    expect(container.firstChild.getAttribute('aria-hidden')).toBe('true')
    rerender(<Illustration slug="dip" size={40} label="Dips" />)
    expect(container.firstChild.getAttribute('role')).toBe('img')
    expect(container.firstChild.getAttribute('aria-label')).toBe('Dips')
  })
})
