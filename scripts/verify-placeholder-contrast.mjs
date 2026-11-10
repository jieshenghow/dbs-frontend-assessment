import assert from 'node:assert/strict'
import {writeFile} from 'node:fs/promises'
import {isAbsolute} from 'node:path'
import {pathToFileURL} from 'node:url'

const url = process.env.URL ?? 'http://127.0.0.1:4180'
const modulePath = process.env.PLAYWRIGHT_MODULE ?? 'playwright'
const {chromium} = await import(isAbsolute(modulePath) ? pathToFileURL(modulePath).href : modulePath)
const browser = await chromium.launch({headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath: process.env.CHROMIUM_EXECUTABLE} : {}),
})
const results = []
try {
  for (const theme of ['light', 'dark']) for (const segment of ['retail', 'premium']) {
    const context = await browser.newContext({viewport: {width: 1280, height: 1000}, reducedMotion: 'reduce'})
    try {
      await context.addInitScript(({theme, segment}) => {
        localStorage.setItem('meridian-theme', theme)
        localStorage.setItem('meridian-segment', segment)
      }, {theme, segment})
      const page = await context.newPage()
      await page.goto(url)
      await page.getByRole('searchbox', {name: 'Search transactions', exact: true}).waitFor()
      await page.waitForFunction(() => !document.querySelector('#transaction-search')?.disabled)
      for (const label of ['Search transactions', 'Search payees']) {
        if (label === 'Search payees') {
          await page.getByRole('button', {name: 'New transfer', exact: true}).filter({visible: true}).click()
        }
        const input = page.getByRole('searchbox', {name: label, exact: true})
        await input.waitFor({state: 'visible'})
        assert.equal(await input.count(), 1)
        const result = await input.evaluate((element, expected) => {
          if (document.documentElement.dataset.theme !== expected.theme ||
              document.documentElement.dataset.segment !== expected.segment) throw new Error('Theme mismatch')
          if (element.value || element.disabled || !element.matches(':placeholder-shown')) throw new Error('Placeholder not shown')
          if (![...element.labels].some((label) => label.textContent.trim() === expected.label)) throw new Error('Missing associated label')
          const canvas = document.createElement('canvas')
          canvas.width = canvas.height = 1
          const ctx = canvas.getContext('2d', {willReadFrequently: true})
          const rgba = (color) => {
            if (!CSS.supports('color', color)) throw new Error(`Unsupported color ${color}`)
            const alphaText = color.match(/\/\s*([\d.e+-]+%?)\s*\)$/i)?.[1]
              ?? color.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.e+-]+%?)\s*\)$/i)?.[1]
            const alpha = alphaText === undefined ? 1
              : Number.parseFloat(alphaText) / (alphaText.endsWith('%') ? 100 : 1)
            const opaque = `rgb(from ${color} r g b / 1)`
            if (!CSS.supports('color', opaque)) throw new Error('Relative RGB normalization is unsupported')
            ctx.clearRect(0, 0, 1, 1)
            ctx.fillStyle = opaque
            ctx.fillRect(0, 0, 1, 1)
            return [...ctx.getImageData(0, 0, 1, 1).data].slice(0, 3).map((value) => value / 255).concat(alpha)
          }
          const over = (front, back) => {
            const alpha = front[3] + back[3] * (1 - front[3])
            return alpha === 0 ? [0, 0, 0, 0] : [
              ...front.slice(0, 3).map((value, i) => (value * front[3] + back[i] * back[3] * (1 - front[3])) / alpha), alpha,
            ]
          }
          const placeholder = getComputedStyle(element, '::placeholder')
          let foreground = rgba(placeholder.color)
          foreground[3] *= Number(placeholder.opacity)
          let background = [0, 0, 0, 0]
          const layers = []
          for (let node = element; node; node = node.parentElement) {
            const style = getComputedStyle(node)
            if (style.backgroundImage !== 'none' || style.filter !== 'none' || style.mixBlendMode !== 'normal') {
              throw new Error('Non-solid background/filter/blend requires pixel verification')
            }
            const layer = rgba(style.backgroundColor)
            foreground = over(foreground, layer)
            background = over(background, layer)
            foreground[3] *= Number(style.opacity)
            background[3] *= Number(style.opacity)
            layers.push({tag: node.tagName, id: node.id, color: style.backgroundColor, opacity: style.opacity})
          }
          if (background[3] < 1) throw new Error('Actual ancestor background is not opaque')
          const luminance = (pixel) => pixel.slice(0, 3).map((channel) =>
            channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
          ).reduce((sum, channel, i) => sum + channel * [0.2126, 0.7152, 0.0722][i], 0)
          const a = luminance(foreground), b = luminance(background)
          const contrast = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
          return {...expected, color: placeholder.color, opacity: placeholder.opacity,
            foreground, background, layers, contrast, pass: contrast >= 4.5,
            normalization: 'Opaque source RGB quantized to 8-bit sRGB; computed color alpha and CSS opacity preserved without canvas alpha quantization'}
        }, {theme, segment, label})
        results.push(result)
        console.log(`${result.pass ? 'PASS' : 'FAIL'} ${theme}/${segment} ${label}: ${result.contrast.toFixed(3)}:1 (${result.color}, opacity ${result.opacity})`)
      }
    } finally { await context.close() }
  }
  assert.equal(results.length, 8)
  assert.ok(results.every((result) => result.pass), 'Every search placeholder must meet WCAG AA 4.5:1')
} finally {
  await browser.close()
  if (process.env.OUTPUT_PATH) await writeFile(process.env.OUTPUT_PATH, `${JSON.stringify({url, results}, null, 2)}\n`)
}
