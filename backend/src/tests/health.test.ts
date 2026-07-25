import request from 'supertest';
import { describe, expect, it } from 'vitest';

import app from '../app';

describe('GET /health', () => {
  it('returns status ok with timestamp and uptime', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
    expect(typeof res.body.uptime).toBe('number');
  });
});

describe('GET /nonexistent', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/nonexistent-route');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});
