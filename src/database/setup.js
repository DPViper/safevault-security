const pool = require('./db');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function setupDatabase() {
  try {
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'user',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create vault_items table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS vault_items (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        note TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_vault_items_owner ON vault_items(owner_id)
    `);

    // Create default admin user if it doesn't exist
    const adminEmail = process.env.DEFAULT_ADMIN_EMAIL || 'admin@safevault.com';
    const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'Admin123!';
    
    const existingAdmin = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [adminEmail]
    );

    if (existingAdmin.rows.length === 0) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await pool.query(
        'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)',
        [adminEmail, passwordHash, 'admin']
      );
      console.log(`Default admin user created: ${adminEmail} / ${adminPassword}`);
    }

    // Create a test user
    const testUserEmail = 'user@test.com';
    const testUserPassword = 'User123!';
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [testUserEmail]
    );

    if (existingUser.rows.length === 0) {
      const passwordHash = await bcrypt.hash(testUserPassword, 10);
      await pool.query(
        'INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3)',
        [testUserEmail, passwordHash, 'user']
      );
      console.log(`Test user created: ${testUserEmail} / ${testUserPassword}`);
    }

    console.log('Database setup completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error setting up database:', error);
    process.exit(1);
  }
}

setupDatabase();

