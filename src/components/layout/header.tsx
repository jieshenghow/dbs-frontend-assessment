import {Moon, Sun} from 'lucide-react'
import type {Segment} from '@/api/types'
import type {Theme} from '@/features/theme/useTheme'
import Logo from '@/components/Logo'
import CircularProfile from '@/components/CircularProfile'
import SegmentSwitch from '@/components/SegmentSwitch'

interface HeaderProps {
  theme: Theme
  segment: Segment
  toggleTheme: () => void
  changeSegment: (segment: Segment) => void
}

export default function Header({theme, segment, toggleTheme, changeSegment}: HeaderProps) {
  return (
    <header className="fixed inset-x-0 top-0 z-header h-header bg-surface">
      <div className="mx-auto flex h-full max-w-[calc(var(--container)+2*var(--gutter))] items-center gap-6 px-gutter-mobile sm:px-gutter">
        <div className="flex shrink-0 items-center gap-6 text-lg font-semibold">
          <Logo />
          <span>Meridian</span>
        </div>
        <nav aria-label="Main navigation" className="hidden items-center gap-6 text-sm lg:flex">
          <span aria-current="page" className="font-semibold text-brand">
            Overview
          </span>
          {['Cards', 'Payments', 'Insights'].map((label) => (
            <button
              key={label}
              type="button"
              disabled
              className="min-h-tap-target cursor-default text-text-subtle"
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="flex-1" />
        <div className="hidden sm:block">
          <SegmentSwitch segment={segment} changeSegment={changeSegment} />
        </div>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          aria-pressed={theme === 'dark'}
          className="flex size-tap-target shrink-0 cursor-pointer items-center justify-center rounded-sm text-text-muted hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        >
          {theme === 'light' ? (
            <Moon size={20} aria-hidden="true" />
          ) : (
            <Sun size={20} aria-hidden="true" />
          )}
        </button>
        <CircularProfile />
      </div>
    </header>
  )
}
