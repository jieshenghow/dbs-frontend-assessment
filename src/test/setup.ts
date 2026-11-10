import '@testing-library/jest-dom/vitest'
import {cleanup} from '@testing-library/react'
import {setupServer} from 'msw/node'
import {afterAll, afterEach, beforeAll, beforeEach} from 'vitest'
import {handlers, resetMockDb} from '../mocks/handlers'

export const server = setupServer(...handlers)

beforeAll(() => server.listen({onUnhandledRequest: 'error'}))
beforeEach(() => resetMockDb())
afterEach(() => {
  cleanup()
  server.resetHandlers()
  localStorage.clear()
  document.documentElement.dataset.theme = 'light'
  document.documentElement.dataset.segment = 'retail'
})
afterAll(() => server.close())

const dialogOpeners = new WeakMap<HTMLDialogElement, HTMLElement>()

Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
  configurable: true,
  value: function (this: HTMLDialogElement) {
    if (document.activeElement instanceof HTMLElement)
      dialogOpeners.set(this, document.activeElement)
    this.setAttribute('open', '')
  },
})

Object.defineProperty(HTMLDialogElement.prototype, 'close', {
  configurable: true,
  value: function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    dialogOpeners.get(this)?.focus()
    this.dispatchEvent(new Event('close'))
  },
})
