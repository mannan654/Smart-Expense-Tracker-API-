/**
 * Simple JSON-file backed storage for expenses.
 *
 * No database is required for this assignment, so expenses are kept in
 * memory in an array (for fast reads) and persisted to a JSON file on
 * every write (add/delete), so data survives a server restart.
 *
 * Each expense gets a UUID (v4) as its id, generated with the `uuid`
 * package, instead of an auto-incrementing integer.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_DATA_FILE = path.join(__dirname, '..', 'data', 'expenses.json');

export class ExpenseStore {
  constructor(dataFile = DEFAULT_DATA_FILE) {
    this.dataFile = dataFile;
    this.expenses = [];
    this._load();
  }

  _load() {
    const dir = path.dirname(this.dataFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (fs.existsSync(this.dataFile)) {
      try {
        const raw = fs.readFileSync(this.dataFile, 'utf-8');
        this.expenses = raw.trim() ? JSON.parse(raw) : [];
      } catch (err) {
        this.expenses = [];
      }
    } else {
      this.expenses = [];
    }
  }

  _save() {
    fs.writeFileSync(this.dataFile, JSON.stringify(this.expenses, null, 2), 'utf-8');
  }

  add({ title, amount, category, date }) {
    const expense = { id: uuidv4(), title, amount, category, date };
    this.expenses.push(expense);
    this._save();
    return expense;
  }

  getAll() {
    return [...this.expenses];
  }

  getByCategory(category) {
    return this.expenses.filter(
      (e) => e.category.toLowerCase() === category.toLowerCase()
    );
  }

  getById(id) {
    return this.expenses.find((e) => e.id === id) || null;
  }

  delete(id) {
    const index = this.expenses.findIndex((e) => e.id === id);
    if (index === -1) return false;
    this.expenses.splice(index, 1);
    this._save();
    return true;
  }

  total() {
    return Math.round(this.expenses.reduce((sum, e) => sum + e.amount, 0) * 100) / 100;
  }

  totalByCategory() {
    const totals = {};
    for (const e of this.expenses) {
      totals[e.category] = Math.round(((totals[e.category] || 0) + e.amount) * 100) / 100;
    }
    return totals;
  }

  clear() {
    this.expenses = [];
    this._save();
  }
}
