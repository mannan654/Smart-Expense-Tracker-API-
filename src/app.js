/**
 * Smart Expense Tracker API — Express app.
 *
 * Exported as a factory function so tests can create an app instance
 * backed by an isolated ExpenseStore (pointed at a temp file) without
 * ever starting a real HTTP server or touching data/expenses.json.
 *
 * Endpoints:
 *   POST   /expenses               -> add a new expense
 *   GET    /expenses               -> list all expenses (optional ?category=)
 *   GET    /expenses/total/summary -> overall total + total by category
 *   GET    /expenses/:id           -> get a single expense
 *   DELETE /expenses/:id           -> delete an expense
 *
 * All responses use a consistent envelope:
 *   success -> new ApiResponse(statusCode, data, message)
 *   failure -> new ApiError(statusCode, message, errors?)
 */
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { ExpenseStore } from './storage.js';
import { validateExpenseInput } from './validate.js';
import { ApiResponse } from './apiResponse.js';
import { ApiError } from './apiError.js';
import { openapiSpec } from './openapiSpec.js';

// Wraps an async/sync route handler so any thrown error (including a
// thrown ApiError) is forwarded to the global error handler instead of
// crashing the process or requiring a try/catch in every route.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export function createApp(store = new ExpenseStore()) {
  const app = express();
  app.use(express.json());

  app.get('/', (req, res) => {
    res.status(200).json(new ApiResponse(200, null, 'Smart Expense Tracker API is running. Visit /docs for API documentation.'));
  });

  // OpenAPI/Swagger docs (bonus feature) — interactive docs at /docs,
  // raw spec at /docs.json.
  app.get('/docs.json', (req, res) => res.status(200).json(openapiSpec));
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec));

  app.post(
    '/expenses',
    asyncHandler((req, res) => {
      const result = validateExpenseInput(req.body);
      if (!result.valid) {
        throw new ApiError(400, 'Validation Error', result.errors);
      }
      const created = store.add(result.data);
      return res.status(201).json(new ApiResponse(201, created, 'Expense created successfully'));
    })
  );

  app.get(
    '/expenses',
    asyncHandler((req, res) => {
      const { category } = req.query;
      const expenses = category ? store.getByCategory(category) : store.getAll();
      return res.status(200).json(new ApiResponse(200, expenses, 'Expenses fetched successfully'));
    })
  );

  // Registered before /expenses/:id so "total" in the path isn't
  // mistaken for an expense id.
  app.get(
    '/expenses/total/summary',
    asyncHandler((req, res) => {
      const summary = {
        overall_total: store.total(),
        by_category: store.totalByCategory(),
      };
      return res.status(200).json(new ApiResponse(200, summary, 'Totals fetched successfully'));
    })
  );

  app.get(
    '/expenses/:id',
    asyncHandler((req, res) => {
      const expense = store.getById(req.params.id);
      if (!expense) {
        throw new ApiError(404, `Expense with id ${req.params.id} not found`);
      }
      return res.status(200).json(new ApiResponse(200, expense, 'Expense fetched successfully'));
    })
  );

  app.delete(
    '/expenses/:id',
    asyncHandler((req, res) => {
      const deleted = store.delete(req.params.id);
      if (!deleted) {
        throw new ApiError(404, `Expense with id ${req.params.id} not found`);
      }
      return res
        .status(200)
        .json(new ApiResponse(200, null, `Expense ${req.params.id} deleted successfully`));
    })
  );

  // Catch-all for unknown routes.
  app.use((req, res) => {
    res.status(404).json(new ApiError(404, `Route ${req.method} ${req.originalUrl} not found`));
  });

  // Global error handler — catches thrown ApiErrors (via asyncHandler)
  // and any other unexpected error, always returning the same shape.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
      return res.status(err.statusCode).json(err);
    }
    console.error(err); // unexpected/programmer error - log for debugging
    return res.status(500).json(new ApiError(500, 'Internal Server Error'));
  });

  return app;
}
