const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { hashPassword, comparePassword, validatePassword } = require('../utils/password');
const { generateToken, authenticate } = require('../middleware/auth');

/**
 * POST /api/auth/login
 * Login user and return JWT token
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Get user from database
    const result = await db.query(
      'SELECT id, username, email, password_hash, full_name, role, is_active FROM users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'User account is deactivated' });
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Update last login
    await db.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Generate token
    const token = generateToken(user.id, user.role);

    // Return user data and token (exclude password_hash)
    const { password_hash, ...userData } = user;

    res.json({
      message: 'Login successful',
      token,
      user: userData
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/register
 * Register new user (admin only can create users through this endpoint)
 * Regular registration should go through admin user management
 */
router.post('/register', authenticate, async (req, res) => {
  try {
    const { username, email, password, full_name, role = 'user' } = req.body;

    // Validate required fields
    if (!username || !email || !password || !full_name) {
      return res.status(400).json({ error: 'All fields are required' });
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
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      user: req.user
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user information' });
  }
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    // Validate new password
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return res.status(400).json({
        error: 'Password validation failed',
        details: passwordValidation.errors
      });
    }

    // Get current password hash
    const result = await db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, result.rows[0].password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update password
    await db.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newPasswordHash, req.user.id]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (client-side should remove token)
 */
router.post('/logout', authenticate, async (req, res) => {
  try {
    // In a more complex system, you might invalidate the token here
    // For now, we just acknowledge the logout
    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

module.exports = router;
