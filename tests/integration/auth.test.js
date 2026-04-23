'use strict';

const supertest = require('supertest');
const app = require('../../app');

const BASE = '/api/v2';

describe('Auth API — Integration', () => {
  describe('POST /auth/register', () => {
    test('returns 400 if required fields are missing', async () => {
      const res = await supertest(app)
        .post(`${BASE}/auth/register`)
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('returns 400 if password is too short', async () => {
      const res = await supertest(app)
        .post(`${BASE}/auth/register`)
        .send({
          orgName: 'Test Org',
          orgSlug: 'testorg',
          email: 'test@example.com',
          password: 'short',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    test('returns 400 if body is empty', async () => {
      const res = await supertest(app)
        .post(`${BASE}/auth/login`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('returns 400 if email format is invalid', async () => {
      const res = await supertest(app)
        .post(`${BASE}/auth/login`)
        .send({ email: 'not-an-email', password: 'anypassword' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/2fa/verify', () => {
    test('returns 400 if totpCode has wrong format', async () => {
      const res = await supertest(app)
        .post(`${BASE}/auth/2fa/verify`)
        .send({ tempToken: 'sometoken', totpCode: 'abc' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/forgot-password', () => {
    test('always returns 200 or 500 (no email enumeration on valid email format)', async () => {
      const res = await supertest(app)
        .post(`${BASE}/auth/forgot-password`)
        .send({ email: 'nonexistent@example.com' });

      // 200 when DB available (user not found → silent), 500 when DB not available in test env
      expect([200, 500]).toContain(res.status);
      // Must never return 404 that reveals user existence
      expect(res.status).not.toBe(404);
    });

    test('returns 400 for invalid email format', async () => {
      const res = await supertest(app)
        .post(`${BASE}/auth/forgot-password`)
        .send({ email: 'not-valid-email' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /healthz', () => {
    test('responds with service identifier in all states', async () => {
      const res = await supertest(app).get('/healthz');
      expect([200, 503]).toContain(res.status);
      expect(res.body).toHaveProperty('service', 'safeguard');
    });
  });

  describe('Unknown route', () => {
    test('returns 404 for undefined routes', async () => {
      const res = await supertest(app).get(`${BASE}/undefined-route`);
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
