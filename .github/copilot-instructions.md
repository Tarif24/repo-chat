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
- Handlers (`src/handlers/*.ts`) own HTTP and Express — test these with a fake
  `res` object (write/end/setHeader as jest.fn()).

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
  one-line comment above it, in plain language and if anything goes beyond the basics explain that too.
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

## Polling-based ingestion status

- Status lives in a separate `IngestProgress` model, keyed by `repoURL`
  (NOT on the `Repo` model — this is intentional, keep it decoupled).
- Routes: `POST /api/ingest/repo` (kicks off ingestion, returns 202),
  `GET /api/ingest/status?repoUrl=` (200 with status doc, or 404 if none exists).
- Lifecycle service functions: createIngestProgress, updateIngestProgressStatus
  (pull-then-push per stage into statusHistory, then $set top-level fields),
  getIngestProgressStatus, deleteIngestProgress.
- Test both the service layer (mock the repository) and the controller layer
  (mock the service), plus an integration test with a real IngestProgress
  model, plus an E2E polling test that checks the frontend polls every ~2s
  and stops on 'complete' or 'error'.

## Current task

Write `tests/unit/[FILENAME].test.ts` for `src/services/[FILENAME].ts`.
Show me the file's current content first in your response before writing
tests, so I can confirm you're testing the real logic and not a guess.
