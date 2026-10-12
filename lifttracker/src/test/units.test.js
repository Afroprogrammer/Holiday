import { describe, expect, it } from 'vitest'
import { convertWeight, formatWeightBoth, KG_PER_LB } from '../lib/units.js'

describe('unit conversion', () => {
  it('uses 1 lb = 0.45359237 kg', () => {
    expect(KG_PER_LB).toBe(0.45359237)
  })

  it('rounds 90 lb to 40.8 kg for display', () => {
    expect(convertWeight(90, 'lb', 'kg')).toBe(40.8)
  })

  it('rounds 2.5 kg to 5.5 lb for display', () => {
    expect(convertWeight(2.5, 'kg', 'lb')).toBe(5.5)
  })

  it('returns the same number when the units match', () => {
    expect(convertWeight(60, 'kg', 'kg')).toBe(60)
  })

  it('shows the other unit beside the entered one', () => {
    expect(formatWeightBoth(90, 'lb')).toBe('90 lb (40.8 kg)')
    expect(formatWeightBoth(0, 'kg')).toBe('0 kg (0 lb)')
  })
})
