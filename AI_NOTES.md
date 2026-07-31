# AI Notes

## 1. Which parts were AI-generated vs. written by me

I used Claude to generate the implementation for all files: `src/storage.js`,
`src/validate.js`, `src/app.js`, `src/server.js`, `src/apiResponse.js`,
`src/apiError.js`, `src/openapiSpec.js`, `tests/api.test.js`, `package.json`,
and `README.md`.

- **AI-generated**: the Express route handlers, the JSON-file storage
  class, the input validation logic, the `ApiResponse`/`ApiError` response
  classes, the OpenAPI 3.0 spec powering the Swagger docs, and the full
  Vitest/Supertest test suite were drafted by Claude based on my
  description of the assignment requirements.
- **Written/decided by me**: the choice of stack (Node.js + Express, since
  that's what I'm comfortable with), ES Modules over CommonJS (`import`/
  `export` throughout, `"type": "module"` in `package.json`), the storage
  approach (a JSON file instead of SQLite, since the assignment explicitly
  said no DB is required), UUIDs (via the `uuid` package) instead of
  auto-incrementing integers for expense ids, wrapping every response in a
  consistent `ApiResponse`/`ApiError` envelope with a single global error
  handler instead of each route hand-rolling its own response shape, and
  picking **OpenAPI/Swagger docs** as the one optional bonus feature (over
  search, monthly summary, or Docker), since it directly demonstrates the
  API surface to a reviewer without them needing to read the source code.
  I also decided to split `app.js` (route definitions, exported via a
  `createApp()` factory) from `server.js` (the part that actually calls
  `.listen()`), so the test suite can import the Express app and hit it
  with Supertest without opening a real network port.

## 2. What I validated, tested, or changed, and why

- I ran `npm test` (Vitest + Supertest) on a clean install (deleting
  `node_modules` and the lockfile first, then `npm install`) and confirmed
  all 18 tests pass, not just on an incrementally-updated environment.
- I manually started the server with `npm start` and exercised every
  endpoint with `curl` (add, list, filter, totals, delete, an invalid
  payload, and an unknown route) to confirm the JSON responses matched
  what the README documents, including the `success`/`data`/`errors`
  envelope shape.
- I checked the route registration order in `app.js`: Express matches
  routes in the order they're declared, so `/expenses/total/summary` had
  to be defined *before* `/expenses/:id` — otherwise a GET to
  `/expenses/total/summary` would be routed to the single-expense handler
  with `id="total"` instead. I confirmed this by testing the totals
  endpoint directly.
- Since `ApiError` extends the built-in `Error` class (so it can be
  `throw`n and caught by the global error-handling middleware), I checked
  that its `message` property actually serializes into the JSON response —
  `Error` instances don't include `message` when passed through
  `JSON.stringify`/`res.json()` by default, so I added a `toJSON()` method
  to `ApiError` and verified with `curl` that `message` and `errors` both
  show up correctly in error responses.
- Jest's ESM support needs extra flags/Babel config, which felt like
  unnecessary overhead for this assignment, so I had Claude use **Vitest**
  instead, which supports ES Modules natively. I confirmed `supertest`
  works unchanged under Vitest.
- I confirmed every relative import includes an explicit `.js` extension
  (e.g. `from './storage.js'`), since Node's ESM loader — unlike
  CommonJS's `require` — throws `ERR_MODULE_NOT_FOUND` if the extension is
  omitted.
- I reviewed the validation rules in `validate.js` (amount must be a
  positive number, title/category can't be blank, date must match
  `YYYY-MM-DD` and parse as a real date) and made sure there's a test for
  each failure case, including an invalid date format like `07/01/2026`.
- I added a test asserting the returned `id` matches a UUID v4 pattern,
  so the test suite actually checks the id format rather than just
  checking that *some* id exists.
- I verified persistence across restarts with a dedicated test that
  creates a store, adds an expense, then creates a **new** `ExpenseStore`
  instance pointed at the same file and confirms the expense is still
  there — simulating a server restart.
- I confirmed `/docs` serves the interactive Swagger UI (checked the
  response has `content-type: text/html`) and `/docs.json` returns the raw
  OpenAPI spec as valid JSON with the expected `openapi` version and a
  `paths` entry for `/expenses`, and added tests for both.
- I made sure each test gets its own isolated temp directory via
  `fs.mkdtempSync` (cleaned up in `afterEach`), so tests never touch the
  real `data/expenses.json` and can't leak state between test cases.
- Claude noted that wrapping every response in an `ApiResponse`/`ApiError`
  envelope is a stylistic choice, not a strict REST requirement — some
  reviewers might prefer plain top-level JSON (e.g. `GET /expenses`
  returning a bare array instead of nesting it under `data`). I decided to
  keep the envelope since I wanted to demonstrate the pattern, but I'm
  noting it here as a deliberate tradeoff rather than presenting it as the
  only "correct" way to shape a response.

## 3. AI suggestions I decided not to use, and why

- Claude suggested using a validation library (`joi` or
  `express-validator`) for the request body checks. I kept a small
  hand-written `validate.js` function instead — the rules are simple
  enough (four fields, basic type/format checks) that an extra dependency
  wasn't worth it for this assignment's scope.
- Claude offered to implement all four optional bonus features (search,
  monthly summary, Swagger docs, Docker). I picked only **Swagger docs**
  (see section 1), since the assignment says to pick **at most one**, and
  I wanted the core requirements to be solid rather than over-scope a task
  meant to take about 4 hours. I skipped search, monthly summary, and
  Docker for the same reason.
- I didn't keep Claude's first version of `storage.js`, which called
  `_save()` after every operation including reads. I changed it to only
  write to disk on `add`/`delete`, since writing on every read is
  unnecessary disk I/O for an operation that doesn't change state.
