/**
 * Standard shape for all error responses returned by this API.
 *
 * Usage:
 *   return res.status(404).json(new ApiError(404, "Expense not found"));
 *   return res.status(400).json(new ApiError(400, "Validation Error", result.errors));
 */
export class ApiError extends Error {
  constructor(statusCode, message = 'Something went wrong', errors = []) {
    super(message);
    this.name = 'ApiError';
    this.success = false;
    this.statusCode = statusCode;
    this.errors = errors; // array of specific field-level error strings, if any
  }

  toJSON() {
    return {
      success: this.success,
      statusCode: this.statusCode,
      message: this.message,
      errors: this.errors,
    };
  }
}
