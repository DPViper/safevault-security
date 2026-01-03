const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/database/db');
const bcrypt = require('bcrypt');

describe('Input Validation Tests', () => {
  let testUserToken;
  let testUserEmail = 'validation@example.com';
  let password = 'TestPass123!';

  beforeAll(async () => {
    const hash = await bcrypt.hash(password, 10);
    await pool.query('DELETE FROM users WHERE email = $1', [testUserEmail]);
    
    await pool.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)',
      [testUserEmail, hash, 'user']
    );

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: testUserEmail, password });
    testUserToken = response.body.token;
  });

  afterAll(async () => {
    await pool.query('DELETE FROM users WHERE email = $1', [testUserEmail]);
    await pool.end();
  });

  describe('Vault Item Validation', () => {
    test('should reject empty name', async () => {
      const response = await request(app)
        .post('/api/vault')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          name: '',
          note: 'Test note'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should reject name exceeding max length', async () => {
      const longName = 'a'.repeat(256); // Exceeds 255 char limit
      
      const response = await request(app)
        .post('/api/vault')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          name: longName,
          note: 'Test note'
        });

      expect(response.status).toBe(400);
    });

    test('should reject note exceeding max length', async () => {
      const longNote = 'a'.repeat(5001); // Exceeds 5000 char limit
      
      const response = await request(app)
        .post('/api/vault')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          name: 'Test Item',
          note: longNote
        });

      expect(response.status).toBe(400);
    });

    test('should reject invalid characters in name', async () => {
      const response = await request(app)
        .post('/api/vault')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          name: 'Test@Item#123',
          note: 'Test note'
        });

      // Should reject special characters not allowed by regex
      expect(response.status).toBe(400);
    });

    test('should accept valid item data', async () => {
      const response = await request(app)
        .post('/api/vault')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          name: 'Valid Item Name 123',
          note: 'Valid note content'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('item');
      
      // Clean up
      await request(app)
        .delete(`/api/vault/${response.body.item.id}`)
        .set('Authorization', `Bearer ${testUserToken}`);
    });
  });

  describe('User Registration Validation', () => {
    test('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'ValidPass123!'
        });

      expect(response.status).toBe(400);
    });

    test('should reject password without uppercase', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'lowercase123!'
        });

      expect(response.status).toBe(400);
    });

    test('should reject password without lowercase', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test2@example.com',
          password: 'UPPERCASE123!'
        });

      expect(response.status).toBe(400);
    });

    test('should reject password without number', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test3@example.com',
          password: 'NoNumber!'
        });

      expect(response.status).toBe(400);
    });

    test('should reject password too short', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test4@example.com',
          password: 'Short1!'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Type Validation', () => {
    test('should reject non-integer item ID', async () => {
      const response = await request(app)
        .get('/api/vault/not-a-number')
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(response.status).toBe(400);
    });

    test('should reject non-integer user ID', async () => {
      const response = await request(app)
        .get('/api/users/abc')
        .set('Authorization', `Bearer ${testUserToken}`);

      // Should be 403 (not admin) or 400 (invalid ID)
      expect([400, 403]).toContain(response.status);
    });
  });
});

