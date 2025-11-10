const express = require('express');
const router = express.Router();
const db = require('../database/db');
const paymentScheduleGenerator = require('../utils/paymentScheduleGenerator');
const { optionalAuth, authenticate, checkEditPermission } = require('../middleware/auth');

// Get current month rentals
router.get('/current-month', async (req, res) => {
  try {
    const { building_id } = req.query;

    let query = `
      SELECT ra.*,
        t.name as tenant_name,
        t.id_number as tenant_id_number,
        t.nationality as tenant_nationality,
        t.country_code || ' ' || t.contact_number as tenant_contact,
        t.email as tenant_email,
        f.flat_number,
        b.name as building_name,
        b.id as building_id
       FROM rental_agreements ra
       JOIN tenants t ON ra.tenant_id = t.id
       JOIN flats f ON ra.flat_id = f.id
       JOIN buildings b ON f.building_id = b.id
       WHERE ra.is_active = TRUE
         AND ra.start_date <= DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'
         AND (ra.end_date >= DATE_TRUNC('month', CURRENT_DATE) OR ra.end_date IS NULL)
    `;

    const params = [];

    if (building_id) {
      params.push(building_id);
      query += ` AND b.id = $${params.length}`;
    }

    query += ' ORDER BY ra.start_date DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch current month rentals' });
  }
});

// Get latest rental agreement
router.get('/latest', async (req, res) => {
  try {
    const { building_id } = req.query;

    let query = `
      SELECT ra.*,
        t.name as tenant_name,
        t.id_number as tenant_id_number,
        t.nationality as tenant_nationality,
        t.country_code as tenant_country_code,
        t.contact_number as tenant_contact_number,
        t.email as tenant_email,
        f.flat_number,
        b.name as building_name,
        b.address as building_address,
        b.id as building_id
       FROM rental_agreements ra
       JOIN tenants t ON ra.tenant_id = t.id
       JOIN flats f ON ra.flat_id = f.id
       JOIN buildings b ON f.building_id = b.id
       WHERE DATE(ra.created_at) = CURRENT_DATE
    `;

    const params = [];

    if (building_id) {
      params.push(building_id);
      query += ` AND b.id = $${params.length}`;
    }

    query += ' ORDER BY ra.created_at DESC LIMIT 1';

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return res.json(null);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch latest rental agreement' });
  }
});

// Get all rental agreements
router.get('/', async (req, res) => {
  try {
    const { is_active, building_id } = req.query;

    let query = `
      SELECT ra.*,
        t.name as tenant_name,
        t.id_number as tenant_id_number,
        t.contact_number as tenant_contact,
        f.flat_number,
        b.name as building_name,
        b.id as building_id
       FROM rental_agreements ra
       JOIN tenants t ON ra.tenant_id = t.id
       JOIN flats f ON ra.flat_id = f.id
       JOIN buildings b ON f.building_id = b.id
       WHERE 1=1
    `;

    const params = [];

    if (is_active !== undefined) {
      params.push(is_active === 'true');
      query += ` AND ra.is_active = $${params.length}`;
    }

    if (building_id) {
      params.push(building_id);
      query += ` AND b.id = $${params.length}`;
    }

    query += ' ORDER BY ra.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch rental agreements' });
  }
});

// Get single rental agreement
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT ra.*,
        t.name as tenant_name,
        t.id_number as tenant_id_number,
        t.contact_number as tenant_contact,
        t.nationality as tenant_nationality,
        f.flat_number,
        b.name as building_name,
        b.address as building_address
       FROM rental_agreements ra
       JOIN tenants t ON ra.tenant_id = t.id
       JOIN flats f ON ra.flat_id = f.id
       JOIN buildings b ON f.building_id = b.id
       WHERE ra.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rental agreement not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch rental agreement' });
  }
});

