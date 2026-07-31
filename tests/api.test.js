/**
 * Test suite for the Smart Expense Tracker API.
 *
 * Each test gets its own temp JSON file for storage (via fs.mkdtempSync)
 * so tests never touch the real data/expenses.json used by the running
 * server, and a fresh ExpenseStore + app so tests don't leak state into
 * each other.
 *
 * All responses use the ApiResponse/ApiError envelope:
 *   success -> { success: true, statusCode, message, data }
 *   failure -> { success: false, statusCode, message, errors }
 */
import fs from 'fs';
import os from 'os';
import path from 'path';
import { beforeEach, afterEach, describe, expect, test } from 'vitest';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { ExpenseStore } from '../src/storage.js';

const SAMPLE = { title: 'Coffee', amount: 4.5, category: 'Food', date: '2026-07-01' };
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let app;
let store;
let tempFile;

beforeEach(() => {
  tempFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'expense-test-')), 'expenses.json');
  store = new ExpenseStore(tempFile);
  app = createApp(store);
});

afterEach(() => {
  fs.rmSync(path.dirname(tempFile), { recursive: true, force: true });
});

describe('GET /', () => {
  test('returns 200 with success envelope', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

describe('POST /expenses', () => {
  test('adds a valid expense and returns a uuid id', async () => {
    const res = await request(app).post('/expenses').send(SAMPLE);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject(SAMPLE);
    expect(res.body.data.id).toMatch(UUID_REGEX);
  });

  test('rejects negative amount', async () => {
    const res = await request(app).post('/expenses').send({ ...SAMPLE, amount: -5 });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.join(' ')).toMatch(/amount/);
  });

  test('rejects blank title', async () => {
    const res = await request(app).post('/expenses').send({ ...SAMPLE, title: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('rejects missing fields', async () => {
    const res = await request(app).post('/expenses').send({ title: 'Coffee', amount: 4.5 });
    expect(res.status).toBe(400);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  test('rejects invalid date format', async () => {
    const res = await request(app).post('/expenses').send({ ...SAMPLE, date: '07/01/2026' });
    expect(res.status).toBe(400);
  });
});

describe('GET /expenses', () => {
  test('returns empty list initially', async () => {
    const res = await request(app).get('/expenses');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  test('returns all added expenses', async () => {
    await request(app).post('/expenses').send(SAMPLE);
    await request(app).post('/expenses').send({ ...SAMPLE, title: 'Bus', category: 'Travel', amount: 2 });
    const res = await request(app).get('/expenses');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  test('filters by category, case-insensitively', async () => {
    await request(app).post('/expenses').send(SAMPLE);
    await request(app).post('/expenses').send({ ...SAMPLE, title: 'Bus', category: 'Travel', amount: 2 });
    const res = await request(app).get('/expenses').query({ category: 'food' });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe('Coffee');
  });

  test('returns empty array when category has no matches', async () => {
    await request(app).post('/expenses').send(SAMPLE);
    const res = await request(app).get('/expenses').query({ category: 'Nonexistent' });
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });
});

describe('GET /expenses/:id', () => {
  test('returns a single expense', async () => {
    const created = (await request(app).post('/expenses').send(SAMPLE)).body.data;
    const res = await request(app).get(`/expenses/${created.id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Coffee');
  });

  test('returns 404 for a missing id', async () => {
    const res = await request(app).get('/expenses/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /expenses/total/summary', () => {
  test('computes overall total and totals by category', async () => {
    await request(app).post('/expenses').send({ ...SAMPLE, amount: 10, category: 'Food' });
    await request(app).post('/expenses').send({ ...SAMPLE, amount: 5, category: 'Food' });
    await request(app).post('/expenses').send({ ...SAMPLE, amount: 20, category: 'Travel' });

    const res = await request(app).get('/expenses/total/summary');
    expect(res.status).toBe(200);
    expect(res.body.data.overall_total).toBe(35);
    expect(res.body.data.by_category).toEqual({ Food: 15, Travel: 20 });
  });

  test('returns zero/empty when there are no expenses', async () => {
    const res = await request(app).get('/expenses/total/summary');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ overall_total: 0, by_category: {} });
  });
});

describe('DELETE /expenses/:id', () => {
  test('deletes an existing expense', async () => {
    const created = (await request(app).post('/expenses').send(SAMPLE)).body.data;
    const res = await request(app).delete(`/expenses/${created.id}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const getRes = await request(app).get(`/expenses/${created.id}`);
    expect(getRes.status).toBe(404);
  });

  test('returns 404 when deleting a non-existent id', async () => {
    const res = await request(app).delete('/expenses/does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('Unknown routes', () => {
  test('returns 404 with ApiError envelope', async () => {
    const res = await request(app).get('/not-a-real-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('API docs (bonus feature)', () => {
  test('GET /docs.json returns a valid OpenAPI spec', async () => {
    const res = await request(app).get('/docs.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(res.body.paths).toHaveProperty('/expenses');
  });

  test('GET /docs serves the Swagger UI HTML page', async () => {
    const res = await request(app).get('/docs/');
    expect(res.status).toBe(200);
    expect(res.type).toBe('text/html');
  });
});

describe('Persistence', () => {
  test('data written by one store instance is loadable by a new instance', () => {
    const dataFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'expense-persist-')), 'expenses.json');
    const store1 = new ExpenseStore(dataFile);
    store1.add({ title: 'Book', amount: 15.0, category: 'Education', date: '2026-07-10' });

    const store2 = new ExpenseStore(dataFile);
    const all = store2.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].title).toBe('Book');
  });
});
