# Meridian Banking — Jiesheng How

- Deployment: `main` deploys automatically to Vercel
  at [dbs-assessment.jieshenghow.com](https://dbs-assessment.jieshenghow.com). The live site reflects `main`; deployment
  of the current `feature/overview` branch has not been verified.
- Run locally: `npm install && npm run dev`

Use Node 22, as specified in `.nvmrc`. The development server runs at `http://localhost:5173`.
The app uses React, TypeScript, Vite, and the supplied Mock Service Worker (MSW) API.
MSW starts before React renders, including in production, so no separate backend is needed.
Build with `npm run build` and deploy `dist/`. See [deployment instructions](DEPLOYMENT.md).

## Project structure

```text
.
├── src/
│   ├── App.tsx                     # Transfer dialog visibility
│   ├── App.test.tsx                # Dashboard and transfer integration tests
│   ├── main.tsx                    # MSW startup and query provider
│   ├── api/                        # API types, fetch helper, queries, and mutation
│   ├── pages/
│   │   └── OverviewScreen.tsx       # Dashboard composition and request states
│   ├── features/
│   │   ├── overview/
│   │   │   └── components/         # Balances, accounts, transactions, and daily limit
│   │   ├── transfer/
│   │   │   ├── TransferDialog.tsx  # Modal and step navigation
│   │   │   ├── components/         # Recipient, amount, review, and success views
│   │   │   ├── hooks/              # Form state and submission flow
│   │   │   ├── schema.ts           # Zod validation rules
│   │   │   └── types.ts            # Form values and transfer UI states
│   │   └── theme/                  # Theme and segment preferences, with tests
│   ├── components/                 # Shared controls, skeletons, branding, and header
│   ├── lib/                        # Money/date formatting and daily-limit calculations
│   ├── mocks/                      # Browser MSW setup and handler exports
│   ├── test/                       # Shared test setup and mock-data reset
│   ├── index.css                   # Global styles and token imports
│   └── theme.css                   # Tailwind mappings to supplied tokens
├── public/
│   └── mockServiceWorker.js        # MSW browser worker
├── mock-api/                       # Supplied handlers, data, and optional Node server
├── brief/                          # Requirements, API contract, and design tokens
├── wireframes/                     # Layout reference
├── scripts/
│   ├── audit-banking.mjs           # Repeatable browser audit and evidence collection
│   ├── audit/                      # Requirement registry, result aggregation, and audit self-tests
│   └── verify-placeholder-contrast.mjs
├── .audit/
│   ├── RUNBOOK.md                  # Audit setup, commands, and result meanings
│   ├── COVERAGE.md                 # Automated checks, manual reviews, and accepted exceptions
│   └── <timestamp>/                # Generated evidence, excluded from version control
└── DEPLOYMENT.md                   # Hosting instructions
```

Focused component and utility tests live beside the code they cover as `*.test.ts` or `*.test.tsx`.

## Decisions and trade-offs

- TanStack Query owns customer, account, transaction, and payee data. Dashboard requests start together. A successful
  transfer invalidates customer, account, and transaction queries so balances, recent activity, and the daily limit
  refresh from the API.
- React state owns dialog visibility, search text, theme preferences, and the active transfer step. React Hook Form
  retains field values when moving back. A typed step union separates recipient, amount, review, and success states.
- Zod validates the relevant fields on blur and before advancing, then validates the whole form before submission.
  Amount checks compare integer cents against the account balance and remaining daily limit. API field errors map back
  to form inputs.
- Amount entry accumulates digits as cents, with two decimal places always shown. Typing `123` enters `1.23`.
- Transfers have no automatic retry. A synchronous lock prevents repeated confirmation, and the completed state prevents
  resubmission after success. A dashboard refresh failure has its own Retry action, which does not send another payment.
- Tailwind utilities resolve through `src/theme.css` to `brief/design-tokens.css`. The supplied tokens remain the source
  of truth for theme and segment colours. Preferences use local storage when available, with system colour mode as the
  initial fallback.
- The transfer uses a native modal dialog, with focus containment, Escape dismissal, and focus restoration. It fills the
  screen on smaller viewports and becomes a centred dialog on desktop.
- Search filters the eight loaded recent transactions by description or category. Full-history search and pagination
  would require a separate API query strategy.

## Loading, empty and error states

- Reload to see dashboard skeletons during the mock API's default 500 ms delay. Transfer details and payees also have
  loading messages. Submission disables confirmation and shows `Sending…`.
- An empty transaction response shows `No recent transactions.` A search with no matches shows a separate message and a
  Clear search action. Empty accounts have their own message and disable transfers. Empty payees still allow a new
  recipient.
- Dashboard and transfer-data failures show an alert with Retry. A failed payment stays on review with the entered
  values intact. Use Back to correct fields, then confirm again.

To see a payment failure in the deployed app, enter `#fail` in the optional note and confirm the transfer. The mock
returns an error without moving money. Remove `#fail` to retry successfully.

There is no debug menu. To demonstrate an empty transaction list on a running site, paste this into the browser's
developer console:

```js
const originalFetch = window.fetch.bind(window)
window.fetch = (input, init) => {
    const url = new URL(input instanceof Request ? input.url : input, location.href)
    if (url.pathname.endsWith('/api/transactions')) {
        url.searchParams.set('scenario', 'empty')
    }
    return originalFetch(input instanceof Request ? new Request(url, input) : url, init)
}
```

Wait at least 30 seconds for the query to become stale, then switch to another browser tab and back to trigger a
refetch. Replace `empty` with `error` to show the dashboard error. Reload between scenarios to restore the original
fetch function and seed data. To test recovery, run `window.fetch = originalFetch`, then select Retry.

For a longer loading state, replace the `set` call with `url.searchParams.set('delay', '5000')`. Cached data remains
visible during a background refetch, so initial skeletons are easiest to see on a normal reload. These hooks apply to
API requests; adding `?scenario=empty` to the page URL has no effect. See
the [API test hooks](brief/api-contract.md#test-and-demo-hooks).

## Tests

Run the checks before submission:

```bash
npm run check
npm run build
```

`npm run check` runs ESLint, TypeScript, and Vitest. The current suite has 50 cases using React Testing Library and the
supplied MSW handlers, with mock data reset between cases.

The audit infrastructure has nine separate Node self-tests. These check that missing evidence, failed checks,
source drift, manual reviews, and accepted exceptions cannot become false passes. They do not start the app or
replace the application tests:

```bash
node --test scripts/audit/coverage-selftest.mjs
```

I use the assessment requirements to decide what to test, then consider three types of scenario. Comments in the test
files separate the relevant groups:

- **Best scenarios:** the expected journey works, such as loading the dashboard, completing a transfer, and seeing the
  updated balance.
- **Worst scenarios:** failures are clear and recovery is safe, such as retrying failed requests, preserving transfer
  details, and preventing duplicate payments.
- **Boundary tests:** values at and just outside the limits behave correctly, such as the minimum transfer amount,
  available balance, daily limit, and recipient/note lengths.

My verification workflow starts with clear acceptance criteria, checks the integrated implementation through independent
review, and verifies the actual behaviour against those criteria. Automated tests and browser automation provide direct
evidence of what works. Where practical, checks are scripted so they can be repeated. A passing build or an agent’s
report alone is not proof; I report what was observed and any remaining limitations.

### Browser audit

Use the [audit runbook](.audit/RUNBOOK.md) to configure a separate Playwright installation and Chromium executable,
then run `scripts/audit-banking.mjs` from the repository root. Playwright is not installed by the audit or included
in the application's dependencies.

The runner checks the supplied specification versions, executes the actual transfer schema's boundary cases,
runs check/build, and drives the production build. It checks account and transaction values within their matching
rows, validation and error associations, keyboard and focus behaviour, duplicate submission, failure recovery,
responsive layout, and all four theme/segment combinations. It stops its own local preview before checking a
separate public subset covering a normal transfer, failure/recovery, and a mobile theme sample.

The [coverage inventory](.audit/COVERAGE.md) maps the 25 primary requirement IDs and supporting requirements to
77 records, including mandatory, optional, and out-of-scope work. It identifies the exact checks, manual reviews,
and accepted exceptions for each record. This inventory is a coverage plan; it does not claim that every
requirement has passed.

The main browser is visible by default; `AUDIT_HEADLESS=1` explicitly selects headless execution. The
placeholder-contrast helper keeps its existing headless setting. START, output paths and per-check progress print
immediately. Set `AUDIT_VERBOSE=1` to stream npm output. Reports, screenshots and logs stay in ignored `.audit/` run
folders.

Each timestamped run saves `report.md` and `report.json` for check results, plus `requirements.md` and
`requirements.json` for clause-level coverage. Read both before drawing a submission conclusion:

- `pass` means the named automated checks ran and passed.
- `fail` records an observed assertion failure that needs investigation.
- `unverified` means evidence is missing or the environment could not verify the check.
- `manual` and `accepted` remain separate from a strict acceptance pass.

Exit 0 means the automatic checks passed and the source stayed unchanged. Overall candidate compliance remains
partial while mandatory manual reviews or accepted exceptions remain. Source or audit-script drift invalidates
the requirement evidence and records the reason. The audit does not commit, push, or deploy.

## AI use

I decided the project structure, how to split the UI into components, and how to organise the code. I used OpenAI Codex
to assist with implementation, styling refactoring, tests, review, and README drafting within that structure.

The UI design reference is available
in [Figma: Meridian Banking — DBS Assessment UI](https://www.figma.com/design/B0zCe4GnNL9OxkZw6pZtER/Meridian-Banking-%E2%80%94-DBS-Assessment-UI?node-id=0-1&p=f&m=dev).

## Not done / known issues

- The mock API stores data in memory. Reloading resets transfers and balances to the seed data, as intended by the
  assignment.
- Dashboard availability depends on all three dashboard queries succeeding. A future revision could keep successful
  sections usable when another section fails.
- Empty and GET-error demonstrations require developer tools because there is no debug menu. A development-only scenario
  control would make these checks more convenient.
- The automated audit does not certify screen-reader speech, complete WCAG AA contrast and focus coverage, cold-load
  first-paint behaviour, or architecture and README statements that require source review. The coverage inventory lists
  these manual checks. A successful public subset also does not prove the deployed source matches this checkout.

