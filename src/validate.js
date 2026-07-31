/**
 * Validates the request body for creating an expense.
 * Returns { valid: true, data } or { valid: false, errors }.
 */
export function validateExpenseInput(body) {
  const errors = [];
  const { title, amount, category, date } = body || {};

  if (typeof title !== 'string' || title.trim() === '') {
    errors.push('title is required and must be a non-empty string');
  }

  if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) {
    errors.push('amount is required and must be a positive number');
  }

  if (typeof category !== 'string' || category.trim() === '') {
    errors.push('category is required and must be a non-empty string');
  }

  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    errors.push('date is required and must be a valid date string in YYYY-MM-DD format');
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      title: title.trim(),
      amount,
      category: category.trim(),
      date,
    },
  };
}
