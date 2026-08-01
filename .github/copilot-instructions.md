# Test-Writing Instructions for RepoChat

## Architecture rules (do not assume otherwise)

- All app-specific business logic lives in `src/services/*.ts`. These are pure
  pipeline functions — no HTTP, no streaming knowledge.
- All OpenAI calls (chat completions, embeddings) live in `src/providers/*.ts`.
  Never call these directly in a test — always mock the provider module.
- **Known drift, don't "fix" it silently:** some provider functions (e.g.
  `checkQueryRelevance`, `interpretQuery` in `completionProvider.ts`) contain
  real app logic — JSON parsing, fail-open fallback behavior, filter
  extraction — not just a raw OpenAI call. Meanwhile some service files
  (e.g. `guards.ts`) are thin one-line wrappers that just call the provider
  and return its result unchanged. When a service is a thin wrapper, its
  test should ONLY verify it forwards correctly and propagates the result/
  errors unchanged — do NOT write tests for logic that actually lives in the
  provider. If a service file turns out to be a thin wrapper, flag it to me
  before writing tests, and ask whether the corresponding provider file
  should be tested too (separately, in `tests/unit/<providerName>.test.ts`).
- Every Mongoose model is only ever read/written through its matching
  `src/repositories/*Repository.ts` file. Services never import a model
  directly. In unit tests, mock the repository, not the model.
- Controllers (`src/controllers/*.ts`) are thin — validate + call handler,
  no logic worth testing directly.
- Handlers (`src/handlers/*.ts`) own HTTP/Express response behavior in
  general, not just streaming/SSE — for streaming routes that means SSE
  formatting and stream piping; for regular routes that means the actual
  status code and response body sent back. Do not assume redirects,
  specific status codes, or response shapes — confirm from the real
  handler/controller source every time.
- CONFIRMED: successful ingestion (`POST /api/ingest/repo`) does NOT
  redirect anywhere — it returns 202 with
  `res.standardResponse(202, { repoUrl }, 'Ingestion started')`. Any
  "redirects to /chat" behavior is frontend-only (client-side navigation
  after the ingestion completes, likely driven by polling status reaching
  'complete') — do not assume the backend itself redirects, and do not
  write backend tests asserting on a redirect.
- CONFIRMED: `GET /api/ingest/status?repoUrl=` when no IngestProgress doc
  exists yet does NOT return 404. It returns 200 with
  `{ message: string, data: null }`. Do not write or accept tests
  asserting a 404 status for this case — check this file for any test
  prompt/description that still says 404 and treat it as wrong.

## Test levels

- Unit tests (`tests/unit/`): mock everything external — providers, repositories,
  jobRegistry, filesystem.
- Integration tests (`tests/integration/`): real MongoDB via
  mongodb-memory-server, only providers mocked.
- E2E tests (`tests/e2e/`): Playwright, nothing mocked, full running app.

## Mocking pattern to follow exactly

`jest.mock()` calls go before imports (Jest hoists them). Import the mocked
module, cast the specific method `as jest.Mock`, and use
`mockResolvedValueOnce` / `mockRejectedValueOnce` inside each test. Always
`jest.clearAllMocks()` in `beforeEach`.

## Module resolution — CRITICAL, do this or tests will not run

The app's real source code uses ESM-style imports with explicit `.js`
extensions (e.g. `from '../providers/completionProvider.js'`), because the
app runs as ESM. Jest compiles everything to CommonJS for testing via
`tsconfig.test.json`, and plain CommonJS resolution cannot map a `.js`
import to an actual `.ts` file — it will throw `Cannot find module`.

This is fixed ONCE, at the config level, via `moduleNameMapper` in
`jest.config.ts`:

```typescript
moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
},
```

This strips `.js` off any relative import before Jest resolves it, letting
normal resolution find the `.ts` file. This is already added to this repo's
`jest.config.ts` — do not remove it, and do not "fix" the `.js` extensions
in source or test files by deleting them. **Keep `.js` extensions in test
file imports too**, consistent with the rest of the ESM codebase — do NOT
write extension less imports in new test files.

Note: your editor's TypeScript checker may still show a red squiggle /
`ts(2835)` warning on these imports in test files, because VS Code checks
against the main `tsconfig.json` (which requires `.js` for its `nodenext`
resolution) rather than `tsconfig.test.json` (which Jest actually uses).
If `npm run test:unit` passes, this warning is cosmetic — ignore it, do not
change the import to "fix" the squiggle.

## Rules for you (Copilot)

- I am a beginner learning to write tests. Explain each test's purpose in a
  one-line comment above it, in plain language.
- NEVER assume a function's return shape, field names, or error-handling
  behavior. If you haven't seen the actual source file's content, or if
  something in the source is ambiguous, STOP and ask me a specific question
  rather than guessing.
