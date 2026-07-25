import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { db } from '../lib/db';
import { findById, findOrCreateGoogleUser, login, register } from '../services/auth.service';

const EMAIL = `service_test_${Date.now()}@example.com`;
const PASSWORD = 'ServiceTest1';
const NAME = 'Service Tester';

beforeAll(async () => {
  await db.user.deleteMany({ where: { email: EMAIL } });
});

afterAll(async () => {
  await db.user.deleteMany({ where: { email: EMAIL } });
  await db.user.deleteMany({ where: { email: { startsWith: 'google_test_' } } });
});

describe('AuthService.register', () => {
  it('hashes password and returns token + public user', async () => {
    const result = await register(NAME, EMAIL, PASSWORD);

    expect(result.token).toBeDefined();
    expect(result.user.email).toBe(EMAIL);
    expect(result.user.name).toBe(NAME);
    // passwordHash must NOT be in the returned object
    expect((result.user as Record<string, unknown>).passwordHash).toBeUndefined();
  });

  it('throws on duplicate email', async () => {
    await expect(register(NAME, EMAIL, PASSWORD)).rejects.toThrow();
  });
});

describe('AuthService.login', () => {
  it('returns token for correct credentials', async () => {
    const result = await login(EMAIL, PASSWORD);
    expect(result.token).toBeDefined();
    expect(result.user.email).toBe(EMAIL);
  });

  it('throws for wrong password', async () => {
    await expect(login(EMAIL, 'WrongPass9')).rejects.toThrow();
  });

  it('throws for non-existent email', async () => {
    await expect(login('nobody@example.com', PASSWORD)).rejects.toThrow();
  });
});

describe('AuthService.findById', () => {
  it('returns public user for valid id', async () => {
    const created = await register(`findbyid_${Date.now()}@example.com`, `findbyid_${Date.now()}@example.com`, PASSWORD).catch(() => login(EMAIL, PASSWORD));
    const found = await findById(created.user.id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(created.user.id);
  });

  it('returns null for unknown id', async () => {
    const result = await findById('nonexistent_id_xyz');
    expect(result).toBeNull();
  });
});

describe('AuthService.findOrCreateGoogleUser', () => {
  const googleEmail = `google_test_${Date.now()}@gmail.com`;
  const googleId = `google_${Date.now()}`;

  it('creates a new user on first OAuth login', async () => {
    const user = await findOrCreateGoogleUser({
      googleId,
      email: googleEmail,
      name: 'Google User',
    });

    expect(user.email).toBe(googleEmail);
    expect(user.name).toBe('Google User');
  });

  it('returns existing user on subsequent OAuth login', async () => {
    const user = await findOrCreateGoogleUser({
      googleId,
      email: googleEmail,
      name: 'Google User',
    });

    expect(user.email).toBe(googleEmail);

    // Verify only one record exists
    const count = await db.user.count({ where: { email: googleEmail } });
    expect(count).toBe(1);
  });
});
