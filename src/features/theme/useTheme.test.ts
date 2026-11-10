import {act, renderHook} from '@testing-library/react'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import type {Segment} from '@/api/types'
import {useTheme} from '@/features/theme/useTheme'

beforeEach(() => localStorage.clear())
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('theme preferences', () => {
  // Best scenarios
  it('uses the loaded customer segment until the user overrides it', () => {
    const {result, rerender} = renderHook(({segment}: {segment: Segment}) => useTheme(segment), {
      initialProps: {segment: 'retail' as Segment},
    })
    rerender({segment: 'premium'})
    expect(document.documentElement).toHaveAttribute('data-segment', 'premium')
    act(() => result.current.changeSegment('retail'))
    rerender({segment: 'premium'})
    expect(document.documentElement).toHaveAttribute('data-segment', 'retail')
    expect(localStorage.getItem('meridian-segment')).toBe('retail')
  })

  // Worst scenarios
  it('follows system mode when saved preferences are invalid', () => {
    localStorage.setItem('meridian-theme', 'invalid')
    localStorage.setItem('meridian-segment', 'invalid')
    vi.stubGlobal('matchMedia', () => ({matches: true}))
    renderHook(() => useTheme('premium'))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(document.documentElement).toHaveAttribute('data-segment', 'premium')
  })

  it('keeps both controls usable when preference storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage blocked')
    })
    vi.stubGlobal('matchMedia', () => ({matches: false}))
    const {result} = renderHook(() => useTheme('premium'))
    act(() => result.current.toggleTheme())
    act(() => result.current.changeSegment('retail'))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(document.documentElement).toHaveAttribute('data-segment', 'retail')
  })

})
