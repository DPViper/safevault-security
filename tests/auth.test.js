const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/database/db');

describe('Authentication Tests', () => {
  let testUserToken;
  let testUserEmail = 'testauth@example.com';
  let testUserPassword = 'TestPass123!';

  beforeAll(async () => {
    // Clean up test user if exists
    await pool.query('DELETE FROM users WHERE email = $1', [testUserEmail]);
  });

  afterAll(async () => {
    // Clean up test user
    await pool.query('DELETE FROM users WHERE email = $1', [testUserEmail]);
    await pool.end();
  });

  describe('POST /api/auth/register', () => {
    test('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: testUserEmail,
          password: testUserPassword,
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testUserEmail);
      expect(response.body.user.role).toBe('user');
      expect(response.body).toHaveProperty('token');
    });

    test('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: testUserPassword,
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test2@example.com',
          password: 'weak',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject duplicate email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: testUserEmail,
          password: testUserPassword,
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
    });
  });

  describe('POST /api/auth/login', () => {
    test('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: testUserPassword,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(testUserEmail);
      testUserToken = response.body.token;
    });

    test('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUserPassword,
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid');
    });

    test('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Invalid');
    });
  });

  describe('Protected Routes - Authentication Required', () => {
    test('should return 401 for unauthenticated request to /api/vault', async () => {
      const response = await request(app)
        .get('/api/vault');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Authentication required');
    });

    test('should return 401 for unauthenticated request to /api/vault/search', async () => {
      const response = await request(app)
        .post('/api/vault/search')
        .send({ query: 'test' });

      expect(response.status).toBe(401);
    });

    test('should allow authenticated access to /api/vault', async () => {
      const response = await request(app)
        .get('/api/vault')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
    });
  });
});

