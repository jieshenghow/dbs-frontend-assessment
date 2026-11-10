export const sourceVersions = {
  "brief/candidate-brief.md": "2d6078a1aefbe91927c4a6915b80ab38a9dad2aea9eed927a4621841cbdf4ad5",
  "brief/api-contract.md": "f1a37073b6d9d6bc670ca81ee1ca55e837c3f682e96952287a2655459aaf853c",
  "brief/design-tokens.css": "5ca91f3c0a93d78daa8074e93f61f53097290cdba8c6d906bc5dfac53d209e5b",
  "wireframes/wireframe.md": "e0d11705292f32b7e8590ef44c6c1622bb57c5024c07865699ffa62086b9af4c",
  "README-bak.md": "2106a5c9b4faeae1f866ec61600e872449aba38471810792d1a3bf2a6c95b4a7",
  "DEPLOYMENT.md": "153de8c0d9ded7940d4a64be4d1301a624a8f9fb99ed01a576e4c0c721c1130e"
}

export const requirements = [
  {
    "id": "D1",
    "clause": "Loading. Fetch the customer, the accounts and the transactions (`limit=8`) at the same time. Show skeleton placeholders while loading; the layout shouldn't jump when the data arrives.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "dashboard loading layout stability and concurrent requests",
      "dashboard seed, copy, ordering, search and real MSW"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "D2",
    "clause": "Header. Meridian logo, `Good evening, Ava`, Retail/Premium switch, light/dark toggle, `AC` avatar. Use the greeting as written; it doesn't need to change with the time of day.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "header, stepper and required transfer copy",
      "dashboard seed, copy, ordering, search and real MSW"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "D3",
    "clause": "Total available. `SGD 17,120.55` = checking + savings. The credit card is **not** included. Caption: `Across 2 deposit accounts`.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "dashboard seed, copy, ordering, search and real MSW",
      "row-bound accounts and transactions"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "D4",
    "clause": "Accounts. Three cards with name, masked number and balance. The credit card shows `-SGD 420.30` and an `Amount due` label.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "row-bound accounts and transactions"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "D5",
    "clause": "Recent transactions. The 8 newest, newest first. Each row shows description, category, date (`18 Oct`), amount, and a `Pending` chip if `status === \"pending\"`. Money in: `+SGD 45.00` in the positive colour. Money out: `-SGD 86.40` in the normal text colour.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "row-bound accounts and transactions",
      "dashboard seed, copy, ordering, search and real MSW"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "D6",
    "clause": "Search. Filter the list by description **or** category, ignoring case. Show how many results match and a way to clear the search. No matches → `No transactions match your search.` with a `Clear search` button.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "dashboard seed, copy, ordering, search and real MSW",
      "description and category search independently"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "D7",
    "clause": "Error. If loading the dashboard fails, show `We couldn't load your dashboard.` with a `Retry` button that fetches again. (To see it: add `?scenario=error` to the requests, or override the response in a test — see the [API contract](api-contract.md#test-and-demo-hooks).)",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "dashboard GET error and Retry recovery using documented hook"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "D8",
    "clause": "Mobile. At 390 px wide: one column, 16 px side margins, no sideways page scrolling, `New transfer` button fixed at the bottom of the screen, tap targets at least 44 px.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "layout 390px"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "T1",
    "clause": "Dialog. `New transfer` opens a centred dialog on desktop (≥ 1024 px) and a full-screen sheet on mobile. Focus moves into it, `Esc` and `✕` close it, and focus goes back to the button that opened it. A stepper shows `Recipient → Amount → Review`.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "native dialog keyboard, focus trap, Escape and opener restoration",
      "header, stepper and required transfer copy",
      "layout 360px",
      "layout 390px",
      "layout 640px",
      "layout 1024px",
      "layout 1280px",
      "layout 1440px"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "T2",
    "clause": "Step 1: Recipient. `Who are you sending to?` List payees from the API with a search box. Either pick one, or choose `Send to someone new` and enter a name, an 8-digit account number and a bank.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "manual",
    "checkNames": [
      "new recipient blur, first invalid focus, error links and Back values",
      "payee API list and search"
    ],
    "manualInstructions": "Inspect all payee fields and selection paths against GET /api/payees; automatic checks sample search and new-recipient submission.",
    "acceptedException": ""
  },
  {
    "id": "T3",
    "clause": "Step 2: Amount. `How much?` Choose the from-account (checking or savings only — not the credit card), enter an amount (or tap `50`, `100`, `250`, `500`), and add an optional note (max 50 characters, show a counter). Show the account's available balance and the remaining daily limit.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "manual",
    "checkNames": [
      "header, stepper and required transfer copy",
      "note boundary and all quick amounts"
    ],
    "manualInstructions": "Inspect all from-account choices and balances after switching; automatic checks cover deposit-only choices, quick amounts, counter and sampled balances.",
    "acceptedException": ""
  },
  {
    "id": "T4",
    "clause": "Step 3: Review. `Check the details`. Show from-account, recipient (name, masked number, bank), amount, fee `SGD 0.00`, total, and note. `Back` keeps everything the user entered.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "manual",
    "checkNames": [
      "new recipient blur, first invalid focus, error links and Back values",
      "successful transfer, duplicate protection and three refreshed resources"
    ],
    "manualInstructions": "Review preservation of every from-account/recipient field after Back across both saved and new recipients; automation samples values and review lines.",
    "acceptedException": ""
  },
  {
    "id": "T5",
    "clause": "Send. `Confirm transfer` sends `POST /api/transfers`. While it's sending, the button reads `Sending…` and can't be pressed again. On success, the dialog shows `Transfer sent`, the amount, the recipient, the reference from the API, and a `Back to dashboard` button.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "successful transfer, duplicate protection and three refreshed resources"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "T6",
    "clause": "Refresh. After a successful transfer, the dashboard shows the new balance, the new transaction and the new remaining limit without reloading the page.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "successful transfer, duplicate protection and three refreshed resources"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "T7",
    "clause": "Failure. If sending fails, stay on the review step with the data intact, show the error in an alert, and let the user try again. Never show success after a failure.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "payment failure keeps review, preserves data and safely retries"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "T8",
    "clause": "Accessibility. Every input has a label. Field errors are linked to their input (`aria-describedby`). The send error uses `role=\"alert\"`. The success message is announced (`aria-live`). The payee list works with a keyboard.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "manual",
    "checkNames": [
      "blur and Continue error associations",
      "native dialog keyboard, focus trap, Escape and opener restoration",
      "successful transfer, duplicate protection and three refreshed resources",
      "payment failure keeps review, preserves data and safely retries",
      "theme light/retail",
      "theme light/premium",
      "theme dark/retail",
      "theme dark/premium"
    ],
    "manualInstructions": "Use a real screen reader to hear success and errors; inspect every input and full keyboard navigation. DOM links and sampled focus do not prove speech or all controls.",
    "acceptedException": ""
  },
  {
    "id": "TH1",
    "clause": "Light/dark. The toggle switches instantly. On first visit, follow the system setting. Remember the choice (`localStorage`) and apply it before the page first paints, so there's no flash of the wrong theme on reload.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "manual",
    "checkNames": [
      "theme light/retail",
      "theme light/premium",
      "theme dark/retail",
      "theme dark/premium",
      "first visit follows system dark mode"
    ],
    "manualInstructions": "Capture a cold-load first-frame filmstrip with stored light/dark choice and opposite system preference. Screenshots after load cannot prove no flash.",
    "acceptedException": ""
  },
  {
    "id": "TH2",
    "clause": "Segment. Retail/Premium changes only the brand colour, in both light and dark mode. Remember the choice. Only use the CSS variables from `design-tokens.css`; **no hard-coded colours in components**.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "manual",
    "checkNames": [
      "theme light/retail",
      "theme light/premium",
      "theme dark/retail",
      "theme dark/premium"
    ],
    "manualInstructions": "Review all component/CSS colour origins and compare non-brand visual properties in four combinations. Sampled text colour equality cannot prove only brand changes.",
    "acceptedException": ""
  },
  {
    "id": "TH3",
    "clause": "Accessible. Toggles have labels (or `aria-pressed`), focus is always visible, and text contrast meets WCAG AA in all four combinations.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "manual",
    "checkNames": [
      "theme light/retail",
      "theme light/premium",
      "theme dark/retail",
      "theme dark/premium",
      "search placeholder contrast in all four combinations"
    ],
    "manualInstructions": "Review complete gradients/opacity/platform controls for AA and every focusable control in all four combinations. Automated contrast deliberately skips unsupported surfaces.",
    "acceptedException": ""
  },
  {
    "id": "E1",
    "clause": "Types. TypeScript strict mode, real types for API data, no `any` (ESLint enforces this).",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "manual",
    "checkNames": [
      "npm check"
    ],
    "manualInstructions": "Read API types and strict compiler configuration and review unsafe casts; a green lint/typecheck alone does not prove real domain types.",
    "acceptedException": ""
  },
  {
    "id": "E2",
    "clause": "Server data. Use TanStack Query (or an equivalent) for loading, errors, caching and refreshing after a transfer. Don't copy API data into `useState` or a global store.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "manual",
    "checkNames": [
      "successful transfer, duplicate protection and three refreshed resources"
    ],
    "manualInstructions": "Trace query/cache/mutation ownership and ensure server data is not copied into local/global state; inspect calculated totals and custom useEffect fetching.",
    "acceptedException": ""
  },
  {
    "id": "E3",
    "clause": "Forms. React Hook Form + Zod (or an equivalent), with each rule defined once (§3.3).",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "manual",
    "checkNames": [
      "actual bundled transfer schema boundaries",
      "blur and Continue error associations"
    ],
    "manualInstructions": "Trace one schema shared by inline blur and Continue/submit paths; verify rules are defined once. Executing the schema cannot prove ownership.",
    "acceptedException": ""
  },
  {
    "id": "E4",
    "clause": "Tests. At least these three, testing behaviour rather than implementation details: 1. an amount over the balance shows the error and sends no request; 2. a successful transfer shows the success screen and the dashboard updates; 3. a failed dashboard request shows the error, and `Retry` loads it.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "manual",
    "checkNames": [
      "npm check"
    ],
    "manualInstructions": "Read the three required behavioural tests and their assertions; passing suite/count alone does not establish their behavioural adequacy.",
    "acceptedException": ""
  },
  {
    "id": "E5",
    "clause": "Quality. `npm run check` and `npm run build` pass. (Running them in CI is optional — see §2.) No console errors when everything works.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "npm check",
      "production build",
      "dashboard seed, copy, ordering, search and real MSW",
      "successful transfer, duplicate protection and three refreshed resources"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "E6",
    "clause": "Deployed. The public URL works end to end with no local server.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "public normal transfer without local preview",
      "public failure and recovery without local preview",
      "public mobile theme without local preview"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "T2.api",
    "clause": "List payees from the API with a search box.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "payee API list and search"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "T3.controls",
    "clause": "Choose the from-account (checking or savings only — not the credit card), enter an amount (or tap `50`, `100`, `250`, `500`), and add an optional note (max 50 characters, show a counter).",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "header, stepper and required transfer copy",
      "note boundary and all quick amounts"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "T8.dom",
    "clause": "Field errors are linked to their input (`aria-describedby`). The send error uses `role=\"alert\"`. The success message is announced (`aria-live`).",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "blur and Continue error associations",
      "successful transfer, duplicate protection and three refreshed resources",
      "payment failure keeps review, preserves data and safely retries"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "TH1.preferences",
    "clause": "The toggle switches instantly. On first visit, follow the system setting. Remember the choice (`localStorage`).",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "theme light/retail",
      "theme light/premium",
      "theme dark/retail",
      "theme dark/premium",
      "first visit follows system dark mode"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "TH2.sample",
    "clause": "Retail/Premium changes the brand colour in both light and dark mode; remember the choice; set data-theme and data-segment on html.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "theme light/retail",
      "theme light/premium",
      "theme dark/retail",
      "theme dark/premium"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "TH3.sample",
    "clause": "Toggles have labels (or aria-pressed); sampled solid-text AA and recipient-name focus.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "theme light/retail",
      "theme light/premium",
      "theme dark/retail",
      "theme dark/premium"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "E5.commands",
    "clause": "npm run check and npm run build pass.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "npm check",
      "production build"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "V.name",
    "clause": "New recipient name | 2–50 characters | your wording",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "actual bundled transfer schema boundaries",
      "blur and Continue error associations"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "V.account",
    "clause": "Account number | exactly 8 digits | Enter a valid 8-digit account number.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "actual bundled transfer schema boundaries",
      "blur and Continue error associations"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "V.bank",
    "clause": "Bank | required | your wording",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "actual bundled transfer schema boundaries",
      "blur and Continue error associations"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "V.amount",
    "clause": "Amount | required, at least 1.00, at most 2 decimal places | your wording",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "actual bundled transfer schema boundaries",
      "blur and Continue error associations"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "V.balance",
    "clause": "Amount | not more than the account’s balance | Amount can't be more than your available balance (SGD 4,280.55).",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "actual bundled transfer schema boundaries",
      "blur and Continue error associations"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "V.limit",
    "clause": "Amount | not more than the remaining daily limit | This transfer exceeds your remaining daily limit (SGD 5,000.00).",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "actual bundled transfer schema boundaries",
      "blur and Continue error associations"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "V.note",
    "clause": "Note | max 50 characters | your wording",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "actual bundled transfer schema boundaries",
      "blur and Continue error associations"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "V.events",
    "clause": "Check fields when the user leaves them and when they press Continue. On Continue, move focus to the first invalid field.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "blur and Continue error associations"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "V.dynamic",
    "clause": "The amounts in the messages are examples — show the real balance or limit.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "actual bundled transfer schema boundaries",
      "amount boundary 4280.56",
      "amount boundary 5000.01"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "V.server",
    "clause": "If the API rejects something anyway, show its message.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "API field rejection remains review and is associated after Back"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "V.single",
    "clause": "Define each rule once and use it for inline errors and submit.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "manual",
    "checkNames": [
      "actual bundled transfer schema boundaries"
    ],
    "manualInstructions": "Read schema, form hook and submit path for rule duplication and data ownership.",
    "acceptedException": ""
  },
  {
    "id": "COPY.1",
    "clause": "Greeting | `Good evening, Ava`",
    "source": "brief/candidate-brief.md §4",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "header, stepper and required transfer copy"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "COPY.2",
    "clause": "Total | `Total available` / `Across 2 deposit accounts`",
    "source": "brief/candidate-brief.md §4",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "header, stepper and required transfer copy"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "COPY.3",
    "clause": "Main button | `New transfer`",
    "source": "brief/candidate-brief.md §4",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "header, stepper and required transfer copy"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "COPY.4",
    "clause": "Transactions | `Recent transactions` / search placeholder `Search transactions`",
    "source": "brief/candidate-brief.md §4",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "header, stepper and required transfer copy"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "COPY.5",
    "clause": "No search results | `No transactions match your search.` / `Clear search`",
    "source": "brief/candidate-brief.md §4",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "dashboard seed, copy, ordering, search and real MSW"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "COPY.6",
    "clause": "Dashboard error | `We couldn't load your dashboard.` / `Retry`",
    "source": "brief/candidate-brief.md §4",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "dashboard GET error and Retry recovery using documented hook"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "COPY.7",
    "clause": "Dialog title | `New transfer`",
    "source": "brief/candidate-brief.md §4",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "header, stepper and required transfer copy"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "COPY.8",
    "clause": "Step titles | `Who are you sending to?` / `How much?` / `Check the details`",
    "source": "brief/candidate-brief.md §4",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "header, stepper and required transfer copy"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "COPY.9",
    "clause": "Buttons | `Continue` / `Back` / `Confirm transfer` / `Sending…`",
    "source": "brief/candidate-brief.md §4",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "header, stepper and required transfer copy",
      "successful transfer, duplicate protection and three refreshed resources"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "COPY.10",
    "clause": "Send error | `Something went wrong. Your money hasn't left your account. Try again.`",
    "source": "brief/candidate-brief.md §4",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "payment failure keeps review, preserves data and safely retries"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "COPY.11",
    "clause": "Success | `Transfer sent` / `The money should arrive within minutes.` / `Back to dashboard`",
    "source": "brief/candidate-brief.md §4",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "successful transfer, duplicate protection and three refreshed resources"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "COPY.12",
    "clause": "Discard (optional) | `Discard this transfer?` / `Keep editing` / `Discard`",
    "source": "brief/candidate-brief.md §4",
    "scope": "optional",
    "mode": "automated",
    "checkNames": [],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "FORMAT.values",
    "clause": "Money use formatMoney; dates use formatShortDate, Singapore timezone; signs and nonbreaking space.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "manual",
    "checkNames": [
      "row-bound accounts and transactions",
      "dashboard seed, copy, ordering, search and real MSW"
    ],
    "manualInstructions": "Inspect formatter imports at money/date call sites and timezone boundary tests; rendered seed equality alone cannot prove formatter reuse or all timezones.",
    "acceptedException": ""
  },
  {
    "id": "FORMAT.rendered",
    "clause": "SGD amounts, signed income/outflow, Singapore short dates, tabular-nums on big amounts.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "row-bound accounts and transactions"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "LAYOUT.desktop",
    "clause": "Desktop content max 1200 px wide, 24 px margins, main column + 300 px right column.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "layout 360px",
      "layout 390px",
      "layout 640px",
      "layout 1024px",
      "layout 1280px",
      "layout 1440px"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "LAYOUT.mobile",
    "clause": "Mobile 16 px margins, one column, fixed bottom New transfer; minimum 360 px, breakpoints 640 and 1024.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "layout 360px",
      "layout 390px",
      "layout 640px",
      "layout 1024px",
      "layout 1280px",
      "layout 1440px"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "LAYOUT.cards",
    "clause": "Cards have 16–24 px padding. System font.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "layout 360px",
      "layout 390px",
      "layout 640px",
      "layout 1024px",
      "layout 1280px",
      "layout 1440px"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "LAYOUT.scale",
    "clause": "Spacing: 8 px scale; all visual styling consumes design tokens.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "manual",
    "checkNames": [],
    "manualInstructions": "Review spacing exceptions against tokens, all component styles and CSS mappings; sampling computed sizes cannot prove all visual origins.",
    "acceptedException": ""
  },
  {
    "id": "MOCK",
    "clause": "Do not change mock data or handlers. Same handlers in browser, tests and deployed site.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "manual",
    "checkNames": [
      "original instructions and protected inputs"
    ],
    "manualInstructions": "Protected hashes prove unchanged files; inspect browser/test setup and deployed service-worker handler parity separately.",
    "acceptedException": ""
  },
  {
    "id": "MOCK.unchanged",
    "clause": "Do not change mock data or handlers to make something pass.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "original instructions and protected inputs"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "TOKENS.unchanged",
    "clause": "Keep supplied design-tokens.css authoritative and intact.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "automated",
    "checkNames": [
      "original instructions and protected inputs"
    ],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "TOKENS.usage",
    "clause": "Only CSS variables from design-tokens.css; no hard-coded colours in components.",
    "source": "brief/candidate-brief.md",
    "scope": "mandatory",
    "mode": "manual",
    "checkNames": [],
    "manualInstructions": "Inspect src/index.css import, theme mappings and every component/style colour origin, including arbitrary Tailwind classes.",
    "acceptedException": ""
  },
  {
    "id": "README.sections",
    "clause": "Replace original README with own title/name, deployed URL, local command, Project structure, Decisions and trade-offs, Loading/empty/error states, Tests, AI use, Not done / known issues.",
    "source": "README-bak.md §5",
    "scope": "mandatory",
    "mode": "manual",
    "checkNames": [
      "README required sections, run command and actual suite count"
    ],
    "manualInstructions": "Read all sections and compare every claim with source/runtime, including author name, choices, tests and known issues. Section presence is only partial evidence.",
    "acceptedException": ""
  },
  {
    "id": "README.demo",
    "clause": "How to see loading, empty and error states in deployed app.",
    "source": "README-bak.md §5",
    "scope": "mandatory",
    "mode": "manual",
    "checkNames": [
      "README developer-console empty-state recipe after 30s stale and tab return"
    ],
    "manualInstructions": "Run each documented recipe on the deployed version; local empty-state demonstration is not public proof.",
    "acceptedException": ""
  },
  {
    "id": "README.ai-examples",
    "clause": "Name two or three places where you changed, rejected or fixed AI output and why.",
    "source": "README-bak.md §5",
    "scope": "mandatory",
    "mode": "accepted",
    "checkNames": [],
    "manualInstructions": "",
    "acceptedException": "User accepted missing README AI correction examples; strict README requirement remains unsatisfied."
  },
  {
    "id": "SUBMISSION.repo",
    "clause": "Own public repository, readable without credentials.",
    "source": "README-bak.md §1",
    "scope": "mandatory",
    "mode": "manual",
    "checkNames": [
      "repository is publicly readable without credentials"
    ],
    "manualInstructions": "Check repository ownership/template provenance against the candidate identity; anonymous readability is automated.",
    "acceptedException": ""
  },
  {
    "id": "SUBMISSION.email",
    "clause": "Reply to invitation email with repo URL and deployed URL; within two weeks of receipt.",
    "source": "README-bak.md §5 and time table",
    "scope": "mandatory",
    "mode": "manual",
    "checkNames": [],
    "manualInstructions": "Check actual invitation receipt and sent-email evidence with dates and both URLs. Do not infer submission from git/deployment.",
    "acceptedException": ""
  },
  {
    "id": "SUBMISSION.provenance",
    "clause": "Deployed version corresponds to current candidate source.",
    "source": "README-bak.md §5",
    "scope": "mandatory",
    "mode": "accepted",
    "checkNames": [],
    "manualInstructions": "",
    "acceptedException": "User accepted deployment version correspondence uncertainty; record HTML comparison as observation only."
  },
  {
    "id": "INPUT.numeric",
    "clause": "Mobile amount inputMode decimal / decimal typing and paste.",
    "source": "wireframes/wireframe.md §4",
    "scope": "mandatory",
    "mode": "accepted",
    "checkNames": [],
    "manualInstructions": "",
    "acceptedException": "User accepted numeric cents entry and decimal paste limitations; not a strict pass."
  },
  {
    "id": "API.contract",
    "clause": "Endpoint types, error codes, requests/responses and test hooks.",
    "source": "brief/api-contract.md",
    "scope": "mandatory",
    "mode": "manual",
    "checkNames": [],
    "manualInstructions": "Review brief/api-contract.md against API client and all flow boundaries; synthetic response overrides do not prove every server path.",
    "acceptedException": ""
  },
  {
    "id": "DEPLOYMENT.settings",
    "clause": "Deployment hosting and MSW settings.",
    "source": "DEPLOYMENT.md",
    "scope": "mandatory",
    "mode": "manual",
    "checkNames": [],
    "manualInstructions": "Review DEPLOYMENT.md against actual host configuration and public service-worker registration; no deployment performed by audit.",
    "acceptedException": ""
  },
  {
    "id": "WIREFRAME.remaining",
    "clause": "12-column desktop reference, mobile safe area and sheet footer placement; suggested components/icons and no ready-made dashboard template.",
    "source": "wireframes/wireframe.md",
    "scope": "mandatory",
    "mode": "manual",
    "checkNames": [],
    "manualInstructions": "Compare wireframe remaining structural notes at 360/390/1280 widths and safe-area device; inspect component provenance. No prescribed visual styling.",
    "acceptedException": ""
  },
  {
    "id": "OPTIONAL",
    "clause": "Pick any if you have time; none are needed for a strong result. A daily-limit progress bar · `Discard this transfer?` confirmation when closing a half-filled dialog · a debug menu that triggers the error/empty states · a balance-hide toggle · a third segment · a `#transfer` deep link · one end-to-end test · a CI workflow you set up yourself (e.g. GitHub Actions running `npm run check` and `npm run build`)",
    "source": "brief/candidate-brief.md",
    "scope": "optional",
    "mode": "automated",
    "checkNames": [],
    "manualInstructions": "",
    "acceptedException": ""
  },
  {
    "id": "OUT-OF-SCOPE",
    "clause": "Login, the Cards/Payments/Insights pages, charts, notifications, adding/editing payees, transaction detail, other currencies, translations",
    "source": "brief/candidate-brief.md",
    "scope": "out-of-scope",
    "mode": "automated",
    "checkNames": [],
    "manualInstructions": "",
    "acceptedException": ""
  }
]
