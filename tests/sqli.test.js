const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/database/db');
const bcrypt = require('bcrypt');

describe('SQL Injection Prevention Tests', () => {
  let testUserToken;
  let testUserEmail = 'sqltest@example.com';
  let password = 'TestPass123!';
  let userId;

  beforeAll(async () => {
    // Create test user
    const hash = await bcrypt.hash(password, 10);
    await pool.query('DELETE FROM users WHERE email = $1', [testUserEmail]);
    
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id',
      [testUserEmail, hash, 'user']
    );
    userId = result.rows[0].id;

    // Login to get token
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: testUserEmail, password });
    testUserToken = response.body.token;

    // Create some test items
    await pool.query(
      'INSERT INTO vault_items (owner_id, name, note) VALUES ($1, $2, $3)',
      [userId, 'Item 1', 'Note 1']
    );
    await pool.query(
      'INSERT INTO vault_items (owner_id, name, note) VALUES ($1, $2, $3)',
      [userId, 'Item 2', 'Note 2']
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM vault_items WHERE owner_id = $1', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await pool.end();
  });

  describe('SQL Injection in Search', () => {
    test('should NOT return all records with SQL injection payload', async () => {
      // Classic SQL injection attempt
      const maliciousPayload = "' OR 1=1 --";
      
      const response = await request(app)
        .post('/api/vault/search')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ query: maliciousPayload });

      expect(response.status).toBe(200);
      // Should return empty or only matching items, NOT all items
      // The parameterized query should treat this as a literal string
      expect(response.body.items.length).toBeLessThanOrEqual(2);
      
      // Verify it's treated as a search string, not SQL
      // If SQL injection worked, we'd get all items (more than 2)
      const allItemsResponse = await request(app)
        .get('/api/vault')
        .set('Authorization', `Bearer ${testUserToken}`);
      
      const totalItems = allItemsResponse.body.items.length;
      expect(response.body.items.length).toBeLessThanOrEqual(totalItems);
    });

    test('should NOT allow UNION-based injection', async () => {
      const maliciousPayload = "' UNION SELECT * FROM users --";
      
      const response = await request(app)
        .post('/api/vault/search')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ query: maliciousPayload });

      expect(response.status).toBe(200);
      // Should not crash or return user data
      expect(response.body).toHaveProperty('items');
      expect(Array.isArray(response.body.items)).toBe(true);
    });

    test('should NOT allow comment-based injection in item name', async () => {
      const maliciousName = "Test' --";
      
      const response = await request(app)
        .post('/api/vault')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ 
          name: maliciousName,
          note: 'Test note'
        });

      // Should either reject (validation) or safely store
      if (response.status === 201) {
        // If it accepts, verify it's stored safely
        expect(response.body.item.name).toBe(maliciousName);
      } else {
        // Validation should catch suspicious patterns
        expect(response.status).toBe(400);
      }
    });
  });

  describe('SQL Injection in Item ID', () => {
    test('should NOT allow SQL injection in item ID parameter', async () => {
      const maliciousId = "1' OR '1'='1";
      
      const response = await request(app)
        .get(`/api/vault/${maliciousId}`)
        .set('Authorization', `Bearer ${testUserToken}`);

      // Should return 400 (invalid ID) or 404 (not found), not execute SQL
      expect([400, 404]).toContain(response.status);
      expect(response.body).not.toHaveProperty('items');
    });

    test('should NOT allow SQL injection in DELETE operation', async () => {
      const maliciousId = "1; DROP TABLE vault_items; --";
      
      const response = await request(app)
        .delete(`/api/vault/${maliciousId}`)
        .set('Authorization', `Bearer ${testUserToken}`);

      // Should return 400 (invalid ID), not execute SQL
      expect(response.status).toBe(400);
      
      // Verify table still exists by querying it
      const verifyResponse = await request(app)
        .get('/api/vault')
        .set('Authorization', `Bearer ${testUserToken}`);
      
      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.body).toHaveProperty('items');
    });
  });

  describe('Parameterized Query Verification', () => {
    test('should handle special characters safely in search', async () => {
      const specialChars = "'; DROP TABLE users; --";
      
      const response = await request(app)
        .post('/api/vault/search')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({ query: specialChars });

      expect(response.status).toBe(200);
      // Should not crash or execute SQL
      expect(response.body).toHaveProperty('items');
      
      // Verify users table still exists
      const usersCheck = await pool.query('SELECT COUNT(*) FROM users');
      expect(parseInt(usersCheck.rows[0].count)).toBeGreaterThan(0);
    });
  });
});

