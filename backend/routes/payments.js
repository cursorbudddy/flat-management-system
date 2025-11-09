const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Get all payments
router.get('/', async (req, res) => {
  try {
    const { start_date, end_date, building_id, tenant_id } = req.query;

    let query = `
      SELECT p.*,
        t.name as tenant_name,
        b.name as building_name,
        f.flat_number
       FROM payments p
       LEFT JOIN tenants t ON p.tenant_id = t.id
       LEFT JOIN buildings b ON p.building_id = b.id
       LEFT JOIN rental_agreements ra ON p.rental_agreement_id = ra.id
       LEFT JOIN flats f ON ra.flat_id = f.id
       WHERE 1=1
    `;

    const params = [];

    if (start_date) {
      params.push(start_date);
      query += ` AND p.payment_date >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      query += ` AND p.payment_date <= $${params.length}`;
    }

    if (building_id) {
      params.push(building_id);
      query += ` AND p.building_id = $${params.length}`;
    }

    if (tenant_id) {
      params.push(tenant_id);
      query += ` AND p.tenant_id = $${params.length}`;
    }

    query += ' ORDER BY p.payment_date DESC, p.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// Get pending payments (tenants who haven't paid this month)
router.get('/pending', async (req, res) => {
  try {
    const { building_id } = req.query;

    let query = `
      SELECT
        ra.id as rental_agreement_id,
        t.id as tenant_id,
        t.name as tenant_name,
        t.contact_number as tenant_contact,
        b.name as building_name,
        f.flat_number,
        ra.rental_amount,
        ra.rental_period,
        ra.start_date,
        COALESCE(SUM(p.amount), 0) as total_paid,
        (ra.rental_amount - COALESCE(SUM(p.amount), 0)) as pending_amount
      FROM rental_agreements ra
      JOIN tenants t ON ra.tenant_id = t.id
      JOIN flats f ON ra.flat_id = f.id
      JOIN buildings b ON f.building_id = b.id
      LEFT JOIN payments p ON ra.id = p.rental_agreement_id
        AND p.payment_type = 'rent'
        AND DATE_TRUNC('month', p.payment_date) = DATE_TRUNC('month', CURRENT_DATE)
      WHERE ra.is_active = true
    `;

    const params = [];

    if (building_id) {
      params.push(building_id);
      query += ` AND b.id = $${params.length}`;
    }

    query += `
      GROUP BY ra.id, t.id, t.name, t.contact_number, b.name, f.flat_number,
               ra.rental_amount, ra.rental_period, ra.start_date
      HAVING (ra.rental_amount - COALESCE(SUM(p.amount), 0)) > 0
      ORDER BY b.name, f.flat_number
    `;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch pending payments' });
  }
});

// Get payment statistics
router.get('/stats', async (req, res) => {
  try {
    const { start_date, end_date, building_id } = req.query;

    let query = `
      SELECT
        COUNT(*) as total_payments,
        SUM(amount) as total_amount,
        SUM(CASE WHEN payment_type = 'rent' THEN amount ELSE 0 END) as rent_amount,
        SUM(CASE WHEN payment_type = 'advance' THEN amount ELSE 0 END) as advance_amount,
        SUM(CASE WHEN payment_type = 'other' THEN amount ELSE 0 END) as other_amount
      FROM payments
      WHERE 1=1
    `;

    const params = [];

    if (start_date) {
      params.push(start_date);
      query += ` AND payment_date >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      query += ` AND payment_date <= $${params.length}`;
    }

    if (building_id) {
      params.push(building_id);
      query += ` AND building_id = $${params.length}`;
    }

    const result = await db.query(query, params);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch payment statistics' });
  }
});

// Get single payment
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT p.*,
        t.name as tenant_name,
        b.name as building_name,
        f.flat_number
       FROM payments p
       LEFT JOIN tenants t ON p.tenant_id = t.id
       LEFT JOIN buildings b ON p.building_id = b.id
       LEFT JOIN rental_agreements ra ON p.rental_agreement_id = ra.id
       LEFT JOIN flats f ON ra.flat_id = f.id
       WHERE p.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch payment' });
  }
});

// Create new payment
router.post('/', async (req, res) => {
  try {
    const {
      rental_agreement_id,
      tenant_id,
      building_id,
      payment_date,
      amount,
      payment_type,
      payment_method,
      remarks
    } = req.body;

    if (!tenant_id || !building_id || !payment_date || !amount || !payment_type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await db.query(
      `INSERT INTO payments
        (rental_agreement_id, tenant_id, building_id, payment_date, amount,
         payment_type, payment_method, remarks)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [rental_agreement_id, tenant_id, building_id, payment_date, amount,
       payment_type, payment_method, remarks]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// Update payment
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_date, amount, payment_type, payment_method, remarks } = req.body;

    const result = await db.query(
      `UPDATE payments
       SET payment_date = COALESCE($1, payment_date),
           amount = COALESCE($2, amount),
           payment_type = COALESCE($3, payment_type),
           payment_method = COALESCE($4, payment_method),
           remarks = COALESCE($5, remarks)
       WHERE id = $6
       RETURNING *`,
      [payment_date, amount, payment_type, payment_method, remarks, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});

// Delete payment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM payments WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json({ message: 'Payment deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete payment' });
  }
});

module.exports = router;
