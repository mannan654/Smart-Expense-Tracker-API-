# Smart Expense Tracker API

A REST API for managing personal expenses, built with **Node.js + Express**
using **ES Modules**. Data is stored in a local JSON file
(`data/expenses.json`), so records survive a server restart. No database is
required. Each expense gets a **UUID** (via the `uuid` package) as its id.

## Features

- `POST /expenses` — add an expense (`title`, `amount`, `category`, `date`)
- `GET /expenses` — view all expenses
- `GET /expenses?category=Food` — filter expenses by category (case-insensitive)
- `GET /expenses/:id` — get a single expense by id
- `GET /expenses/total/summary` — overall total and total grouped by category
- `DELETE /expenses/:id` — delete an expense
- Consistent JSON response envelope for every endpoint (see below)
- A catch-all 404 handler and a global error-handling middleware
- **Bonus feature: OpenAPI/Swagger docs** — interactive API docs at `/docs`,
  raw OpenAPI 3.0 spec at `/docs.json`

## Response format

Every response — success or failure — follows the same shape:

```json
// success (ApiResponse)
{ "success": true, "statusCode": 200, "message": "Expenses fetched successfully", "data": [...] }

// failure (ApiError)
{ "success": false, "statusCode": 400, "message": "Validation Error", "errors": ["amount is required and must be a positive number"] }
```

## Project Structure

```
your-repo/
  README.md
  AI_NOTES.md
  package.json
  src/
    server.js       # entry point, starts the HTTP server
    app.js          # Express app + all route handlers
    storage.js      # JSON-file backed storage layer (uuid ids)
    validate.js      # request body validation
    apiResponse.js   # ApiResponse class — shape for successful responses
    apiError.js      # ApiError class — shape for error responses
    openapiSpec.js   # OpenAPI 3.0 spec used to power /docs (bonus feature)
  tests/
    api.test.js     # Vitest + Supertest test suite (20 tests)
```

## Requirements

- Node.js 18+ (project uses ES Modules — `"type": "module"` in `package.json`)

## Install

```bash
npm install
```

## Run the server

From the repository root:

```bash
npm start
```

The API will be available at `http://localhost:3000` (override the port with
the `PORT` environment variable, e.g. `PORT=4000 npm start`).

Interactive API docs: `http://localhost:3000/docs`
Raw OpenAPI 3.0 spec (JSON): `http://localhost:3000/docs.json`

## Run the tests

From the repository root:

```bash
npm test
```

All 20 tests should pass. Tests use **Vitest** (native ESM support, no extra
config needed) + `supertest` against an app instance built with `createApp()`,
backed by an isolated temporary JSON file created per test (via
`fs.mkdtempSync`), so tests never touch or overwrite `data/expenses.json`.

## Example usage

```bash
# Add an expense
curl -X POST http://localhost:3000/expenses \
  -H "Content-Type: application/json" \
  -d '{"title": "Lunch", "amount": 12.5, "category": "Food", "date": "2026-07-30"}'

# List all expenses
curl http://localhost:3000/expenses

# Filter by category
curl "http://localhost:3000/expenses?category=Food"

# Totals (overall + by category)
curl http://localhost:3000/expenses/total/summary

# Delete an expense (using generated uuid)
curl -X DELETE http://localhost:3000/expenses/42f0fc11-7a57-48fc-8f74-1ee6f4de03bc
```

## Design notes

- **ES Modules**: the whole project uses `import`/`export` syntax
  (`"type": "module"` in `package.json`) rather than CommonJS
  `require`/`module.exports`.
- **Storage**: `ExpenseStore` (in `src/storage.js`) keeps expenses in memory
  as an array for fast reads, and writes to `data/expenses.json` on every
  add/delete so data isn't lost on restart. Each expense's `id` is a v4 UUID
  generated with the `uuid` package, not an auto-incrementing integer.
- **Validation**: `src/validate.js` checks that `amount` is a positive
  number and `title`/`category` are non-blank strings and `date` matches
  `YYYY-MM-DD`; invalid requests throw an `ApiError` with a list of specific
  error messages.
- **Consistent response envelope**: `src/apiResponse.js` and
  `src/apiError.js` define `ApiResponse`/`ApiError` classes so every route
  returns the same JSON shape. Routes are wrapped in an `asyncHandler`
  helper so a thrown `ApiError` is forwarded to a single global error
  handler at the bottom of `app.js`, instead of every route repeating its
  own `try/catch` and status code logic.
- **404 handling**: a catch-all middleware returns a consistent `ApiError`
  JSON body for any route that doesn't match one of the endpoints above
  (instead of Express's default HTML error page).
- **App factory pattern**: `src/app.js` exports `createApp(store)` instead
  of a server that's already listening. This lets tests inject an isolated
  `ExpenseStore` per test file and hit the app directly with `supertest`,
  without binding a real port or touching the real data file.
- **Route ordering**: `/expenses/total/summary` is registered before
  `/expenses/:id` so Express doesn't try to treat `"total"` as an expense id.
- **Test runner**: uses **Vitest** instead of Jest, since Vitest supports ES
  Modules natively without extra Babel/experimental-flag configuration.
- **Bonus feature — OpenAPI/Swagger docs**: `src/openapiSpec.js` is a
  hand-written OpenAPI 3.0 spec (not generated from JSDoc comments, to keep
  it predictable) describing every endpoint, request body, and response
  shape. It's served as an interactive UI at `/docs` (via
  `swagger-ui-express`) and as raw JSON at `/docs.json`.
