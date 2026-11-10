import {useLayoutEffect, useState} from 'react'
import type {Segment} from '@/api/types'

export type Theme = 'light' | 'dark'

function savedPreference(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    return
  }
}

export function useTheme(defaultSegment: Segment = 'retail') {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = savedPreference('meridian-theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [override, setOverride] = useState<Segment | null>(() => {
    const saved = savedPreference('meridian-segment')
    return saved === 'retail' || saved === 'premium' ? saved : null
  })
  const segment = override ?? defaultSegment

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.dataset.segment = segment
  }, [theme, segment])

  function toggleTheme() {
    const next = theme === 'light' ? 'dark' : 'light'
    setTheme(next)
    remember('meridian-theme', next)
  }

  function changeSegment(next: Segment) {
    setOverride(next)
    remember('meridian-segment', next)
  }

  return {theme, segment, toggleTheme, changeSegment}
}
