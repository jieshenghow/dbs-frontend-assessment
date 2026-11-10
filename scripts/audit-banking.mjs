import assert from 'node:assert/strict'
import {aggregateCoverage, coverageMarkdown} from './audit/coverage.mjs'
import {requirements, sourceVersions} from './audit/registry.mjs'
import {probeActualSchema} from './audit/schema-probe.mjs'
import {rejectLoopbackRequests} from './audit/public-guard.mjs'
import {createHash} from 'node:crypto'
import {spawn, execFileSync} from 'node:child_process'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {createServer} from 'node:net'
import {resolve, dirname, isAbsolute} from 'node:path'
import {fileURLToPath, pathToFileURL} from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const output = resolve(process.env.AUDIT_OUTPUT ?? `${root}/.audit/${stamp}`)
console.log(`START banking audit ${new Date().toISOString()}\nRoot: ${root}\nEvidence: ${output}\nBrowser: ${process.env.AUDIT_HEADLESS === '1' ? 'headless (explicit override)' : 'visible (default)'}`)
await mkdir(output, {recursive: true})
const git = (...args) => execFileSync('git', args, {cwd: root, encoding: 'utf8'}).trim()
const hash = (value) => createHash('sha256').update(value).digest('hex')
const sourcePaths = () => git('ls-files', '--cached', '--others', '--exclude-standard').split('\n').filter((p) => p && !p.startsWith('.audit/') && !p.startsWith('.idea/') && p !== 'scripts/audit-banking.mjs' && !p.startsWith('scripts/audit/'))
async function sourceHash() {
  return hash(Buffer.concat(await Promise.all(sourcePaths().sort().map(async (p) => Buffer.concat([Buffer.from(`${p}\0`), await readFile(resolve(root, p)).catch((error) => { if (error.code === 'ENOENT') return Buffer.from('\0MISSING\0'); throw error })])))))
}
const auditModuleHashes = async () => Object.fromEntries(await Promise.all(['coverage.mjs', 'coverage-selftest.mjs', 'registry.mjs', 'schema-probe.mjs', 'public-guard.mjs'].map(async (path) => [path, hash(await readFile(resolve(root, 'scripts/audit', path)))])))
const report = {
  startedAt: new Date().toISOString(), branch: git('branch', '--show-current'), head: git('rev-parse', 'HEAD'),
  scriptSha256: hash(await readFile(fileURLToPath(import.meta.url))),
  auditModuleHashes: await auditModuleHashes(),
  initialStatus: git('status', '--porcelain=v1', '--untracked-files=all'), sourceHashBefore: await sourceHash(),
  acceptedExceptions: ['Deployment provenance is recorded but not treated as a defect.', 'Missing README AI correction examples are accepted.', 'Numeric cents entry and decimal paste restrictions are accepted.'],
  checks: [], limits: ['Chromium only; no Safari, physical mobile keyboard, or screen-reader speech verification.', 'Contrast checks sample actual rendered text and solid backgrounds; gradients, opacity, and platform controls require visual review.', 'First-paint theme is inspected through navigation and screenshots, not a filmstrip or hardware display.', 'npm build regenerates ignored dist artifacts; product source and provided mocks/tokens must remain byte-identical.', 'Invitation email submission and deadline are not accessible to this script.'],
}
let browser
let server
let baseUrl
let page
let context
let observations
let publicStage = false
let publicEvidence
let navigationHtml
async function check(name, ids, fn) {
  console.log(`START ${name}`)
  try {
    const evidence = await fn()
    if (publicStage) assert.deepEqual(publicEvidence?.loopbackAttempts ?? [], [], 'Public request attempted loopback access')
    report.checks.push({name, ids, status: 'pass', evidence})
    console.log(`PASS ${name}`)
    return true
  } catch (error) {
    const screenshot = `${report.checks.length}-failure.png`
    await page?.screenshot({path: resolve(output, screenshot), fullPage: true}).catch(() => {})
    const status = error.code === 'AUDIT_ENV_UNVERIFIED' ? 'unverified' : 'fail'
    report.checks.push({name, ids, status, error: String(error.stack ?? error), screenshot})
    console.log(`${status.toUpperCase()} ${name}: ${error.message}`)
    return false
  }
}
async function command(name, args) {
  const child = spawn('npm', args, {cwd: root, stdio: ['ignore', 'pipe', 'pipe']})
  let log = ''
  child.stdout.on('data', (data) => { log += data; if (process.env.AUDIT_VERBOSE === '1') process.stdout.write(data) })
  child.stderr.on('data', (data) => { log += data; if (process.env.AUDIT_VERBOSE === '1') process.stderr.write(data) })
  const code = await new Promise((accept, reject) => { child.on('error', reject); child.on('exit', accept) })
  await writeFile(resolve(output, `${name}.log`), log)
  assert.equal(code, 0, `${name} failed; see ${name}.log`)
  return {log: `${name}.log`, tail: log.slice(-900)}
}
async function fresh({width = 1280, theme, segment, scenario, fault, delay, url = baseUrl, system = 'light'} = {}) {
  await context?.close()
  context = await browser.newContext({viewport: {width, height: 900}, colorScheme: system, reducedMotion: 'reduce'})
  if (theme || segment || scenario || fault || delay) await context.addInitScript(({theme, segment, scenario, fault, delay}) => {
    if (!sessionStorage.getItem('__auditSeeded')) {
      if (theme) localStorage.setItem('meridian-theme', theme)
      if (segment) localStorage.setItem('meridian-segment', segment)
      sessionStorage.setItem('__auditSeeded', 'true')
    }
    if (scenario || fault || delay) {
      const original = window.fetch.bind(window)
      window.fetch = (input, init) => {
        const url = new URL(input instanceof Request ? input.url : input, location.href)
        if (scenario && url.pathname === `/api/${scenario.list ?? 'transactions'}`) url.searchParams.set('scenario', scenario.value)
        if (delay && url.pathname.startsWith('/api/')) url.searchParams.set('delay', String(delay))
        if (fault && url.pathname === `/api/${fault.endpoint}` && (!fault.afterPost || window.__auditPosted)) {
          return Promise.resolve(new Response(JSON.stringify(fault.body), {status: fault.status, headers: {'Content-Type': 'application/json'}}))
        }
        if (url.pathname === '/api/transfers') window.__auditPosted = true
        return original(input instanceof Request ? new Request(url, input) : url, init)
      }
      window.__auditRestoreFetch = () => { window.fetch = original }
    }
  }, {theme, segment, scenario, fault, delay})
  if (publicStage) {
    publicEvidence = {url, requests: [], loopbackAttempts: []}
    report.public.runs.push(publicEvidence)
    await rejectLoopbackRequests(context, publicEvidence)
  }
  page = await context.newPage()
  page.setDefaultTimeout(6000)
  observations = {posts: [], gets: [], responses: [], consoleErrors: [], pageErrors: []}
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/api/transfers')) observations.posts.push(request.postDataJSON())
    if (request.method() === 'GET' && new URL(request.url()).pathname.startsWith('/api/')) observations.gets.push({url: request.url(), at: Date.now()})
  })
  page.on('response', async (response) => {
    if (new URL(response.url()).pathname.includes('/api/')) observations.responses.push({url: response.url(), status: response.status(), serviceWorker: response.fromServiceWorker(), at: Date.now()})
    if (response.status() === 201 && new URL(response.url()).pathname === '/api/transfers') observations.transfer = await response.json().catch(() => null)
  })
  page.on('console', (message) => { if (message.type() === 'error') observations.consoleErrors.push(message.text()) })
  page.on('pageerror', (error) => observations.pageErrors.push(error.message))
  const navigation = await page.goto(url)
  navigationHtml = await navigation?.text()
  observations.navigation = {url: navigation?.url(), status: navigation?.status()}
  return page
}
const button = (name) => page.getByRole('button', {name, exact: true})
const field = (name) => page.getByLabel(name, {exact: true})
async function loaded() { await page.waitForFunction(() => document.querySelector('[aria-haspopup="dialog"]')?.getAttribute('aria-disabled') === 'false') }
async function open() { await loaded(); await button('New transfer').click(); await page.getByRole('radio', {name: /Jamie Tan/}).waitFor() }
async function amount(value, account) {
  await open()
  await page.getByRole('radio', {name: /Jamie Tan/}).check()
  await button('Continue').click()
  if (account) await field('From account').selectOption(account)
  await field('Amount').fill(String(Math.round(Number(value) * 100)))
}
async function review(value = '120', note = '') {
  await amount(value)
  if (note) await field('Note (optional)').fill(note)
  await button('Continue').click()
  await page.getByRole('heading', {name: 'Check the details', exact: true}).waitFor()
}
async function snapshot(name) { await page.screenshot({path: resolve(output, `${name}.png`), fullPage: true}); return `${name}.png` }
async function assertText(text) { await page.getByText(text, {exact: true}).first().waitFor() }
async function focusIs(id) { await page.waitForFunction((expected) => document.activeElement.id === expected, id) }
let money
let shortDate
async function dashboardMoney(value) { await page.getByText(money(value), {exact: true}).first().waitFor() }
async function geometry() {
  return page.evaluate(() => {
    const rect = (selector) => { const r = document.querySelector(selector).getBoundingClientRect(); return {x: r.x, y: r.y, width: r.width, height: r.height} }
    return {viewport: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth,
      main: rect('main'), cta: rect('[aria-haspopup="dialog"]'), dialog: document.querySelector('dialog') ? rect('dialog') : null,
      smallTargets: [...document.querySelectorAll('button,input,select,textarea,a[href]')].filter((e) => e.getClientRects().length && !e.disabled).map((e) => { const target = ['radio', 'checkbox'].includes(e.type) ? [...(e.labels ?? [])].find((label) => label.getClientRects().length) ?? e : e; const r = target.getBoundingClientRect(); return {text: target.textContent.trim() || e.getAttribute('aria-label') || e.id, width: r.width, height: r.height} }).filter((e) => e.height < 43.9 || e.width < 43.9)}
  })
}

