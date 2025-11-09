const jwt = require('jsonwebtoken');
const db = require('../database/db');

// JWT Secret (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // Get user from database
    const result = await db.query(
      'SELECT id, username, email, full_name, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'User account is deactivated' });
    }

    // Attach user to request
    req.user = user;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    console.error('Authentication error:', error);
    return res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Role-Based Access Control Middleware
 * Checks if user has required role(s)
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Access denied',
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};

/**
 * Optional Authentication
 * Attaches user if token is valid, but doesn't require it
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // No token, continue without user
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET);

    const result = await db.query(
      'SELECT id, username, email, full_name, role, is_active FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length > 0 && result.rows[0].is_active) {
      req.user = result.rows[0];
    }

    next();
  } catch (error) {
    // Invalid token, but continue without user
    next();
  }
};

/**
 * Check Edit Permission
 * Verifies if user can edit a specific entry (15-minute window for regular users)
 */
const checkEditPermission = (tableName) => {
  return async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      // Admin can always edit
      if (userRole === 'admin') {
        return next();
      }

      // Check if user created the entry and if within edit window
      const result = await db.query(
        `SELECT created_by, can_edit_until FROM ${tableName} WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      const { created_by, can_edit_until } = result.rows[0];

      // Check if user created this entry
      if (created_by !== userId) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You can only edit entries you created'
        });
      }

      // Check if within edit time window
      if (!can_edit_until || new Date() > new Date(can_edit_until)) {
        return res.status(403).json({
          error: 'Edit time expired',
          message: 'The 15-minute edit window has expired for this entry'
        });
      }

      next();
    } catch (error) {
      console.error('Edit permission check error:', error);
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
};

/**
 * Audit Log Middleware
 * Logs user actions to audit_log table
 */
const auditLog = (action, entityType = null) => {
  return async (req, res, next) => {
    // Store original methods
    const originalJson = res.json;
    const originalSend = res.send;

    // Override json method to capture response
    res.json = function (data) {
      // Log the action
      logAudit(req, action, entityType, data);
      // Call original method
      return originalJson.call(this, data);
    };

    res.send = function (data) {
      // Log the action
      logAudit(req, action, entityType, data);
      // Call original method
      return originalSend.call(this, data);
    };

    next();
  };
};

/**
 * Helper function to log audit entry
 */
const logAudit = async (req, action, entityType, responseData) => {
  try {
    const userId = req.user ? req.user.id : null;
    const entityId = req.params.id || (responseData && responseData.id) || null;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('user-agent');

    await db.query(
      `INSERT INTO audit_log (user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, action, entityType, entityId, JSON.stringify(req.body), ipAddress, userAgent]
    );
  } catch (error) {
    console.error('Audit log error:', error);
    // Don't throw error, just log it
  }
};

/**
 * Generate JWT Token
 */
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Verify JWT Token
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = {
  authenticate,
  authorize,
  optionalAuth,
  checkEditPermission,
  auditLog,
  generateToken,
  verifyToken,
  JWT_SECRET,
  JWT_EXPIRES_IN
};
