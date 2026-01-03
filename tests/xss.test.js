const request = require('supertest');
const app = require('../src/server');
const pool = require('../src/database/db');
const bcrypt = require('bcrypt');

describe('XSS (Cross-Site Scripting) Prevention Tests', () => {
  let testUserToken;
  let testUserEmail = 'xsstest@example.com';
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
  });

  afterAll(async () => {
    await pool.query('DELETE FROM vault_items WHERE owner_id = $1', [userId]);
    await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    await pool.end();
  });

  describe('Stored XSS Prevention', () => {
    test('should sanitize script tags in note field', async () => {
      const xssPayload = '<script>alert("XSS")</script>';
      
      const response = await request(app)
        .post('/api/vault')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          name: 'Test Item',
          note: xssPayload
        });

      expect(response.status).toBe(201);
      
      // Retrieve the item
      const getResponse = await request(app)
        .get(`/api/vault/${response.body.item.id}`)
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(getResponse.status).toBe(200);
      const note = getResponse.body.item.note;
      
      // Should be sanitized - script tag should be removed or escaped
      expect(note).not.toContain('<script>');
      expect(note).not.toContain('alert("XSS")');
      
      // Clean up
      await request(app)
        .delete(`/api/vault/${response.body.item.id}`)
        .set('Authorization', `Bearer ${testUserToken}`);
    });

    test('should escape HTML entities in note field', async () => {
      const xssPayload = '<img src=x onerror=alert(1)>';
      
      const response = await request(app)
        .post('/api/vault')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          name: 'Test Item',
          note: xssPayload
        });

      expect(response.status).toBe(201);
      
      // Retrieve the item
      const getResponse = await request(app)
        .get(`/api/vault/${response.body.item.id}`)
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(getResponse.status).toBe(200);
      const note = getResponse.body.item.note;
      
      // Should be escaped - HTML entities should be encoded
      expect(note).not.toContain('<img');
      expect(note).not.toContain('onerror');
      // Should contain escaped versions
      expect(note.includes('&lt;') || note.includes('&amp;')).toBe(true);
      
      // Clean up
      await request(app)
        .delete(`/api/vault/${response.body.item.id}`)
        .set('Authorization', `Bearer ${testUserToken}`);
    });

    test('should prevent JavaScript protocol in note', async () => {
      const xssPayload = 'javascript:alert("XSS")';
      
      const response = await request(app)
        .post('/api/vault')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          name: 'Test Item',
          note: xssPayload
        });

      expect(response.status).toBe(201);
      
      const getResponse = await request(app)
        .get(`/api/vault/${response.body.item.id}`)
        .set('Authorization', `Bearer ${testUserToken}`);

      expect(getResponse.status).toBe(200);
      const note = getResponse.body.item.note;
      
      // Should sanitize javascript: protocol
      expect(note.toLowerCase()).not.toContain('javascript:');
      
      // Clean up
      await request(app)
        .delete(`/api/vault/${response.body.item.id}`)
        .set('Authorization', `Bearer ${testUserToken}`);
    });
  });

  describe('XSS in Item Name', () => {
    test('should sanitize XSS payload in name field', async () => {
      const xssName = '<script>alert(1)</script>Item';
      
      const response = await request(app)
        .post('/api/vault')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          name: xssName,
          note: 'Test note'
        });

      // Name validation should reject or sanitize
      if (response.status === 201) {
        // If accepted, verify it's sanitized
        expect(response.body.item.name).not.toContain('<script>');
      } else {
        // Validation should catch it
        expect(response.status).toBe(400);
      }
    });
  });

  describe('XSS Response Verification', () => {
    test('API response should not contain raw script tags', async () => {
      const xssPayload = '<script>document.cookie</script>';
      
      const createResponse = await request(app)
        .post('/api/vault')
        .set('Authorization', `Bearer ${testUserToken}`)
        .send({
          name: 'XSS Test',
          note: xssPayload
        });

      expect(createResponse.status).toBe(201);
      
      // Check that the response doesn't contain raw script tags
      const responseText = JSON.stringify(createResponse.body);
      expect(responseText).not.toContain('<script>');
      expect(responseText).not.toContain('document.cookie');
      
      // Clean up
      await request(app)
        .delete(`/api/vault/${createResponse.body.item.id}`)
        .set('Authorization', `Bearer ${testUserToken}`);
    });
  });
});