async function textContrast() {
  return page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const ctx = canvas.getContext('2d', {willReadFrequently: true})
    const rgba = (color) => {
      ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = color; ctx.fillRect(0, 0, 1, 1)
      return [...ctx.getImageData(0, 0, 1, 1).data].map((n) => n / 255)
    }
    const luminance = (color) => color.slice(0, 3).map((c) => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4).reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0)
    const ratio = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05)
    const measured = [], skipped = []
    const scope = document.querySelector('dialog[open]') ?? document.body
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT)
    let node
    while ((node = walker.nextNode())) {
      const text = node.textContent.trim(), element = node.parentElement
      if (!text || !element || ['SCRIPT', 'STYLE', 'OPTION'].includes(element.tagName) || element.closest('[aria-hidden="true"],.sr-only,button:disabled')) continue
      const rect = element.getBoundingClientRect(), style = getComputedStyle(element)
      if (!rect.width || !rect.height || style.visibility !== 'visible' || style.display === 'none') continue
      let background, unsupported = false
      for (let ancestor = element; ancestor; ancestor = ancestor.parentElement) {
        const s = getComputedStyle(ancestor)
        if (Number(s.opacity) < 1 || s.backgroundImage !== 'none' || s.filter !== 'none') { unsupported = true; break }
        const color = rgba(s.backgroundColor)
        if (color[3] === 1) { background = color; break }
        if (color[3] > 0) { unsupported = true; break }
      }
      const foreground = rgba(style.color)
      if (unsupported || !background || foreground[3] < 1) { skipped.push({text: text.slice(0, 80), reason: 'gradient, opacity, or non-solid ancestor'}); continue }
      const minimum = parseFloat(style.fontSize) >= 24 || (parseFloat(style.fontSize) >= 18.66 && Number(style.fontWeight) >= 700) ? 3 : 4.5
      measured.push({text: text.slice(0, 80), color: style.color, background, ratio: ratio(foreground, background), minimum})
    }
    return {measured, skipped, failures: measured.filter((m) => m.ratio < m.minimum)}
  })
}
async function labels() {
  const controls = await page.locator('dialog input,dialog select,dialog textarea').evaluateAll((nodes) => nodes.map((e) => ({id: e.id, name: e.name, label: [...e.labels].map((l) => l.textContent.trim()).join(' '), ariaLabel: e.getAttribute('aria-label')})))
  assert.ok(controls.length > 0)
  assert.ok(controls.every((c) => c.label || c.ariaLabel), JSON.stringify(controls))
  return controls
}

async function stopServer() {
  const owned = server
  if (!owned || owned.exitCode !== null || owned.signalCode !== null) return
  console.log(`STOP owned preview pid=${owned.pid}`)
  await new Promise((accept) => {
    let escalation, deadline
    const done = () => { clearTimeout(escalation); clearTimeout(deadline); owned.removeListener('exit', done); accept() }
    owned.once('exit', done)
    owned.kill('SIGTERM')
    escalation = setTimeout(() => { if (owned.exitCode === null && owned.signalCode === null) owned.kill('SIGKILL') }, 3000)
    deadline = setTimeout(done, 6000)
  })
  assert.ok(owned.exitCode !== null || owned.signalCode !== null, 'Owned preview did not exit; public stage must not run')
}

