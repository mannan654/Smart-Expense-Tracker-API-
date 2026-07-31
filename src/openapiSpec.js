/**
 * Static OpenAPI 3.0 specification for the Smart Expense Tracker API.
 *
 * Written by hand as a plain JS object (rather than generated from JSDoc
 * comments) so it's simple, predictable, and doesn't depend on a comment
 * parser picking up route annotations correctly.
 */
export const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Smart Expense Tracker API',
    version: '1.0.0',
    description:
      'A REST API to add, view, filter, total, and delete personal expenses. ' +
      'Every response is wrapped in a consistent envelope: `{ success, statusCode, message, data }` ' +
      'on success, or `{ success, statusCode, message, errors }` on failure.',
  },
  servers: [{ url: '/', description: 'Current server' }],
  tags: [{ name: 'Expenses', description: 'Manage personal expenses' }],
  components: {
    schemas: {
      Expense: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'ae1d735d-7170-4366-9db2-e9bcdb630e6b' },
          title: { type: 'string', example: 'Lunch' },
          amount: { type: 'number', example: 12.5 },
          category: { type: 'string', example: 'Food' },
          date: { type: 'string', format: 'date', example: '2026-07-30' },
        },
      },
      ExpenseInput: {
        type: 'object',
        required: ['title', 'amount', 'category', 'date'],
        properties: {
          title: { type: 'string', example: 'Lunch' },
          amount: { type: 'number', example: 12.5 },
          category: { type: 'string', example: 'Food' },
          date: { type: 'string', format: 'date', example: '2026-07-30' },
        },
      },
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          statusCode: { type: 'integer', example: 200 },
          message: { type: 'string', example: 'Expenses fetched successfully' },
          data: {},
        },
      },
      ApiError: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          statusCode: { type: 'integer', example: 400 },
          message: { type: 'string', example: 'Validation Error' },
          errors: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
  paths: {
    '/expenses': {
      post: {
        tags: ['Expenses'],
        summary: 'Add a new expense',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ExpenseInput' } } },
        },
        responses: {
          201: {
            description: 'Expense created successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } },
          },
          400: {
            description: 'Validation error',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
      get: {
        tags: ['Expenses'],
        summary: 'List all expenses (optionally filtered by category)',
        parameters: [
          {
            name: 'category',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Filter by category, case-insensitive',
          },
        ],
        responses: {
          200: {
            description: 'List of expenses',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } },
          },
        },
      },
    },
    '/expenses/total/summary': {
      get: {
        tags: ['Expenses'],
        summary: 'Get overall total and totals grouped by category',
        responses: {
          200: {
            description: 'Totals summary',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } },
          },
        },
      },
    },
    '/expenses/{id}': {
      get: {
        tags: ['Expenses'],
        summary: 'Get a single expense by id',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: {
            description: 'The requested expense',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } },
          },
          404: {
            description: 'Expense not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
      delete: {
        tags: ['Expenses'],
        summary: 'Delete an expense by id',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: {
            description: 'Expense deleted successfully',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } },
          },
          404: {
            description: 'Expense not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
          },
        },
      },
    },
  },
};
