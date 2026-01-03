const express = require('express');
const pool = require('../database/db');
const { requireAuth, requireRole } = require('../middleware/auth');
const { validateVaultItem, validateSearch } = require('../middleware/validation');
const { sanitizeNote } = require('../utils/security');

const router = express.Router();

// All vault routes require authentication
router.use(requireAuth);

// Get user's own vault items
router.get('/', async (req, res) => {
  try {
    // SECURE: Using parameterized query
    const result = await pool.query(
      'SELECT id, name, note, created_at, updated_at FROM vault_items WHERE owner_id = $1 ORDER BY created_at DESC',
      [req.user.id]
    );

    res.json({ items: result.rows });
  } catch (error) {
    console.error('Error fetching vault items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all vault items (admin only)
router.get('/all', requireRole('admin'), async (req, res) => {
  try {
    // SECURE: Using parameterized query
    const result = await pool.query(
      'SELECT v.id, v.name, v.note, v.created_at, v.updated_at, u.email as owner_email FROM vault_items v JOIN users u ON v.owner_id = u.id ORDER BY v.created_at DESC'
    );

    res.json({ items: result.rows });
  } catch (error) {
    console.error('Error fetching all vault items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Search vault items
router.post('/search', validateSearch, async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query || query.trim().length === 0) {
      return res.json({ items: [] });
    }

    // SECURE: Using parameterized query with LIKE
    const searchPattern = `%${query.trim()}%`;
    const result = await pool.query(
      'SELECT id, name, note, created_at, updated_at FROM vault_items WHERE owner_id = $1 AND (name ILIKE $2 OR note ILIKE $2) ORDER BY created_at DESC',
      [req.user.id, searchPattern]
    );

    res.json({ items: result.rows });
  } catch (error) {
    console.error('Error searching vault items:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single vault item
router.get('/:id', async (req, res) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    
    if (isNaN(itemId)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    // SECURE: Using parameterized query
    const result = await pool.query(
      'SELECT id, name, note, created_at, updated_at FROM vault_items WHERE id = $1 AND owner_id = $2',
      [itemId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vault item not found' });
    }

    res.json({ item: result.rows[0] });
  } catch (error) {
    console.error('Error fetching vault item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new vault item
router.post('/', validateVaultItem, async (req, res) => {
  try {
    const { name, note } = req.body;

    // Sanitize note to prevent XSS
    const sanitizedNote = sanitizeNote(note || '');

    // SECURE: Using parameterized query
    const result = await pool.query(
      'INSERT INTO vault_items (owner_id, name, note) VALUES ($1, $2, $3) RETURNING id, name, note, created_at, updated_at',
      [req.user.id, name.trim(), sanitizedNote]
    );

    res.status(201).json({ item: result.rows[0] });
  } catch (error) {
    console.error('Error creating vault item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update vault item
router.put('/:id', validateVaultItem, async (req, res) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    
    if (isNaN(itemId)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    const { name, note } = req.body;

    // Sanitize note to prevent XSS
    const sanitizedNote = sanitizeNote(note || '');

    // SECURE: Using parameterized query
    const result = await pool.query(
      'UPDATE vault_items SET name = $1, note = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 AND owner_id = $4 RETURNING id, name, note, created_at, updated_at',
      [name.trim(), sanitizedNote, itemId, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vault item not found' });
    }

    res.json({ item: result.rows[0] });
  } catch (error) {
    console.error('Error updating vault item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete vault item (user can delete own, admin can delete any)
router.delete('/:id', async (req, res) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    
    if (isNaN(itemId)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    let result;
    
    if (req.user.role === 'admin') {
      // Admin can delete any item
      result = await pool.query(
        'DELETE FROM vault_items WHERE id = $1 RETURNING id',
        [itemId]
      );
    } else {
      // User can only delete own items
      result = await pool.query(
        'DELETE FROM vault_items WHERE id = $1 AND owner_id = $2 RETURNING id',
        [itemId, req.user.id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Vault item not found' });
    }

    res.json({ message: 'Vault item deleted successfully' });
  } catch (error) {
    console.error('Error deleting vault item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