try {
  report.sourceVersions = await Promise.all(Object.entries(sourceVersions).map(async ([path, expected]) => ({path, expected, actual: hash(await readFile(resolve(root, path)))})))
  report.sourceVersionsMatch = report.sourceVersions.every((entry) => entry.actual === entry.expected)
  await check('registry source versions', [], async () => { assert.ok(report.sourceVersionsMatch, 'Specification changed; registry requires clause review, not automatic hash refresh'); return report.sourceVersions })
  await check('actual bundled transfer schema boundaries', ['VALIDATION'], async () => {
    const {build} = await import('esbuild')
    await build({entryPoints: [resolve(root, 'src/lib/format.ts')], outfile: resolve(output, 'actual-format.mjs'), bundle: true, platform: 'node', format: 'esm'})
    const formatters = await import(pathToFileURL(resolve(output, 'actual-format.mjs')).href)
    money = formatters.formatMoney; shortDate = formatters.formatShortDate
    return {source: 'src/features/transfer/schema.ts', cases: await probeActualSchema(root, output)}
  })
  if (!money || !shortDate) throw new Error('Actual formatter bundle unavailable; refusing substitute formatting rules')
  await check('npm check', ['E1', 'E4', 'E5'], () => command('check', ['run', 'check']))
  const built = await check('production build', ['E5'], () => command('build', ['run', 'build']))
  if (!built) throw new Error('Browser checks unverified: current-source build failed; refusing to preview stale dist.')
  await check('original instructions and protected inputs', ['README', 'MOCK', 'TOKENS'], async () => {
    const initial = git('rev-list', '--max-parents=0', 'HEAD').split('\n')[0]
    assert.equal(hash(await readFile(resolve(root, 'README-bak.md'))), hash(execFileSync('git', ['show', `${initial}:README.md`], {cwd: root})))
    const paths = ['mock-api', 'src/mocks', 'brief/design-tokens.css']
    assert.equal(git('diff', initial, '--', ...paths), '')
    return {initial, paths, originalReadmeSha256: hash(await readFile(resolve(root, 'README-bak.md')))}
  })
  await check('README required sections, run command and actual suite count', ['README'], async () => {
    const readme = await readFile(resolve(root, 'README.md'), 'utf8')
    for (const section of ['Project structure', 'Decisions and trade-offs', 'Loading, empty and error states', 'Tests', 'AI use', 'Not done / known issues']) assert.ok(readme.includes(`## ${section}`), section)
    assert.ok(readme.includes('npm install && npm run dev'))
    const claimed = readme.match(/suite has (\d+) cases/)?.[1]
    const actual = (await readFile(resolve(output, 'check.log'), 'utf8')).match(/Tests\s+(\d+) passed/)?.[1]
    assert.ok(claimed && actual); assert.equal(claimed, actual)
    const sourceEvidence = ['src/api/banking.ts', 'src/features/transfer/schema.ts', 'src/features/transfer/hooks/useTransferForm.ts', 'src/features/theme/useTheme.ts', 'src/main.tsx']
    return {claimedCases: claimed, actualCases: actual, sourceEvidence, scope: 'Section presence and count checked automatically; architecture and known-issue accuracy require source review; accepted AI examples exception applies.'}
  })
  await check('repository is publicly readable without credentials', ['SUBMISSION'], async () => {
    const remote = git('remote', 'get-url', 'origin')
    const repo = remote.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/)?.[1]
    assert.ok(repo, 'Expected GitHub origin')
    const response = await fetch(`https://api.github.com/repos/${repo}`)
    assert.equal(response.status, 200)
    const metadata = await response.json(); assert.equal(metadata.private, false)
    return {url: metadata.html_url, visibility: metadata.visibility, note: 'Does not prove invitation-email submission or deadline compliance.'}
  })
  const moduleName = process.env.PLAYWRIGHT_MODULE ?? 'playwright'
  const moduleUrl = isAbsolute(moduleName) ? pathToFileURL(moduleName).href : moduleName
  const {chromium} = await import(moduleUrl)
  browser = await chromium.launch({headless: process.env.AUDIT_HEADLESS === '1', ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath: process.env.CHROMIUM_EXECUTABLE} : {})})
  report.browser = browser.version()
  const port = await new Promise((accept) => { const probe = createServer(); probe.listen(0, '127.0.0.1', () => { const {port} = probe.address(); probe.close(() => accept(port)) }) })
  baseUrl = `http://127.0.0.1:${port}`
  server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {cwd: root, stdio: ['ignore', 'pipe', 'pipe']})
  let serverLog = ''
  server.stdout.on('data', (data) => { serverLog += data })
  server.stderr.on('data', (data) => { serverLog += data })
  for (let i = 0; i < 100; i++) {
    if (await fetch(baseUrl).then((r) => r.ok).catch(() => false)) break
    if (server.exitCode !== null || server.signalCode !== null) throw new Error(`Preview stopped: ${serverLog}`)
    await new Promise((accept) => setTimeout(accept, 100))
  }
  assert.equal(await fetch(baseUrl).then((r) => r.text()), await readFile(resolve(root, 'dist/index.html'), 'utf8'))
  report.localUrl = baseUrl

  await check('dashboard loading layout stability and concurrent requests', ['D1'], async () => {
    await fresh({delay: 1500})
    await page.locator('[aria-busy="true"]').waitFor()
    const skeletonCount = await page.locator('main span[aria-hidden="true"]').evaluateAll((nodes) => nodes.filter((e) => getComputedStyle(e).backgroundImage !== 'none' && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().height > 0).length)
    assert.ok(skeletonCount >= 10, 'Visible gradient skeleton placeholders should exist')
    const sections = () => page.locator('main section,main aside').evaluateAll((nodes) => nodes.map((e) => { const r = e.getBoundingClientRect(); return {x: r.x, y: r.y, width: r.width, height: r.height} }))
    const before = await sections(); await snapshot('loading-skeletons'); await loaded(); const after = await sections()
    const differences = before.map((r, i) => ({index: i, maxDelta: Math.max(...Object.keys(r).map((k) => Math.abs(r[k] - after[i][k])))}))
    assert.ok(differences.every((r) => r.maxDelta < 2), JSON.stringify(differences))
    assert.equal(observations.responses.filter((r) => /\/api\/(customer|accounts|transactions)/.test(r.url)).length, 3)
    const starts = observations.gets.filter((r) => /\/api\/(customer|accounts|transactions)/.test(r.url)).map((r) => r.at)
    assert.equal(starts.length, 3)
    assert.ok(Math.max(...starts) < Math.min(...observations.responses.map((r) => r.at)), 'All three dashboard requests should start before the first response')
    return {before, after, differences, skeletonCount, requests: observations.responses, starts}
  })

  await check('dashboard seed, copy, ordering, search and real MSW', ['D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'E5'], async () => {
    await fresh(); await loaded()
    await assertText('Good evening, Ava'); await assertText('Across 2 deposit accounts'); await assertText('Amount due'); await assertText('AC')
    for (const value of [17120.55, 4280.55, 12840, -420.3]) await dashboardMoney(value)
    for (const text of ['Everyday Checking', 'Savings Plus', 'Rewards Card', '•••• 4821', '•••• 9930', '•••• 7712']) await assertText(text)
    const rows = page.getByRole('list', {name: 'Recent transactions'}).getByRole('listitem')
    assert.equal(await rows.count(), 8)
    const dates = await rows.locator('time').evaluateAll((nodes) => nodes.map((e) => e.dateTime))
    assert.deepEqual(dates, [...dates].sort((a, b) => Date.parse(b) - Date.parse(a)))
    assert.deepEqual(await rows.locator('time').allTextContents(), dates.map((d) => shortDate(new Date(d))))
    await assertText(`-${money(86.4)}`); await assertText(`+${money(45)}`)
    const colors = await page.evaluate(() => {
      const row = (name) => [...document.querySelectorAll('ul[aria-label="Recent transactions"] li')].find((e) => e.textContent.includes(name)).querySelector('strong')
      const token = (name) => { const e = document.createElement('span'); e.style.color = `var(${name})`; document.body.append(e); const c = getComputedStyle(e).color; e.remove(); return c }
      return {out: getComputedStyle(row('FairPrice Finest')).color, income: getComputedStyle(row('PayNow from Marcus Lee')).color, normal: token('--text'), positive: token('--positive')}
    })
    assert.equal(colors.out, colors.normal); assert.equal(colors.income, colors.positive)
    await assertText('Pending')
    await field('Search transactions').fill('GrOcErIeS'); await assertText('1 result found')
    await field('Search transactions').fill('no-such-transaction'); await assertText('No transactions match your search.')
    await button('Clear search').click(); await focusIs('transaction-search')
    assert.equal(observations.pageErrors.length, 0); assert.deepEqual(observations.consoleErrors, [])
    assert.ok(observations.responses.some((r) => r.url.endsWith('/api/transactions?limit=8') && r.serviceWorker))
    return {...observations, colors, screenshot: await snapshot('dashboard')}
  })

  await check('row-bound accounts and transactions', ['D3', 'D4', 'D5', 'FORMAT'], async () => {
    await fresh(); await loaded()
    const db = JSON.parse(await readFile(resolve(root, 'mock-api/db.json'), 'utf8'))
    const cards = page.getByRole('list', {name: 'Accounts', exact: true}).getByRole('listitem')
    assert.equal(await cards.count(), db.accounts.length)
    const evidence = {accounts: [], transactions: []}
    for (const account of db.accounts) {
      const card = cards.filter({has: page.getByRole('heading', {name: account.name, exact: true})})
      assert.equal(await card.count(), 1)
      await card.getByText(account.maskedNumber, {exact: true}).waitFor()
      assert.equal(await card.locator('strong').innerText(), money(account.balance))
      assert.equal(await card.getByText('Amount due', {exact: true}).count(), account.type === 'credit' ? 1 : 0)
      assert.ok((await card.locator('strong').evaluate((e) => getComputedStyle(e).fontVariantNumeric)).includes('tabular-nums'))
      evidence.accounts.push({id: account.id, text: await card.innerText()})
    }
    const rows = page.getByRole('list', {name: 'Recent transactions', exact: true}).getByRole('listitem')
    const expected = [...db.transactions].sort((a, b) => Date.parse(b.date) - Date.parse(a.date)).slice(0, 8)
    assert.equal(await rows.count(), expected.length)
    for (const [index, transaction] of expected.entries()) {
      const row = rows.nth(index)
      await row.getByText(transaction.description, {exact: true}).waitFor()
      await row.getByText(transaction.category, {exact: true}).waitFor()
      assert.equal(await row.locator('time').getAttribute('datetime'), transaction.date)
      assert.equal(await row.locator('time').innerText(), shortDate(transaction.date))
      assert.equal(await row.locator('strong').innerText(), `${transaction.direction === 'in' ? '+' : '-'}${money(transaction.amount)}`)
      assert.equal(await row.getByText('Pending', {exact: true}).count(), transaction.status === 'pending' ? 1 : 0)
      const colors = await row.locator('strong').evaluate((element, token) => {
        const sample = document.createElement('span'); sample.style.color = `var(${token})`; document.body.append(sample)
        const result = {actual: getComputedStyle(element).color, expected: getComputedStyle(sample).color}; sample.remove(); return result
      }, transaction.direction === 'in' ? '--positive' : '--text')
      assert.equal(colors.actual, colors.expected)
      evidence.transactions.push({id: transaction.id, text: await row.innerText(), colors})
    }
    assert.ok((await page.locator('[aria-labelledby="balance-title"] > p').evaluate((e) => getComputedStyle(e).fontVariantNumeric)).includes('tabular-nums'))
    await page.locator('[aria-labelledby="balance-title"]').getByText(money(17120.55), {exact: true}).waitFor()
    return evidence
  })
  await check('description and category search independently', ['D6'], async () => {
    await fresh(); await loaded()
    for (const query of ['fAiRpRiCe', 'GrOcErIeS']) {
      await field('Search transactions').fill(query)
      const rows = page.getByRole('list', {name: 'Recent transactions'}).getByRole('listitem')
      assert.equal(await rows.count(), 1); await rows.getByText('FairPrice Finest', {exact: true}).waitFor()
      await assertText('1 result found')
    }
    return {queries: ['fAiRpRiCe', 'GrOcErIeS']}
  })
  await check('payee API list and search', ['T2'], async () => {
    await fresh(); await open()
    const db = JSON.parse(await readFile(resolve(root, 'mock-api/db.json'), 'utf8'))
    const radios = page.getByRole('radio')
    assert.equal(await radios.count(), db.payees.length)
    for (const payee of db.payees) {
      const radio = page.getByRole('radio', {name: new RegExp(payee.name)})
      assert.equal(await radio.count(), 1)
      const label = page.locator('label').filter({has: radio})
      const text = await label.innerText()
      assert.ok(text.includes(payee.bank)); assert.ok(text.includes(`•••• ${payee.accountNumber.slice(-4)}`))
    }
    await field('Search payees').fill('mArCuS'); assert.equal(await radios.count(), 1)
    await page.getByRole('radio', {name: /Marcus Lee/}).check()
    assert.ok(observations.responses.some((r) => new URL(r.url).pathname === '/api/payees' && r.serviceWorker))
    return {payeeIds: db.payees.map((payee) => payee.id), responses: observations.responses}
  })
  await check('header, stepper and required transfer copy', ['D2', 'T1', 'T3', 'COPY'], async () => {
    await fresh(); await loaded()
    const header = page.getByRole('banner')
    await header.getByText('Meridian', {exact: true}).waitFor(); await header.getByText('M', {exact: true}).waitFor()
    await header.getByText('AC', {exact: true}).waitFor()
    for (const name of ['Cards', 'Payments', 'Insights']) assert.equal(await header.getByRole('button', {name, exact: true}).isDisabled(), true)
    await header.getByRole('button', {name: 'Retail', exact: true}).waitFor()
    await header.getByRole('button', {name: 'Premium', exact: true}).waitFor()
    await header.getByRole('button', {name: 'Switch to dark mode', exact: true}).waitFor()
    await assertText('Good evening, Ava'); await assertText('Total available'); await assertText('Across 2 deposit accounts')
    await page.getByRole('heading', {name: 'Recent transactions', exact: true}).waitFor()
    assert.equal(await field('Search transactions').getAttribute('placeholder'), 'Search transactions')
    await open()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('heading', {name: 'New transfer', exact: true}).waitFor()
    async function step(expected, title) {
      await dialog.getByRole('heading', {name: title, exact: true}).waitFor()
      const steps = dialog.getByRole('list', {name: 'Transfer progress'}).getByRole('listitem')
      assert.deepEqual(await steps.locator('span:last-child').allTextContents(), ['recipient', 'amount', 'review'])
      assert.equal(await steps.filter({hasText: expected}).getAttribute('aria-current'), 'step')
    }
    await step('recipient', 'Who are you sending to?')
    await page.getByRole('radio', {name: /Jamie Tan/}).check(); await button('Continue').click()
    await step('amount', 'How much?')
    const options = await field('From account').locator('option').evaluateAll((nodes) => nodes.filter((e) => e.value).map((e) => e.value))
    assert.deepEqual(options.sort(), ['acc_checking', 'acc_savings'])
    await assertText(`Available ${money(4280.55)}`); await assertText(`Remaining daily limit ${money(5000)}`)
    await field('From account').selectOption('acc_savings'); await assertText(`Available ${money(12840)}`)
    await button('50').click(); await button('Continue').click(); await step('review', 'Check the details')
    await button('Back').waitFor(); await button('Confirm transfer').waitFor()
    return {options, stepNames: ['Recipient', 'Amount', 'Review'], logo: 'M Meridian', disabledNavigation: ['Cards', 'Payments', 'Insights']}
  })
  await check('blur and Continue error associations', ['T8', 'VALIDATION'], async () => {
    const evidence = []
    async function linked(name, message) {
      const control = field(name)
      await page.getByText(message, {exact: true}).waitFor()
      assert.equal(await control.getAttribute('aria-invalid'), 'true')
      const ids = (await control.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean)
      assert.ok(ids.length)
      const descriptions = await Promise.all(ids.map((id) => page.locator(`[id="${id}"]`).innerText()))
      assert.ok(descriptions.includes(message), JSON.stringify({name, ids, descriptions}))
      evidence.push({name, message, ids})
    }
    await fresh(); await open()
    const choice = page.getByRole('radio', {name: /Jamie Tan/})
    await choice.focus(); await choice.press('Tab')
    const choiceError = page.locator('#transfer-recipientChoice-error')
    await choiceError.waitFor()
    const choiceMessage = await choiceError.innerText()
    assert.ok(choiceMessage.trim(), 'An invalid recipient choice must have a visible error')
    for (const event of ['blur', 'Continue']) {
      if (event === 'Continue') {
        await button('Continue').click()
        await page.waitForFunction(() => document.activeElement.name === 'recipientChoice')
      }
      assert.equal(await choice.getAttribute('aria-invalid'), 'true')
      const ids = (await choice.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean)
      assert.ok(ids.includes('transfer-recipientChoice-error'))
      assert.equal(await choiceError.innerText(), choiceMessage)
      evidence.push({name: 'recipientChoice', event, ids, message: choiceMessage})
    }
    await button('Send to someone new').click()
    const recipientCases = [
      {name: 'Recipient name', value: 'A', valid: 'Alex Lim', message: 'Enter a name between 2 and 50 characters.', id: 'transfer-recipientName'},
      {name: 'Account number (8 digits)', value: '123', valid: '12345678', message: 'Enter a valid 8-digit account number.', id: 'transfer-accountNumber'},
      {name: 'Bank', value: '', valid: 'DBS', message: 'Choose a bank.', id: 'transfer-bank'},
    ]
    for (const test of recipientCases) {
      if (test.name === 'Bank') { await field(test.name).focus() } else await field(test.name).fill(test.value)
      await field(test.name).press('Tab'); await linked(test.name, test.message)
      await button('Continue').click(); await focusIs(test.id); await linked(test.name, test.message)
      if (test.name === 'Bank') await field(test.name).selectOption(test.valid)
      else await field(test.name).fill(test.valid)
    }
    await button('Continue').click()
    const amountCases = [
      {value: '', message: 'Enter an amount of at least SGD 1.00 with no more than 2 decimal places.'},
      {value: '99', message: 'Enter an amount of at least SGD 1.00 with no more than 2 decimal places.'},
      {value: '428056', message: `Amount can't be more than your available balance (${money(4280.55)}).`},
      {value: '500001', account: 'acc_savings', message: `This transfer exceeds your remaining daily limit (${money(5000)}).`},
    ]
    for (const test of amountCases) {
      if (test.account) await field('From account').selectOption(test.account)
      await field('Amount').fill(test.value); await field('Amount').press('Tab'); await linked('Amount', test.message)
      await button('Continue').click(); await focusIs('transfer-amount'); await linked('Amount', test.message)
    }
    await button('50').click()
    await field('From account').selectOption(''); await field('From account').press('Tab'); await linked('From account', 'Choose a deposit account.')
    await button('Continue').click(); await focusIs('transfer-fromAccountId')
    await field('From account').selectOption('acc_checking')
    await field('Note (optional)').fill('n'.repeat(51)); await field('Note (optional)').press('Tab')
    await linked('Note (optional)', 'Keep your note to 50 characters or fewer.')
    await button('Continue').click(); await focusIs('transfer-note'); await linked('Note (optional)', 'Keep your note to 50 characters or fewer.')
    assert.equal(observations.posts.length, 0)
    return {associations: evidence, posts: observations.posts, rawThreeDecimals: 'Tested directly through actual schema; numeric cents UI cannot faithfully enter this raw value.'}
  })

  await check('native dialog keyboard, focus trap, Escape and opener restoration', ['T1', 'T2', 'T8'], async () => {
    await fresh(); await open()
    assert.equal(await page.evaluate(() => document.querySelector('dialog').contains(document.activeElement)), true)
    await field('Search payees').focus(); await page.keyboard.press('Tab')
    assert.equal(await page.evaluate(() => document.activeElement.type), 'radio')
    await page.keyboard.press('Space'); assert.equal(await page.getByRole('radio', {name: /Jamie Tan/}).isChecked(), true)
    await button('Continue').focus(); await page.keyboard.press('Tab')
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Close transfer')
    await page.keyboard.press('Shift+Tab'); assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Continue')
    await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({state: 'detached'})
    assert.equal(await page.evaluate(() => document.activeElement.textContent.trim().includes('New transfer')), true)
    await open(); await button('Close transfer').click()
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-haspopup')), 'dialog')
    return {screenshot: await snapshot('focus-restored')}
  })

  await check('new recipient blur, first invalid focus, error links and Back values', ['T2', 'T4', 'T8', 'V-name', 'V-account', 'V-bank', 'E3'], async () => {
    await fresh(); await open(); await button('Send to someone new').click()
    await field('Recipient name').fill('A'); await field('Recipient name').press('Tab')
    await assertText('Enter a name between 2 and 50 characters.')
    await button('Continue').click(); await focusIs('transfer-recipientName')
    await field('Recipient name').fill('Alex Lim'); await field('Account number (8 digits)').fill('123')
    await button('Continue').click(); await focusIs('transfer-accountNumber')
    assert.ok((await field('Account number (8 digits)').getAttribute('aria-describedby')).includes('transfer-accountNumber-error'))
    await assertText('Enter a valid 8-digit account number.')
    await field('Account number (8 digits)').fill('12345678'); await button('Continue').click(); await focusIs('transfer-bank')
    await field('Bank').selectOption('OCBC'); await button('Continue').click()
    await button('100').click(); await field('Note (optional)').fill('Dinner'); await button('Continue').click()
    await assertText('Check the details'); await page.locator('dd').filter({hasText: 'Alex Lim'}).waitFor(); await assertText('OCBC · •••• 5678')
    await dashboardMoney(0); await button('Back').click()
    assert.equal(await field('Amount').inputValue(), '100.00'); assert.equal(await field('Note (optional)').inputValue(), 'Dinner')
    await button('Back').click(); assert.equal(await field('Recipient name').inputValue(), 'Alex Lim')
    await snapshot('new-recipient'); await button('Continue').click(); await button('Continue').click(); await button('Confirm transfer').click()
    await assertText('Transfer sent')
    assert.deepEqual(observations.posts[0], {fromAccountId: 'acc_checking', amount: 100, note: 'Dinner', recipient: {name: 'Alex Lim', accountNumber: '12345678', bank: 'OCBC'}})
    return {posts: observations.posts, screenshot: await snapshot('new-recipient-success')}
  })

  for (const test of [{value: '0.99', error: 'Enter an amount of at least SGD 1.00 with no more than 2 decimal places.'},
    {value: '4280.56', error: `Amount can't be more than your available balance (${money(4280.55)}).`},
    {value: '5000.01', account: 'acc_savings', error: `This transfer exceeds your remaining daily limit (${money(5000)}).`}]) {
    await check(`amount boundary ${test.value}`, ['T3', 'V-amount', 'V-balance', 'V-limit', 'E4'], async () => {
      await fresh(); await amount(test.value, test.account); await field('Amount').press('Tab'); await assertText(test.error)
      await button('Continue').click(); await focusIs('transfer-amount')
      assert.equal(observations.posts.length, 0)
      return {posts: observations.posts, error: test.error}
    })
  }
  await check('note boundary and all quick amounts', ['T3', 'V-note'], async () => {
    await fresh(); await amount('1')
    for (const quick of [50, 100, 250, 500]) { await button(String(quick)).click(); assert.equal(await field('Amount').inputValue(), quick.toFixed(2)) }
    await field('Note (optional)').fill('n'.repeat(51)); await field('Note (optional)').press('Tab')
    await assertText('Keep your note to 50 characters or fewer.'); await assertText('51/50')
    await button('Continue').click(); await focusIs('transfer-note')
    await field('Note (optional)').fill('n'.repeat(50)); await button('Continue').click(); await assertText('Check the details')
    return {posts: observations.posts}
  })

  await check('successful transfer, duplicate protection and three refreshed resources', ['T3', 'T4', 'T5', 'T6', 'E2', 'E4', 'E5'], async () => {
    await fresh(); await review('120', 'Dinner')
    const summary = await page.locator('dialog dl').innerText()
    for (const text of ['Everyday Checking', '•••• 4821', 'Jamie Tan', 'DBS', '•••• 3391', money(120), money(0), 'Dinner', 'Total']) assert.ok(summary.includes(text), text)
    const lines = await page.locator('dialog dl > div').evaluateAll((nodes) => Object.fromEntries(nodes.map((e) => [e.querySelector('dt').textContent.trim(), e.querySelector('dd').textContent.trim().replace(/\s+/g, ' ')])))
    for (const [key, value] of Object.entries({Amount: money(120), Fee: money(0), Total: money(120), Note: 'Dinner'})) assert.equal(lines[key], value.replace(/\s+/g, ' '), key)
    await button('Confirm transfer').dblclick(); await button('Sending…').waitFor()
    assert.equal(await button('Sending…').isDisabled(), true)
    await assertText('Transfer sent'); await page.getByText(/^TRF-/).waitFor()
    assert.equal(observations.posts.length, 1); assert.equal(observations.posts[0].amount, 120)
    assert.equal(observations.posts[0].payeeId, 'pay_001'); assert.equal(observations.posts[0].recipient, undefined)
    assert.ok(observations.transfer?.transfer?.reference)
    await assertText(observations.transfer.transfer.reference)
    await dashboardMoney(observations.transfer.transfer.amount)
    assert.ok((await page.getByRole('dialog').innerText()).includes('to Jamie Tan · DBS · •••• 3391'))
    assert.equal(await page.getByRole('heading', {name: 'Transfer sent'}).getAttribute('aria-live'), 'polite')
    await assertText('The money should arrive within minutes.')
    await snapshot('success'); await button('Back to dashboard').click()
    for (const value of [17000.55, 4160.55, 4880]) await dashboardMoney(value)
    await assertText('Transfer to Jamie Tan')
    assert.deepEqual(observations.consoleErrors, []); assert.deepEqual(observations.pageErrors, [])
    return {...observations, screenshot: await snapshot('updated-dashboard')}
  })

  await check('payment failure keeps review, preserves data and safely retries', ['T7', 'T8'], async () => {
    await fresh(); await review('50', '#fail')
    const beforeFailure = await page.locator('dialog dl').innerText()
    await button('Confirm transfer').click()
    await page.getByRole('alert').getByText("Something went wrong. Your money hasn't left your account. Try again.", {exact: true}).waitFor()
    await assertText('Check the details'); assert.equal(await page.getByText('Transfer sent', {exact: true}).count(), 0)
    assert.equal(await page.locator('dialog dl').innerText(), beforeFailure)
    assert.equal(await button('Confirm transfer').isEnabled(), true)
    await button('Confirm transfer').click()
    await button('Sending…').waitFor()
    await button('Confirm transfer').waitFor()
    await page.getByRole('alert').getByText("Something went wrong. Your money hasn't left your account. Try again.", {exact: true}).waitFor()
    assert.equal(await button('Confirm transfer').isEnabled(), true)
    assert.equal(await page.locator('dialog dl').innerText(), beforeFailure)
    assert.equal(observations.posts.length, 2)
    await snapshot('payment-failure'); await button('Back').click()
    assert.equal(await field('Amount').inputValue(), '50.00'); assert.equal(await field('Note (optional)').inputValue(), '#fail')
    await field('Note (optional)').fill('Lunch'); await button('Continue').click(); await button('Confirm transfer').click()
    await assertText('Transfer sent'); await button('Back to dashboard').click(); await dashboardMoney(17070.55)
    assert.equal(observations.posts.length, 3)
    return {...observations, beforeFailure, directReviewRetryVerified: true}
  })

  await check('dashboard GET error and Retry recovery using documented hook', ['D7', 'E4', 'README'], async () => {
    await fresh({scenario: {value: 'error'}}); await assertText("We couldn't load your dashboard.")
    await snapshot('dashboard-error'); await page.evaluate(() => window.__auditRestoreFetch()); await button('Retry').click()
    await loaded(); await dashboardMoney(17120.55)
    return observations
  })
  await check('README developer-console empty-state recipe after 30s stale and tab return', ['README'], async () => {
    await fresh(); await loaded()
    const readme = await readFile(resolve(root, 'README.md'), 'utf8')
    const recipe = readme.match(/```js\n([\s\S]*?)```/)?.[1]
    assert.ok(recipe?.includes('window.fetch ='))
    await page.evaluate((code) => { window.__auditReadmeOriginalFetch = window.fetch; new Function(code)() }, recipe)
    const other = await context.newPage(); await other.goto('about:blank'); await other.bringToFront()
    if (await page.evaluate(() => document.visibilityState) !== 'hidden') {
      await other.close()
      const error = new Error('Headless tab switching did not change document.visibilityState; real visibility-triggered refetch cannot be verified in this browser.')
      error.code = 'AUDIT_ENV_UNVERIFIED'
      throw error
    }
    await new Promise((accept) => setTimeout(accept, 31_000)); await page.bringToFront()
    await assertText('No recent transactions.')
    await other.close()
    await page.evaluate(() => { window.fetch = window.__auditReadmeOriginalFetch })
    return {recipeSha256: hash(recipe), requests: observations.responses, screenshot: await snapshot('readme-empty-demo')}
  })
  await check('empty transactions and empty payees allow new recipient', ['D6', 'T2'], async () => {
    await fresh({scenario: {value: 'empty'}}); await loaded(); await assertText('No recent transactions.')
    await snapshot('empty-transactions')
    await fresh({scenario: {list: 'payees', value: 'empty'}}); await loaded(); await button('New transfer').click()
    await assertText('No saved recipients. Send to someone new to get started.')
    await button('Send to someone new').click(); await field('Recipient name').waitFor()
    return {screenshot: await snapshot('empty-payees')}
  })

  await check('API field rejection remains review and is associated after Back', ['T7', 'T8'], async () => {
    await fresh({fault: {endpoint: 'transfers', status: 422, body: {error: {code: 'INSUFFICIENT_FUNDS', message: 'Balance changed. Review your amount.', fields: {amount: 'Only SGD 10.00 is available now.'}}}}})
    await review('50'); await button('Confirm transfer').click(); await page.getByRole('alert').getByText('Balance changed. Review your amount.').waitFor()
    await assertText('Check the details'); await button('Back').click()
    assert.equal(await field('Amount').getAttribute('aria-invalid'), 'true')
    assert.ok((await field('Amount').getAttribute('aria-describedby')).includes('transfer-amount-error'))
    await assertText('Only SGD 10.00 is available now.')
    return {boundary: 'audit-only fetch response override; production handlers unchanged', screenshot: await snapshot('api-field-error')}
  })
  await check('successful payment with failed refresh can Retry without another POST', ['T5', 'T6', 'T7', 'E2'], async () => {
    await fresh({fault: {endpoint: 'accounts', afterPost: true, status: 500, body: {error: {code: 'INTERNAL_ERROR', message: 'Refresh unavailable'}}}})
    await review('50'); await button('Confirm transfer').click(); await assertText('Transfer sent'); await button('Back to dashboard').click()
    await assertText("We couldn't load your dashboard."); assert.equal(observations.posts.length, 1)
    await page.evaluate(() => window.__auditRestoreFetch()); await button('Retry').click(); await loaded(); await dashboardMoney(17070.55)
    assert.equal(observations.posts.length, 1)
    return observations
  })
  await check('closing pending transfer prevents reopening until settlement', ['T1', 'T5', 'T6'], async () => {
    await fresh({delay: 1500}); await review('50'); await button('Confirm transfer').click(); await button('Sending…').waitFor()
    await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({state: 'detached'})
    assert.equal(await button('New transfer').getAttribute('aria-disabled'), 'true')
    const target = await button('New transfer').boundingBox()
    await page.mouse.click(target.x + target.width / 2, target.y + target.height / 2)
    assert.equal(await page.getByRole('dialog').count(), 0)
    await loaded(); await dashboardMoney(17070.55)
    assert.equal(observations.posts.length, 1)
    return observations
  })

  for (const width of [360, 390, 640, 1024, 1280, 1440]) await check(`layout ${width}px`, ['D8', 'T1', 'LAYOUT'], async () => {
    await fresh({width}); await loaded()
    const dashboard = await geometry()
    const metrics = await page.evaluate(() => {
      const main = document.querySelector('main'), grid = main.querySelector('[aria-busy]'), rail = grid.querySelector('aside')
      const style = getComputedStyle(main), gridStyle = getComputedStyle(grid)
      const cards = [...document.querySelectorAll('[aria-labelledby="balance-title"],ul[aria-label="Accounts"] > li,aside')]
      return {mainX: main.getBoundingClientRect().x, outerWidth: main.getBoundingClientRect().width,
        contentWidth: main.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
        paddingLeft: parseFloat(style.paddingLeft), paddingRight: parseFloat(style.paddingRight),
        columns: gridStyle.gridTemplateColumns, gap: parseFloat(gridStyle.columnGap), railWidth: rail.getBoundingClientRect().width,
        gridX: grid.getBoundingClientRect().x, gridWidth: grid.getBoundingClientRect().width, railX: rail.getBoundingClientRect().x,
        font: getComputedStyle(document.body).fontFamily, tokenFont: getComputedStyle(document.documentElement).getPropertyValue('--font-sans').trim(),
        cards: cards.map((card) => ({padding: ['Top', 'Right', 'Bottom', 'Left'].map((side) => parseFloat(getComputedStyle(card)[`padding${side}`]))}))}
    })
    const gutter = width < 640 ? 16 : 24
    assert.equal(metrics.paddingLeft, gutter); assert.equal(metrics.paddingRight, gutter)
    assert.ok(metrics.contentWidth <= 1200)
    assert.equal(metrics.mainX, Math.max(0, (width - 1248) / 2))
    assert.equal(metrics.contentWidth, Math.min(width - 2 * gutter, 1200))
    if (width >= 1024) { assert.equal(metrics.railWidth, 300); assert.equal(metrics.gap, 24); assert.ok(metrics.railX > metrics.gridX) }
    else { assert.equal(metrics.railX, metrics.gridX); assert.equal(metrics.railWidth, metrics.gridWidth) }
    assert.ok(metrics.cards.length >= 5)
    assert.ok(metrics.cards.every((card) => card.padding.every((padding) => padding >= 16 && padding <= 24)), JSON.stringify(metrics.cards))
    const normaliseFont = (stack) => stack.split(',').map((family) => family.replaceAll('"', '').replaceAll(/\s/g, '').toLowerCase())
    const tokenFamilies = normaliseFont(metrics.tokenFont)
    assert.deepEqual(normaliseFont(metrics.font).slice(0, tokenFamilies.length), tokenFamilies, 'System font token stack must take priority over trailing fallbacks')
    dashboard.metrics = metrics
    assert.equal(dashboard.scrollWidth, width, 'Page must not scroll sideways')
    assert.deepEqual(dashboard.smallTargets, [])
    if (width < 640) {
      assert.equal(dashboard.cta.x, 16); assert.equal(dashboard.cta.width, width - 32)
      assert.equal(await page.locator('[aria-haspopup="dialog"]').evaluate((e) => getComputedStyle(e.parentElement).position), 'fixed')
      const bottom = await page.locator('[aria-haspopup="dialog"]').evaluate((e) => ({actual: e.parentElement.getBoundingClientRect().bottom, expected: innerHeight}))
      assert.ok(Math.abs(bottom.actual - bottom.expected) < 1, JSON.stringify(bottom))
      dashboard.ctaContainerBottom = bottom
    }
    await snapshot(`dashboard-${width}`); await open()
    const recipient = await geometry()
    assert.deepEqual(recipient.smallTargets, [])
    if (width < 1024) { assert.equal(recipient.dialog.width, width); assert.equal(recipient.dialog.height, 900); assert.equal(recipient.dialog.x, 0); assert.equal(recipient.dialog.y, 0) }
    else { assert.equal(recipient.dialog.width, 520); assert.ok(Math.abs(recipient.dialog.x - (width - 520) / 2) < 1); assert.ok(Math.abs(recipient.dialog.y + recipient.dialog.height / 2 - recipient.height / 2) < 1) }
    await page.getByRole('radio', {name: /Jamie Tan/}).check(); await button('Continue').click()
    const amountView = await geometry(); assert.deepEqual(amountView.smallTargets, [])
    await button('100').click(); await button('Continue').click()
    const reviewView = await geometry(); assert.deepEqual(reviewView.smallTargets, [])
    const screenshot = await snapshot(`review-${width}`)
    await button('Confirm transfer').click(); await assertText('Transfer sent')
    const successView = await geometry(); assert.deepEqual(successView.smallTargets, [])
    await snapshot(`success-${width}`); await button('Back to dashboard').click(); await dashboardMoney(17020.55)
    return {dashboard, recipient, amountView, reviewView, successView, screenshot}
  })

  for (const theme of ['light', 'dark']) for (const segment of ['retail', 'premium']) await check(`theme ${theme}/${segment}`, ['TH1', 'TH2', 'TH3'], async () => {
    await fresh({theme, segment}); await loaded()
    const prefs = await page.evaluate(() => ({theme: document.documentElement.dataset.theme, segment: document.documentElement.dataset.segment,
      brand: getComputedStyle(document.documentElement).getPropertyValue('--brand').trim(), color: getComputedStyle(document.body).color}))
    assert.equal(prefs.theme, theme); assert.equal(prefs.segment, segment)
    await button(segment === 'retail' ? 'Premium' : 'Retail').click()
    const switched = await page.evaluate(() => ({brand: getComputedStyle(document.documentElement).getPropertyValue('--brand').trim(), color: getComputedStyle(document.body).color}))
    assert.notEqual(switched.brand, prefs.brand); assert.equal(switched.color, prefs.color)
    await button(`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`).click()
    const immediate = await page.evaluate(() => ({theme: document.documentElement.dataset.theme, segment: document.documentElement.dataset.segment, color: getComputedStyle(document.body).color}))
    assert.equal(immediate.theme, theme === 'light' ? 'dark' : 'light')
    assert.equal(immediate.segment, segment === 'retail' ? 'premium' : 'retail')
    assert.notEqual(immediate.color, prefs.color, 'Theme colours must change before reloading')
    await page.reload(); await loaded()
    assert.deepEqual(await page.evaluate(() => ({theme: document.documentElement.dataset.theme, segment: document.documentElement.dataset.segment})),
      {theme: theme === 'light' ? 'dark' : 'light', segment: segment === 'retail' ? 'premium' : 'retail'})
    await fresh({theme, segment}); await loaded()
    const dashboardContrast = await textContrast(); assert.deepEqual(dashboardContrast.failures, [])
    await open()
    await button('Send to someone new').click(); await button('Continue').click()
    const recipientLabels = await labels()
    const focused = await page.evaluate(() => ({id: document.activeElement.id, outline: getComputedStyle(document.activeElement).outlineStyle, outlineWidth: getComputedStyle(document.activeElement).outlineWidth}))
    assert.equal(focused.id, 'transfer-recipientName'); assert.notEqual(focused.outline, 'none'); assert.notEqual(focused.outlineWidth, '0px')
    const contrast = await textContrast()
    assert.ok(contrast.measured.length > 10)
    assert.deepEqual(contrast.failures, [])
    await snapshot(`theme-${theme}-${segment}`)
    await field('Recipient name').fill('Alex Lim'); await field('Account number (8 digits)').fill('12345678'); await field('Bank').selectOption('DBS'); await button('Continue').click()
    const amountLabels = await labels()
    await button('Continue').click(); await focusIs('transfer-amount')
    const amountContrast = await textContrast(); assert.deepEqual(amountContrast.failures, [])
    await button('50').click(); await button('Continue').click()
    const reviewContrast = await textContrast(); assert.deepEqual(reviewContrast.failures, [])
    await button('Confirm transfer').click(); await assertText('Transfer sent')
    const successContrast = await textContrast(); assert.deepEqual(successContrast.failures, [])
    return {prefs, switched, immediate, focused, recipientLabels, amountLabels, dashboardContrast, contrast, amountContrast, reviewContrast, successContrast, screenshot: await snapshot(`success-${theme}-${segment}`)}
  })
  await check('search placeholder contrast in all four combinations', ['TH3'], async () => {
    const child = spawn(process.execPath, ['scripts/verify-placeholder-contrast.mjs'], {cwd: root, env: {...process.env, URL: baseUrl, OUTPUT_PATH: resolve(output, 'placeholder-contrast.json')}, stdio: ['ignore', 'pipe', 'pipe']})
    let log = ''
    child.stdout.on('data', (data) => { log += data }); child.stderr.on('data', (data) => { log += data })
    const code = await new Promise((accept, reject) => { child.on('error', reject); child.on('exit', accept) })
    await writeFile(resolve(output, 'placeholder-contrast.log'), log)
    assert.equal(code, 0, log)
    const evidence = JSON.parse(await readFile(resolve(output, 'placeholder-contrast.json'), 'utf8'))
    assert.equal(evidence.results.length, 8); assert.ok(evidence.results.every((r) => r.pass))
    return {artifact: 'placeholder-contrast.json', ratios: evidence.results.map((r) => ({theme: r.theme, segment: r.segment, label: r.label, contrast: r.contrast}))}
  })
  await check('first visit follows system dark mode', ['TH1'], async () => {
    await fresh({system: 'dark'}); await loaded(); assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark')
    return {screenshot: await snapshot('system-dark')}
  })

  await context?.close(); context = undefined; page = undefined
  const stopped = await check('owned local preview stopped before public checks', [], async () => {
    await stopServer()
    assert.equal(await fetch(baseUrl, {signal: AbortSignal.timeout(2000)}).then(() => true).catch(() => false), false, 'Local preview is still reachable')
    return {pid: server.pid, exitCode: server.exitCode, signalCode: server.signalCode, localUrlUnreachable: true}
  })
  if (!stopped) throw new Error('Public checks unverified: owned local preview could not be confirmed stopped')
  report.public = {url: process.env.AUDIT_PUBLIC_URL ?? 'https://dbs-assessment.jieshenghow.com/', scope: 'Only normal transfer, #fail recovery, and one 390px dark/premium theme sample; not the complete local matrix.', runs: []}
  publicStage = true
  const publicUrl = report.public.url
  await check('public normal transfer without local preview', ['E6'], async () => {
    await fresh({url: publicUrl})
    const publicHtml = navigationHtml
    assert.equal(typeof publicHtml, 'string'); assert.ok(observations.navigation.status < 400)
    report.public.sameHtmlAsLocalBuild = publicHtml === await readFile(resolve(root, 'dist/index.html'), 'utf8')
    report.public.publicEntry = publicHtml.match(/src="([^"]+\.js)"/)?.[1]
    await page.getByRole('heading').first().waitFor()
    await writeFile(resolve(output, 'public-page.html'), await page.content()); await snapshot('public-page')
    report.public.starterDetected = await page.getByRole('heading', {name: 'Build the dashboard and transfer flow', exact: true}).count() > 0
    if (report.public.starterDetected) await page.getByText('Mock API: connected', {exact: false}).waitFor({timeout: 6000}).catch(() => {})
    report.public.backendConnectedObserved = (await page.locator('body').innerText()).includes('Mock API: connected')
    await writeFile(resolve(output, 'public-page.html'), await page.content()); await snapshot('public-page')
    assert.equal(report.public.starterDetected, false, 'Public URL serves original starter; see public-page.html and public-page.png, including backend connection observation')
    await loaded(); await review('50', 'Audit')
    await button('Confirm transfer').click(); await assertText('Transfer sent'); await button('Back to dashboard').click()
    await dashboardMoney(17070.55); await assertText('Transfer to Jamie Tan'); await dashboardMoney(4950)
    assert.ok(observations.responses.some((r) => r.url.includes('/api/transfers') && r.serviceWorker && r.status === 201))
    assert.deepEqual(publicEvidence.loopbackAttempts, [])
    assert.deepEqual(observations.consoleErrors, []); assert.deepEqual(observations.pageErrors, [])
    return {...observations, requests: publicEvidence, screenshot: await snapshot('public-success')}
  })
  await check('public failure and recovery without local preview', ['E6'], async () => {
    await fresh({url: publicUrl}); await review('50', '#fail'); await button('Confirm transfer').click()
    await page.getByRole('alert').getByText("Something went wrong. Your money hasn't left your account. Try again.", {exact: true}).waitFor()
    await assertText('Check the details'); assert.equal(await page.getByText('Transfer sent', {exact: true}).count(), 0)
    await button('Back').click(); assert.equal(await field('Amount').inputValue(), '50.00'); assert.equal(await field('Note (optional)').inputValue(), '#fail')
    await field('Note (optional)').fill('Recovered'); await button('Continue').click(); await button('Confirm transfer').click()
    await assertText('Transfer sent'); await button('Back to dashboard').click(); await dashboardMoney(17070.55)
    assert.equal(observations.posts.length, 2); assert.deepEqual(publicEvidence.loopbackAttempts, [])
    return {...observations, requests: publicEvidence, screenshot: await snapshot('public-recovery')}
  })
  await check('public mobile theme without local preview', ['E6'], async () => {
    await fresh({url: publicUrl, width: 390, theme: 'dark', segment: 'premium'}); await loaded()
    assert.deepEqual(await page.locator('html').evaluate((html) => ({theme: html.dataset.theme, segment: html.dataset.segment})), {theme: 'dark', segment: 'premium'})
    assert.equal((await geometry()).scrollWidth, 390)
    await button('Retail').click(); await button('Switch to light mode').click(); await page.reload(); await loaded()
    assert.deepEqual(await page.locator('html').evaluate((html) => ({theme: html.dataset.theme, segment: html.dataset.segment})), {theme: 'light', segment: 'retail'})
    await open(); const sheet = await geometry(); assert.equal(sheet.dialog.width, 390); assert.equal(sheet.dialog.height, 900)
    assert.deepEqual(publicEvidence.loopbackAttempts, []); assert.deepEqual(observations.pageErrors, [])
    return {sheet, requests: publicEvidence, screenshot: await snapshot('public-mobile-theme')}
  })


} catch (error) {
  report.checks.push({name: 'audit infrastructure', ids: [], status: 'unverified', error: String(error.stack ?? error)})
} finally {
  await context?.close().catch(() => {})
  await browser?.close().catch(() => {})
  await stopServer().catch((error) => report.checks.push({name: 'owned preview cleanup', ids: [], status: 'unverified', error: String(error)}))
  if (report.public?.runs.some((run) => run.loopbackAttempts.length)) report.checks.push({name: 'public loopback request rejection', ids: ['E6'], status: 'fail', evidence: report.public.runs.map((run) => run.loopbackAttempts)})
  report.sourceHashAfter = await sourceHash()
  report.finalScriptSha256 = hash(await readFile(fileURLToPath(import.meta.url)))
  report.finalAuditModuleHashes = await auditModuleHashes()
  report.scriptUnchanged = report.scriptSha256 === report.finalScriptSha256 && JSON.stringify(report.auditModuleHashes) === JSON.stringify(report.finalAuditModuleHashes)
  report.finalHead = git('rev-parse', 'HEAD')
  report.finalStatus = git('status', '--porcelain=v1', '--untracked-files=all')
  report.sourceUnchanged = report.sourceHashBefore === report.sourceHashAfter && report.head === report.finalHead
  report.finishedAt = new Date().toISOString()
  report.sourceVersionsAfter = await Promise.all(Object.entries(sourceVersions).map(async ([path, expected]) => ({path, expected, actual: hash(await readFile(resolve(root, path)))})))
  report.sourceVersionsMatch = report.sourceVersionsMatch === true && report.sourceVersionsAfter.every((entry) => entry.actual === entry.expected)
  report.coverage = aggregateCoverage(requirements, report.checks, report.sourceVersionsMatch, {sourceUnchanged: report.sourceUnchanged, scriptUnchanged: report.scriptUnchanged})
  report.overallCandidateCompliance = report.coverage.overallCandidateCompliance
  await writeFile(resolve(output, 'requirements.json'), `${JSON.stringify({sourceVersions: report.sourceVersions, sourceVersionsAfter: report.sourceVersionsAfter, ...report.coverage}, null, 2)}\n`)
  const versionMarkdown = `## Specification versions\n\n| Source | Pinned SHA-256 | Observed SHA-256 |\n| --- | --- | --- |\n${(report.sourceVersionsAfter ?? []).map((entry) => `| ${entry.path} | ${entry.expected} | ${entry.actual} |`).join('\n')}\n`
  await writeFile(resolve(output, 'requirements.md'), `${coverageMarkdown(report.coverage)}\n${versionMarkdown}`)
  console.log(`Overall candidate compliance: ${report.overallCandidateCompliance}\nMandatory manual review outstanding: ${report.coverage.counts.manual}\nAccepted exceptions (not strict passes): ${report.coverage.counts.accepted}\nUnverified mandatory clauses: ${report.coverage.counts.unverified}`)
  await writeFile(resolve(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`)
  const rows = report.checks.map((c) => `| ${c.name} | ${c.ids.join(', ')} | ${c.status} | ${c.error ? c.error.split('\n')[0].replaceAll('|', '/') : JSON.stringify(c.evidence).replaceAll('|', '/').slice(0, 700)} |`)
  await writeFile(resolve(output, 'report.md'), `# Banking audit\n\nOverall candidate compliance: **${report.overallCandidateCompliance}**. See requirements.md for every clause, manual review and accepted exception.\n\nHEAD: ${report.head}\n\nBrowser: ${report.browser ?? 'unavailable'}\n\nSource unchanged: ${report.sourceUnchanged}\n\n| Check | Requirements | Result | Evidence |\n| --- | --- | --- | --- |\n${rows.join('\n')}\n\n## Limits\n\n${report.limits.map((l) => `- ${l}`).join('\n')}\n\n## Accepted exceptions\n\n${report.acceptedExceptions.map((l) => `- ${l}`).join('\n')}\n\n${coverageMarkdown(report.coverage)}\n${versionMarkdown}`)
  console.log(`Evidence: ${output}`)
  if (!report.sourceUnchanged || !report.scriptUnchanged || report.checks.some((c) => c.status !== 'pass')) process.exitCode = 1
}