- Before writing tests for a service file, check whether it's a thin
  wrapper around a provider/repository call or whether it has real branching
  logic of its own. Tell me which one it is before writing tests, and adjust
  test depth accordingly (see "Known drift" note above).
- Match tests to the real implementation, not to any prior test-planning
  document — read the source of the file you're testing first.
- Keep test code idiomatic and clean enough to hold up to review from a
  senior engineer: clear describe/it names, Arrange/Act/Assert structure,
  no redundant setup.

## Integration test rules (tests/integration/ only)

- These use a REAL MongoDB via mongodb-memory-server (started in
  tests/globalSetup.ts, connected in tests/setup.ts). Do NOT mock any
  Mongoose model or repository under test — only mock the true external
  boundary: completionProvider, embeddingProvider, and chunkRepository
  (since $vectorSearch does not run in mongodb-memory-server).
- Before writing an integration test, ask: "would a mocked version of this
  dependency actually prove the same thing a real one would?" If the point
  of the test is to prove a Mongoose query/update/delete behaves correctly
  against real data, mocking that model defeats the entire purpose of the
  test — flag this to me if you're tempted to mock something under test.
- afterEach in tests/setup.ts already clears all collections between tests
  — do not add your own manual cleanup unless a test needs something
  beyond a full collection wipe (e.g. seeding specific ordered data).
- Use the real model's `.create()` to seed data at the start of a test,
  not mocked repository calls, so the test proves the actual repository
  functions work against it.
- For any test involving deletion loops or ordering (e.g. "oldest repo
  deleted first"), seed multiple real documents with distinct, explicit
  timestamp fields so the ordering assertion isn't accidental.
- If a test's whole point could be equally well proven with everything
  mocked, it might belong in tests/unit/ instead — say so and ask before
  writing it as an integration test.

## E2E test rules (tests/e2e/ only)

- Nothing is mocked. Real frontend, real backend, real MongoDB, and likely
  real OpenAI + real GitHub calls — these tests are slow and may cost real
  API usage. Don't add more E2E tests than necessary to prove
  browser-level behavior that a unit/integration test structurally cannot
  prove (network timing, actual polling intervals, real navigation,
  real rendered UI state).
- Both frontend and backend must already be running locally before these
  run — playwright.config.ts points baseURL at localhost:3000. If a test
  seems to need something like `page.waitForResponse` on a specific route,
  check the actual route path against src/routes/ first — don't guess it.
- Use `page.getByRole`, `page.getByPlaceholder`, or `page.getByTestId` —
  confirm real `data-testid` attributes exist in the actual component
  source before writing a selector. If a component doesn't have a
  data-testid for something you need to select, tell me instead of
  guessing a selector that might coincidentally work.
- Only use `localhost` URLs — Playwright's Chromium in this environment
  cannot reach the internet (see Known Issues Resolved in the handoff doc).
- For timing-based assertions (e.g. "polls every 2 seconds"), use
  `page.waitForResponse` matched multiple times with awaited gaps, or count
  matched requests over a fixed window — don't use arbitrary `page.waitForTimeout`
  sleeps as the primary assertion mechanism, only as a fallback if nothing
  else works, and say so if you use one.
- Show me the actual component source (e.g. IngestionProgress.tsx) before
  writing selectors or assertions against its behavior — don't assume
  prop names, testid values, or polling implementation details.

## New feature: polling-based ingestion status

- Status lives in a separate `IngestProgress` model, keyed by `repoURL`
  (NOT on the `Repo` model — this is intentional, keep it decoupled).
- Routes: `POST /api/ingest/repo` (kicks off ingestion, returns 202, no
  redirect — that's frontend-only client navigation),
  `GET /api/ingest/status?repoUrl=` (200 with status doc if it exists,
  200 with `{ message: string, data: null }` if no doc exists yet — NOT 404).
- Lifecycle service functions: createIngestProgress, updateIngestProgressStatus
  (pull-then-push per stage into statusHistory, then $set top-level fields),
  getIngestProgressStatus, deleteIngestProgress.
- Test both the service layer (mock the repository) and the controller layer
  (mock the service), plus an integration test with a real IngestProgress
  model, plus an E2E polling test that checks the frontend polls every ~2s
  and stops on 'complete' or 'error'.

## Current task — Phase 4 (E2E)

Phases 1–3 (unit, handler unit, integration) are complete. Now writing
tests/e2e/\*.spec.ts files. Follow the "E2E test rules" section above.
Show me the real frontend component source before writing any selector
or assertion — do not guess data-testid values, routes, or UI behavior,
including whether something redirects, what status codes come back, or
how polling is wired up client-side.
