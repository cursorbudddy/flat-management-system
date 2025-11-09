const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { hashPassword, validatePassword } = require('../utils/password');
const { authenticate, authorize } = require('../middleware/auth');

/**
 * GET /api/users
 * Get all users (admin only)
 */
router.get('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT u.id, u.username, u.email, u.full_name, u.role, u.is_active,
              u.created_at, u.last_login,
              creator.full_name as created_by_name
       FROM users u
       LEFT JOIN users creator ON u.created_by = creator.id
       ORDER BY u.created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * GET /api/users/:id
 * Get single user (admin only)
 */
router.get('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      `SELECT u.id, u.username, u.email, u.full_name, u.role, u.is_active,
              u.created_at, u.updated_at, u.last_login,
              creator.full_name as created_by_name
       FROM users u
       LEFT JOIN users creator ON u.created_by = creator.id
       WHERE u.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

/**
 * POST /api/users
 * Create new user (admin only)
 */
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { username, email, password, full_name, role = 'user' } = req.body;

    // Validate required fields
    if (!username || !email || !password || !full_name) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Validate role
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin or user' });
    }

    // Validate password
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Password validation failed',
        details: passwordValidation.errors
      });
    }

    // Check if username already exists
    const usernameCheck = await db.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (usernameCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Username already exists' });
    }

    // Check if email already exists
    const emailCheck = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create user
    const result = await db.query(
      `INSERT INTO users (username, email, password_hash, full_name, role, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, email, full_name, role, is_active, created_at`,
      [username, email, password_hash, full_name, role, req.user.id]
    );

    res.status(201).json({
      message: 'User created successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * PUT /api/users/:id
 * Update user (admin only)
 */
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { email, full_name, role, is_active } = req.body;

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (email !== undefined) {
      // Check if email is already taken by another user
      const emailCheck = await db.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, id]
      );

      if (emailCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Email already exists' });
      }

      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }

    if (full_name !== undefined) {
      updates.push(`full_name = $${paramCount++}`);
      values.push(full_name);
    }

    if (role !== undefined) {
      if (!['admin', 'user'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be admin or user' });
      }
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, username, email, full_name, role, is_active, updated_at
    `;

    const result = await db.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      message: 'User updated successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * POST /api/users/:id/reset-password
 * Reset user password (admin only)
 */
router.post('/:id/reset-password', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: 'New password is required' });
    }

    // Validate password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Password validation failed',
        details: passwordValidation.errors
      });
    }

    // Hash new password
    const password_hash = await hashPassword(newPassword);

    // Update password
    const result = await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING id, username',
      [password_hash, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

/**
 * DELETE /api/users/:id
 * Delete user (admin only)
 * Note: Cannot delete yourself
 */
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if trying to delete self
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const result = await db.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, username',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

/**
 * GET /api/users/stats/overview
 * Get user statistics (admin only)
 */
router.get('/stats/overview', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE role = 'admin') as admin_users,
        COUNT(*) FILTER (WHERE role = 'user') as regular_users,
        COUNT(*) FILTER (WHERE is_active = true) as active_users,
        COUNT(*) FILTER (WHERE is_active = false) as inactive_users,
        COUNT(*) FILTER (WHERE last_login >= NOW() - INTERVAL '7 days') as active_last_week
      FROM users
    `);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

module.exports = router;
