/**
 * Standard shape for all successful responses returned by this API.
 *
 * Usage:
 *   return res.status(200).json(new ApiResponse(200, expenses, "Expenses fetched successfully"));
 *   return res.status(201).json(new ApiResponse(201, expense, "Expense created successfully"));
 */
export class ApiResponse {
  constructor(statusCode, data, message = 'Success') {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }
}
