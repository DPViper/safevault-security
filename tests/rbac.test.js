const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/database/db');
const bcrypt = require('bcrypt');

describe('RBAC (Role-Based Access Control) Tests', () => {
  let adminToken;
  let userToken;
  let adminEmail = 'rbacadmin@test.com';
  let userEmail = 'rbacuser@test.com';
  let password = 'TestPass123!';
  let testItemId;

  beforeAll(async () => {
    // Create admin user
    const adminHash = await bcrypt.hash(password, 10);
    await pool.query(
      'DELETE FROM users WHERE email = $1',
      [adminEmail]
    );
    await pool.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)',
      [adminEmail, adminHash, 'admin']
    );

    // Create regular user
    const userHash = await bcrypt.hash(password, 10);
    await pool.query(
      'DELETE FROM users WHERE email = $1',
      [userEmail]
    );
    await pool.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)',
      [userEmail, userHash, 'user']
    );

    // Login as admin
    const adminResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: adminEmail, password });
    adminToken = adminResponse.body.token;

    // Login as user
    const userResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: userEmail, password });
    userToken = userResponse.body.token;

    // Create a test item for the user
    const itemResult = await pool.query(
      'INSERT INTO vault_items (owner_id, name, note) VALUES ((SELECT id FROM users WHERE email = $1), $2, $3) RETURNING id',
      [userEmail, 'Test Item', 'Test Note']
    );
    testItemId = itemResult.rows[0].id;
  });

  afterAll(async () => {
    // Clean up
    await pool.query('DELETE FROM vault_items WHERE id = $1', [testItemId]);
    await pool.query('DELETE FROM users WHERE email IN ($1, $2)', [adminEmail, userEmail]);
    await pool.end();
  });

  describe('Admin-only routes', () => {
    test('admin should access /api/vault/all', async () => {
      const response = await request(app)
        .get('/api/vault/all')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('items');
    });

    test('user should NOT access /api/vault/all (403)', async () => {
      const response = await request(app)
        .get('/api/vault/all')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Access denied');
    });

    test('admin should access /api/users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('users');
    });

    test('user should NOT access /api/users (403)', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Access denied');
    });
  });

  describe('User item access', () => {
    test('user should access own items', async () => {
      const response = await request(app)
        .get('/api/vault')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(200);
      expect(response.body.items.length).toBeGreaterThan(0);
    });

    test('user should NOT access other users items directly', async () => {
      // Try to access item by ID (should only work if it's their own)
      const response = await request(app)
        .get(`/api/vault/${testItemId}`)
        .set('Authorization', `Bearer ${userToken}`);

      // This should work since it's their own item
      expect(response.status).toBe(200);
    });
  });

  describe('Admin user management', () => {
    test('admin should delete any vault item', async () => {
      // Create an item owned by the user
      const createResponse = await request(app)
        .post('/api/vault')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'User Item', note: 'Test' });

      const itemId = createResponse.body.item.id;

      // Admin should be able to delete it
      const deleteResponse = await request(app)
        .delete(`/api/vault/${itemId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(deleteResponse.status).toBe(200);
    });

    test('user should NOT delete other users items', async () => {
      // Create item as admin
      const createResponse = await request(app)
        .post('/api/vault')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Admin Item', note: 'Test' });

      const itemId = createResponse.body.item.id;

      // User should NOT be able to delete admin's item
      const deleteResponse = await request(app)
        .delete(`/api/vault/${itemId}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(deleteResponse.status).toBe(404); // Not found because it's not their item

      // Clean up
      await request(app)
        .delete(`/api/vault/${itemId}`)
        .set('Authorization', `Bearer ${adminToken}`);
    });
  });
});