// Create new rental agreement
router.post('/', optionalAuth, async (req, res) => {
  const client = await db.pool.connect();
  try {
    const {
      tenant_id,
      flat_id,
      building_id,
      start_date,
      duration_value,
      duration_unit,
      rental_amount,
      rental_period,
      advance_amount
    } = req.body;

    const created_by = req.user ? req.user.id : null;

    if (!tenant_id || !flat_id || !building_id || !start_date || !duration_value || !duration_unit || !rental_amount || !rental_period) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Calculate end date based on duration
    let end_date;
    const startDateObj = new Date(start_date);
    if (duration_unit === 'days') {
      end_date = new Date(startDateObj);
      end_date.setDate(end_date.getDate() + parseInt(duration_value));
    } else if (duration_unit === 'months') {
      end_date = new Date(startDateObj);
      end_date.setMonth(end_date.getMonth() + parseInt(duration_value));
    }

    // Start transaction
    await client.query('BEGIN');

    // Check if flat is already occupied
    const flatCheck = await client.query(
      'SELECT is_occupied FROM flats WHERE id = $1',
      [flat_id]
    );

    if (flatCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Flat not found' });
    }

    if (flatCheck.rows[0].is_occupied) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Flat is already occupied' });
    }

    // Create rental agreement (created_by and can_edit_until are set by trigger)
    const result = await client.query(
      `INSERT INTO rental_agreements
        (tenant_id, flat_id, building_id, start_date, end_date, duration_value,
         duration_unit, rental_amount, rental_period, advance_amount, is_active, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [tenant_id, flat_id, building_id, start_date, end_date, duration_value,
       duration_unit, rental_amount, rental_period, advance_amount || 0, true, created_by]
    );

    // Mark flat as occupied
    await client.query(
      'UPDATE flats SET is_occupied = true WHERE id = $1',
      [flat_id]
    );

    // Record advance payment if provided
    if (advance_amount && advance_amount > 0) {
      await client.query(
        `INSERT INTO payments (rental_agreement_id, tenant_id, building_id, payment_date,
                               amount, payment_type, remarks)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [result.rows[0].id, tenant_id, building_id, start_date, advance_amount, 'advance', 'Initial advance payment']
      );
    }

    // Auto-generate payment schedules
    const schedules = paymentScheduleGenerator.generateSchedule(result.rows[0]);

    // Insert schedules into database
    for (const schedule of schedules) {
      await client.query(
        `INSERT INTO payment_schedules
          (rental_agreement_id, contract_number, due_date, billing_period_start,
           billing_period_end, amount_due, amount_paid, balance, status,
           is_overdue, days_overdue, late_fee)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          schedule.rental_agreement_id,
          schedule.contract_number,
          schedule.due_date,
          schedule.billing_period_start,
          schedule.billing_period_end,
          schedule.amount_due,
          schedule.amount_paid,
          schedule.balance,
          schedule.status,
          schedule.is_overdue,
          schedule.days_overdue,
          schedule.late_fee
        ]
      );
    }

    await client.query('COMMIT');

    res.status(201).json(result.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create rental agreement' });
  } finally {
    client.release();
  }
});

// Update rental agreement
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { end_date, rental_amount, is_active } = req.body;

    const result = await db.query(
      `UPDATE rental_agreements
       SET end_date = COALESCE($1, end_date),
           rental_amount = COALESCE($2, rental_amount),
           is_active = COALESCE($3, is_active)
       WHERE id = $4
       RETURNING *`,
      [end_date, rental_amount, is_active, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rental agreement not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update rental agreement' });
  }
});

// End rental agreement (vacate flat)
router.post('/:id/end', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;
    const { end_date } = req.body;

    const actualEndDate = end_date || new Date().toISOString().split('T')[0];

    // Start transaction
    await client.query('BEGIN');

    // Get rental agreement details
    const rentalResult = await client.query(
      'SELECT flat_id FROM rental_agreements WHERE id = $1',
      [id]
    );

    if (rentalResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Rental agreement not found' });
    }

    const flatId = rentalResult.rows[0].flat_id;

    // Update rental agreement
    await client.query(
      `UPDATE rental_agreements
       SET is_active = false, end_date = $1
       WHERE id = $2`,
      [actualEndDate, id]
    );

    // Mark flat as vacant
    await client.query(
      'UPDATE flats SET is_occupied = false WHERE id = $1',
      [flatId]
    );

    await client.query('COMMIT');

    res.json({ message: 'Rental agreement ended successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to end rental agreement' });
  } finally {
    client.release();
  }
});

// Delete rental agreement
router.delete('/:id', async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { id } = req.params;

    // Start transaction
    await client.query('BEGIN');

    // Get flat_id before deletion
    const rentalResult = await client.query(
      'SELECT flat_id FROM rental_agreements WHERE id = $1',
      [id]
    );

    if (rentalResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Rental agreement not found' });
    }

    const flatId = rentalResult.rows[0].flat_id;

    // Delete rental agreement (payments will be cascaded)
    await client.query('DELETE FROM rental_agreements WHERE id = $1', [id]);

    // Mark flat as vacant
    await client.query(
      'UPDATE flats SET is_occupied = false WHERE id = $1',
      [flatId]
    );

    await client.query('COMMIT');

    res.json({ message: 'Rental agreement deleted successfully' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to delete rental agreement' });
  } finally {
    client.release();
  }
});

module.exports = router;
