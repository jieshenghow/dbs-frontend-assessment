# Banking audit

Run from the repository root with Node 22 and existing project dependencies.
The audit imports an externally installed Playwright; it does not install packages.
The main browser remains visible by default. The placeholder contrast helper's
existing headless setting is unchanged.

```bash
PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs \
CHROMIUM_EXECUTABLE=/absolute/path/to/chromium \
node scripts/audit-banking.mjs
```

Use a Playwright release that supports `browserContext.routeWebSocket` (1.48+).
`CHROMIUM_EXECUTABLE` is optional if Playwright's matching Chromium is installed.
`PLAYWRIGHT_MODULE` defaults to normal Node resolution of `playwright`.
Example paths above must be replaced with installed paths; no private log or image
is needed to run the audit. It uses the installed `esbuild` dependency to bundle
actual `src/features/transfer/schema.ts` and `src/lib/format.ts` into the run's
output directory, executing exported product logic rather than copied rules.

For unattended execution, explicitly add `AUDIT_HEADLESS=1`. Set
`AUDIT_VERBOSE=1` to stream npm stdout/stderr while retaining command logs.
`AUDIT_OUTPUT` selects a fresh evidence directory (default `.audit/<timestamp>`).
Do not reuse an existing output directory. `AUDIT_PUBLIC_URL` overrides the default
`https://dbs-assessment.jieshenghow.com/` disposable in-memory mock application.
The runner immediately prints START, root, output path and browser mode, followed
by START and a result for every check. It runs check/build only when invoked;
reading these instructions or running the self-tests does neither.

## Fast audit infrastructure checks

```bash
node --check scripts/audit-banking.mjs
node --check scripts/audit/coverage.mjs
node --check scripts/audit/registry.mjs
node --check scripts/audit/schema-probe.mjs
node --check scripts/audit/public-guard.mjs
node --check scripts/audit/coverage-selftest.mjs
node --test scripts/audit/coverage-selftest.mjs
```

The self-test filename deliberately avoids Vitest's default `*.test.*` and
`*.spec.*` patterns. It is pure Node logic; it starts no browser/server and
changes no product file. Keep audit code unchanged during a full run;
the generated reports record and invalidate script drift.

## Evidence and acceptance semantics

Each run writes `report.json`, `report.md`, `requirements.json`, `requirements.md`,
command logs, screenshots, actual schema/formatter bundles and public page HTML.
Reports include HEAD, branch, working-tree state, browser, before/after app source
hashes and audit-module hashes. IDE metadata and audit artifacts are excluded from
the app hash. No production source, mock, supplied token, dependency or lockfile is
modified. Build regenerates ignored `dist/`.

The registry in `scripts/audit/registry.mjs` records an ID, original requirement or
subclause, specification source, scope, evidence mode, exact `checkNames`, manual
instructions and accepted exception. Check records contain `name`, `status` and
`evidence` (or failure/error evidence). Historical broad `ids` tags are navigation
hints only. They never determine clause status.

- An automated clause passes only if every named check ran and passed. Missing
  checks or empty bindings are unverified. Any named failure dominates passes.
- Manual clauses remain manual even when their associated automatic samples pass.
- Accepted exceptions remain accepted, never strict acceptance passes.
- Product-source, HEAD, audit-script or helper-module drift invalidates mandatory
  clause evidence. Both requirement reports list the invalidation reasons; an
  exit code alone is not the evidence-validity signal.
- Mandatory requirements, optional work and out-of-scope work are counted separately.
- `overallCandidateCompliance` is `pass` only when every mandatory clause strictly
  passes. A failed automated mandatory clause makes it `fail`; otherwise outstanding
  manual, unverified or accepted clauses make it `partial`.
- The console explicitly prints `Mandatory manual review outstanding`, accepted and
  unverified counts, and overall compliance. Exit 0 means only that executed
  automatic checks passed and source/script stayed unchanged. It does **not** mean
  overall candidate compliance. Exit 1 includes failed/unverified automatic checks,
  infrastructure failures, or source/script changes. Always read the overall field.

The registry pins SHA-256 versions of the candidate brief, API contract, tokens,
wireframe, original README and deployment instructions. Every run records expected
and actual hashes before and after execution. Any specification mismatch makes
all mandatory registry outcomes unverified. A changed spec requires a clause
review and intentional registry update; never just regenerate hashes to get green.
The maintained `.audit/COVERAGE.md` is a no-execution inventory, not runtime proof.

## Local and public separation

The script creates a production preview on its own temporary port. Before any
E6 public run it closes its local context, stops that owned child, checks both
`exitCode` and `signalCode`, and confirms its local URL is unreachable. Shutdown
subscribes before signaling, has bounded TERM/KILL waits and never targets any
other PID. Final cleanup safely tolerates an already signaled child.

Public checks use fresh contexts and record all context requests. Routes reject
literal or DNS-resolved loopback HTTP requests and WebSockets. Observed loopback
attempts fail E6 even if the UI appears functional. MSW remains enabled; service
worker responses are recorded. Public HTML entry and equality to local HTML are
observations, not deployment/source provenance proof. Public scope is only normal
transfer, documented `#fail` failure/recovery, and one mobile dark/premium sample.
A passed subset does not establish the entire local viewport/theme/state matrix
on the public site. A starter page produces HTML/screenshot evidence and a backend
connection observation before the missing product-flow assertion fails.

## Manual review and known limitations

Read `.audit/COVERAGE.md` and the generated requirement matrix for the exact manual
steps. Required manual review includes screen-reader speech, complete gradient AA,
every focusable control, a cold-load first-frame filmstrip, source architecture
(single validation definition and server-state ownership), README claim accuracy,
repository ownership, invitation-email submission and deadline dates. These are
not regex assertions. No Safari or physical mobile keyboard proof is claimed.
The tab-return README recipe is unverified if headless tab switching cannot cause
a real visibility transition; a synthetic event is not substituted as proof.

The user's accepted exceptions are deployment version correspondence, missing
README AI correction examples, and numeric cents entry/decimal paste restrictions.
They are documented exceptions, not satisfied strict requirements.

Protect the original handlers, data, tokens, src, original tests and package files.
Report product defects instead of fixing them under audit authority. Keep `.idea/`
and unrelated panes/processes intact. Only scripts and the two maintained audit
Markdown documents plus ignore rules belong in the eventual commit. Generated
JSON/Markdown reports, bundles, logs, screenshots and diagnostic artifacts remain
ignored. The audit itself never stages, commits, pushes or deploys.
