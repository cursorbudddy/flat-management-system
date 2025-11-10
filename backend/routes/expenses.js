const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth');

// Get expense trends by category
router.get('/trends/category', async (req, res) => {
  try {
    const { building_id, start_date, end_date } = req.query;

    let query = `
      SELECT
        e.category,
        SUM(e.amount) as total_amount,
        COUNT(*) as count
      FROM expenses e
      WHERE e.approval_status = 'approved'
    `;

    const params = [];

    if (building_id) {
      params.push(building_id);
      query += ` AND e.building_id = $${params.length}`;
    }

    if (start_date) {
      params.push(start_date);
      query += ` AND e.expense_date >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      query += ` AND e.expense_date <= $${params.length}`;
    }

    query += ' GROUP BY e.category ORDER BY total_amount DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch expense trends' });
  }
});

// Get all expenses
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { start_date, end_date, building_id, flat_id, category, approval_status } = req.query;

    let query = `
      SELECT e.*,
        b.name as building_name,
        submitter.full_name as submitted_by_name,
        approver.full_name as approved_by_name
       FROM expenses e
       LEFT JOIN buildings b ON e.building_id = b.id
       LEFT JOIN users submitter ON e.submitted_by = submitter.id
       LEFT JOIN users approver ON e.approved_by = approver.id
       WHERE 1=1
    `;

    const params = [];

    if (start_date) {
      params.push(start_date);
      query += ` AND e.expense_date >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      query += ` AND e.expense_date <= $${params.length}`;
    }

    if (building_id) {
      params.push(building_id);
      query += ` AND e.building_id = $${params.length}`;
    }

    if (flat_id) {
      params.push(flat_id);
      query += ` AND e.flat_id = $${params.length}`;
    }

    if (category) {
      params.push(category);
      query += ` AND e.category = $${params.length}`;
    }

    if (approval_status) {
      params.push(approval_status);
      query += ` AND e.approval_status = $${params.length}`;
    } else if (req.user && req.user.role !== 'admin') {
      // Regular users only see approved expenses by default
      query += ` AND e.approval_status = 'approved'`;
    }

    query += ' ORDER BY e.expense_date DESC, e.submitted_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// Get expense categories
router.get('/categories', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT DISTINCT category FROM expenses ORDER BY category'
    );
    res.json(result.rows.map(row => row.category));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch expense categories' });
  }
});

// Get expense statistics
router.get('/stats', async (req, res) => {
  try {
    const { start_date, end_date, building_id } = req.query;

    let query = `
      SELECT
        COUNT(*) as total_expenses,
        SUM(amount) as total_amount,
        category,
        SUM(amount) as category_amount
      FROM expenses
      WHERE 1=1
    `;

    const params = [];

    if (start_date) {
      params.push(start_date);
      query += ` AND expense_date >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      query += ` AND expense_date <= $${params.length}`;
    }

    if (building_id) {
      params.push(building_id);
      query += ` AND building_id = $${params.length}`;
    }

    query += ' GROUP BY category ORDER BY category_amount DESC';

    const result = await db.query(query, params);

    // Also get total summary
    let summaryQuery = `
      SELECT
        COUNT(*) as total_count,
        COALESCE(SUM(amount), 0) as total_sum
      FROM expenses
      WHERE 1=1
    `;

    const summaryParams = [];

    if (start_date) {
      summaryParams.push(start_date);
      summaryQuery += ` AND expense_date >= $${summaryParams.length}`;
    }

    if (end_date) {
      summaryParams.push(end_date);
      summaryQuery += ` AND expense_date <= $${summaryParams.length}`;
    }

    if (building_id) {
      summaryParams.push(building_id);
      summaryQuery += ` AND building_id = $${summaryParams.length}`;
    }

    const summaryResult = await db.query(summaryQuery, summaryParams);

    res.json({
      summary: summaryResult.rows[0],
      by_category: result.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch expense statistics' });
  }
});

// Get single expense
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT e.*,
        b.name as building_name
       FROM expenses e
       LEFT JOIN buildings b ON e.building_id = b.id
       WHERE e.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch expense' });
  }
});

// Create new expense
router.post('/', optionalAuth, async (req, res) => {
  try {
    const {
      building_id,
      expense_date,
      category,
      description,
      amount,
      payment_method,
      remarks
    } = req.body;

    if (!expense_date || !category || !amount) {
      return res.status(400).json({ error: 'Missing required fields: expense_date, category, amount' });
    }

    // Determine approval status based on user role
    let approval_status = 'pending';
    let submitted_by = null;
    let approved_by = null;
    let approved_at = null;

    if (req.user) {
      submitted_by = req.user.id;
      // Admin expenses are auto-approved
      if (req.user.role === 'admin') {
        approval_status = 'approved';
        approved_by = req.user.id;
        approved_at = new Date();
      }
    }

    const result = await db.query(
      `INSERT INTO expenses
        (building_id, expense_date, category, description, amount, payment_method, remarks,
         approval_status, submitted_by, approved_by, approved_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [building_id, expense_date, category, description, amount, payment_method, remarks,
       approval_status, submitted_by, approved_by, approved_at]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// Update expense
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      building_id,
      expense_date,
      category,
      description,
      amount,
      payment_method,
      remarks
    } = req.body;

    const result = await db.query(
      `UPDATE expenses
       SET building_id = COALESCE($1, building_id),
           expense_date = COALESCE($2, expense_date),
           category = COALESCE($3, category),
           description = COALESCE($4, description),
           amount = COALESCE($5, amount),
           payment_method = COALESCE($6, payment_method),
           remarks = COALESCE($7, remarks)
       WHERE id = $8
       RETURNING *`,
      [building_id, expense_date, category, description, amount, payment_method, remarks, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update expense' });
  }
});

// Delete expense
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM expenses WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json({ message: 'Expense deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// Get pending expenses (admin only)
router.get('/approval/pending', authenticate, authorize('admin'), async (req, res) => {
  try {
    const result = await db.query(
      `SELECT e.*,
        b.name as building_name,
        submitter.full_name as submitted_by_name,
        submitter.email as submitted_by_email
       FROM expenses e
       LEFT JOIN buildings b ON e.building_id = b.id
       LEFT JOIN users submitter ON e.submitted_by = submitter.id
       WHERE e.approval_status = 'pending'
       ORDER BY e.submitted_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch pending expenses' });
  }
});

// Approve expense (admin only)
router.post('/:id/approve', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { approval_notes } = req.body;

    const result = await db.query(
      `UPDATE expenses
       SET approval_status = 'approved',
           approved_by = $1,
           approved_at = CURRENT_TIMESTAMP,
           approval_notes = $2
       WHERE id = $3 AND approval_status = 'pending'
       RETURNING *`,
      [req.user.id, approval_notes || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found or already processed' });
    }

    res.json({
      message: 'Expense approved successfully',
      expense: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve expense' });
  }
});

// Reject expense (admin only)
router.post('/:id/reject', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { approval_notes } = req.body;

    if (!approval_notes) {
      return res.status(400).json({ error: 'Rejection reason (approval_notes) is required' });
    }

    const result = await db.query(
      `UPDATE expenses
       SET approval_status = 'rejected',
           approved_by = $1,
           approved_at = CURRENT_TIMESTAMP,
           approval_notes = $2
       WHERE id = $3 AND approval_status = 'pending'
       RETURNING *`,
      [req.user.id, approval_notes, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Expense not found or already processed' });
    }

    res.json({
      message: 'Expense rejected successfully',
      expense: result.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject expense' });
  }
});

module.exports = router;
