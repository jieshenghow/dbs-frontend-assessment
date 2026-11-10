import {cleanup, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import Header from '@/components/layout/header'
import {useTheme} from '@/features/theme/useTheme'

function ThemeHeader() {
  const preferences = useTheme()
  return <Header {...preferences} />
}

beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  localStorage.clear()
  delete document.documentElement.dataset.segment
  delete document.documentElement.dataset.theme
})

describe('SegmentSwitch', () => {
  // Best scenarios: segment switching preserves and remembers user preferences.
  it('switches segments in both directions and remembers the selection', async () => {
    const user = userEvent.setup()
    render(<ThemeHeader />)

    const retail = screen.getByText('Retail')
    const premium = screen.getByText('Premium')

    await user.click(premium)
    expect(document.documentElement).toHaveAttribute('data-segment', 'premium')
    expect(localStorage.getItem('meridian-segment')).toBe('premium')

    await user.click(retail)
    expect(document.documentElement).toHaveAttribute('data-segment', 'retail')
    expect(localStorage.getItem('meridian-segment')).toBe('retail')
  })

  it.each(['light', 'dark'] as const)(
    'preserves the selected mode when switching segments from %s mode',
    async (initialTheme) => {
      localStorage.setItem('meridian-theme', initialTheme)
      const user = userEvent.setup()
      const {unmount} = render(<ThemeHeader />)
      const nextTheme = initialTheme === 'light' ? 'dark' : 'light'

      await user.click(screen.getByRole('button', {name: `Switch to ${nextTheme} mode`}))

      for (const segment of ['Premium', 'Retail', 'Premium']) {
        await user.click(screen.getByText(segment))
        expect(document.documentElement).toHaveAttribute('data-theme', nextTheme)
        expect(document.documentElement).toHaveAttribute('data-segment', segment.toLowerCase())
        expect(localStorage.getItem('meridian-theme')).toBe(nextTheme)
        expect(
          screen.getByRole('button', {name: `Switch to ${initialTheme} mode`}),
        ).toBeInTheDocument()
      }

      await user.click(screen.getByRole('button', {name: `Switch to ${initialTheme} mode`}))
      expect(document.documentElement).toHaveAttribute('data-theme', initialTheme)
      expect(document.documentElement).toHaveAttribute('data-segment', 'premium')

      unmount()
      render(<ThemeHeader />)
      expect(document.documentElement).toHaveAttribute('data-theme', initialTheme)
      expect(document.documentElement).toHaveAttribute('data-segment', 'premium')
    },
  )
})
