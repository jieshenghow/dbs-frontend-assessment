import { describe, expect, it } from 'vitest'
import { formatMoney, formatShortDate } from './format'

describe('formatMoney', () => {
  // Best scenario: standard positive and negative SGD amounts.
  it('uses the SGD code and two decimals', () => {
    expect(formatMoney(4280.55)).toBe('SGD 4,280.55')
    expect(formatMoney(12840)).toBe('SGD 12,840.00')
    expect(formatMoney(-420.3)).toBe('-SGD 420.30')
  })

  // Boundary tests: zero balance and the smallest supported currency unit.
  it('formats zero and one-cent amounts without losing precision or signs', () => {
    expect(formatMoney(0)).toBe('SGD 0.00')
    expect(formatMoney(0.01)).toBe('SGD 0.01')
    expect(formatMoney(-0.01)).toBe('-SGD 0.01')
  })
})

describe('formatShortDate', () => {
  // Boundary tests: Singapore dates can differ from the UTC calendar date.
  it('formats in Singapore time regardless of the runner timezone', () => {
    // 00:15 UTC on 18 Oct — would read 17 Oct in the Americas.
    expect(formatShortDate('2026-10-18T08:15:00+08:00')).toBe('18 Oct')
  })

  it('changes the date at Singapore midnight across a year boundary', () => {
    expect(formatShortDate('2026-12-31T15:59:59Z')).toBe('31 Dec')
    expect(formatShortDate('2026-12-31T16:00:00Z')).toBe('1 Jan')
  })
})
