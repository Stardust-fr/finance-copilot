import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import app from '../app';
import { db } from '../lib/db';

// Unique email per test run to avoid conflicts with seeded data
const TEST_EMAIL = `auth_test_${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPass1';
const TEST_NAME = 'Auth Tester';

let authToken: string;

beforeAll(async () => {
  // Clean up any leftover test user
  await db.user.deleteMany({ where: { email: TEST_EMAIL } });
});

afterAll(async () => {
  // Clean up test user
  await db.user.deleteMany({ where: { email: TEST_EMAIL } });
});

// ─── Register ─────────────────────────────────────────────────────────────────
describe('POST /auth/register', () => {
  it('creates a new user and returns a JWT', async () => {
    const res = await request(app).post('/auth/register').send({
      name: TEST_NAME,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(TEST_EMAIL);
    expect(res.body.data.user.name).toBe(TEST_NAME);
    // Password must never be returned
    expect(res.body.data.user.passwordHash).toBeUndefined();

    authToken = res.body.data.token;
  });

  it('returns 409 when email is already registered', async () => {
    const res = await request(app).post('/auth/register').send({
      name: TEST_NAME,
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBeDefined();
  });

  it('returns 400 when name is too short', async () => {
    const res = await request(app).post('/auth/register').send({
      name: 'A',
      email: 'short@example.com',
      password: TEST_PASSWORD,
    });

    expect(res.status).toBe(400);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].field).toBe('name');
  });

  it('returns 400 when email is invalid', async () => {
    const res = await request(app).post('/auth/register').send({
      name: TEST_NAME,
      email: 'not-an-email',
      password: TEST_PASSWORD,
    });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('email');
  });

  it('returns 400 when password is too weak', async () => {
    const res = await request(app).post('/auth/register').send({
      name: TEST_NAME,
      email: 'weak@example.com',
      password: 'short',
    });

    expect(res.status).toBe(400);
    expect(res.body.errors[0].field).toBe('password');
  });
});

// ─── Login ────────────────────────────────────────────────────────────────────
describe('POST /auth/login', () => {
  it('returns a JWT for valid credentials', async () => {
    const res = await request(app).post('/auth/login').send({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(TEST_EMAIL);
  });

  it('returns 401 for wrong password', async () => {
    const res = await request(app).post('/auth/login').send({
      email: TEST_EMAIL,
      password: 'WrongPass1',
    });

    expect(res.status).toBe(401);
  });

  it('returns 401 for non-existent email', async () => {
    const res = await request(app).post('/auth/login').send({
      email: 'ghost@example.com',
      password: TEST_PASSWORD,
    });

    expect(res.status).toBe(401);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app).post('/auth/login').send({
      password: TEST_PASSWORD,
    });

    expect(res.status).toBe(400);
  });
});

// ─── GET /auth/me ─────────────────────────────────────────────────────────────
describe('GET /auth/me', () => {
  it('returns the current user for a valid token', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(TEST_EMAIL);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/auth/me');

    expect(res.status).toBe(401);
  });

  it('returns 401 for a malformed token', async () => {
    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', 'Bearer this.is.not.valid');

    expect(res.status).toBe(401);
  });

  it('returns 401 for a token signed with a wrong secret', async () => {
    // Manually crafted token with wrong secret
    const fakeToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
      'eyJzdWIiOiJmYWtlIiwiZW1haWwiOiJmYWtlQHRlc3QuY29tIn0.' +
      'invalidsignature';

    const res = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${fakeToken}`);

    expect(res.status).toBe(401);
  });
});
