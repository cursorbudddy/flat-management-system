const express = require('express');
const router = express.Router();
const db = require('../database/db');
const paymentScheduleGenerator = require('../utils/paymentScheduleGenerator');
const { cacheHelper } = require('../database/redis');

// Get payment schedules for a rental agreement
router.get('/:rentalId', async (req, res) => {
  try {
    const { rentalId } = req.params;

    const result = await db.query(
      `SELECT ps.*,
        ra.contract_number,
        ra.rental_amount as contract_rental_amount,
        ra.rental_period
      FROM payment_schedules ps
      JOIN rental_agreements ra ON ps.rental_agreement_id = ra.id
      WHERE ps.rental_agreement_id = $1
      ORDER BY ps.due_date ASC`,
      [rentalId]
    );

    // Update status based on current date
    const schedules = paymentScheduleGenerator.updateScheduleStatus(result.rows);

    res.json(schedules);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch payment schedules' });
  }
});

// Get overdue payment schedules
router.get('/overdue/all', async (req, res) => {
  try {
    const { building_id } = req.query;

    // Try cache first
    const cached = await cacheHelper.getOverduePayments(building_id);
    if (cached) {
      return res.json(cached);
    }

    let query = `
      SELECT ps.*,
        ra.contract_number,
        t.name as tenant_name,
        t.country_code || ' ' || t.contact_number as tenant_contact,
        b.name as building_name,
        b.id as building_id,
        f.flat_number,
        ra.rental_amount,
        ra.rental_period
      FROM payment_schedules ps
      JOIN rental_agreements ra ON ps.rental_agreement_id = ra.id
      JOIN tenants t ON ra.tenant_id = t.id
      JOIN flats f ON ra.flat_id = f.id
      JOIN buildings b ON ra.building_id = b.id
      WHERE ps.is_overdue = TRUE AND ra.is_active = TRUE
    `;

    const params = [];

    if (building_id) {
      params.push(building_id);
      query += ` AND b.id = $${params.length}`;
    }

    query += ' ORDER BY ps.days_overdue DESC, ps.due_date ASC';

    const result = await db.query(query, params);

    // Update status
    const schedules = paymentScheduleGenerator.updateScheduleStatus(result.rows);

    // Cache for 5 minutes
    await cacheHelper.setOverduePayments(schedules, building_id);

    res.json(schedules);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch overdue schedules' });
  }
});

// Get pending payment schedules
router.get('/pending/all', async (req, res) => {
  try {
    const { building_id } = req.query;

    let query = `
      SELECT ps.*,
        ra.contract_number,
        t.name as tenant_name,
        t.country_code || ' ' || t.contact_number as tenant_contact,
        b.name as building_name,
        b.id as building_id,
        f.flat_number,
        ra.rental_amount,
        ra.rental_period
      FROM payment_schedules ps
      JOIN rental_agreements ra ON ps.rental_agreement_id = ra.id
      JOIN tenants t ON ra.tenant_id = t.id
      JOIN flats f ON ra.flat_id = f.id
      JOIN buildings b ON ra.building_id = b.id
      WHERE ps.status IN ('pending', 'partial') AND ra.is_active = TRUE
    `;

    const params = [];

    if (building_id) {
      params.push(building_id);
      query += ` AND b.id = $${params.length}`;
    }

    query += ' ORDER BY ps.due_date ASC';

    const result = await db.query(query, params);

    // Update status
    const schedules = paymentScheduleGenerator.updateScheduleStatus(result.rows);

    res.json(schedules);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch pending schedules' });
  }
});

// Generate payment schedules for a rental agreement
router.post('/:rentalId/generate', async (req, res) => {
  try {
    const { rentalId } = req.params;

    // Get rental agreement
    const rentalResult = await db.query(
      'SELECT * FROM rental_agreements WHERE id = $1',
      [rentalId]
    );

    if (rentalResult.rows.length === 0) {
      return res.status(404).json({ error: 'Rental agreement not found' });
    }

    const rental = rentalResult.rows[0];

    // Check if schedules already exist
    const existingResult = await db.query(
      'SELECT COUNT(*) as count FROM payment_schedules WHERE rental_agreement_id = $1',
      [rentalId]
    );

    if (parseInt(existingResult.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Payment schedules already exist for this rental' });
    }

    // Generate schedules
    const schedules = paymentScheduleGenerator.generateSchedule(rental);

    // Insert schedules
    await db.query('BEGIN');

    for (const schedule of schedules) {
      await db.query(
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

    await db.query('COMMIT');

    res.status(201).json({
      message: 'Payment schedules generated successfully',
      count: schedules.length
    });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to generate payment schedules' });
  }
});

// Update payment schedule
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount_paid, late_fee } = req.body;

    const result = await db.query(
      `UPDATE payment_schedules
       SET amount_paid = COALESCE($1, amount_paid),
           late_fee = COALESCE($2, late_fee)
       WHERE id = $3
       RETURNING *`,
      [amount_paid, late_fee, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Payment schedule not found' });
    }

    // Invalidate cache
    await cacheHelper.invalidateOverdueCache();

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update payment schedule' });
  }
});

// Record payment for schedule (apply payment)
router.post('/:id/payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, payment_method, remarks } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid payment amount' });
    }

    await db.query('BEGIN');

    // Get schedule
    const scheduleResult = await db.query(
      'SELECT * FROM payment_schedules WHERE id = $1',
      [id]
    );

    if (scheduleResult.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ error: 'Payment schedule not found' });
    }

    const schedule = scheduleResult.rows[0];
    const newAmountPaid = parseFloat(schedule.amount_paid) + parseFloat(amount);

    // Update schedule
    await db.query(
      `UPDATE payment_schedules
       SET amount_paid = $1
       WHERE id = $2`,
      [newAmountPaid, id]
    );

    // Create payment record
    const paymentResult = await db.query(
      `INSERT INTO payments
        (rental_agreement_id, contract_number, tenant_id, building_id,
         payment_date, amount, payment_type, payment_method, remarks,
         billing_period_start, billing_period_end, is_partial)
      SELECT ra.id, ra.contract_number, ra.tenant_id, ra.building_id,
             CURRENT_DATE, $1, 'rent', $2, $3, $4, $5, $6
      FROM rental_agreements ra
      WHERE ra.id = $7
      RETURNING *`,
      [
        amount,
        payment_method,
        remarks,
        schedule.billing_period_start,
        schedule.billing_period_end,
        newAmountPaid < schedule.amount_due,
        schedule.rental_agreement_id
      ]
    );

    // Update schedule payment_id
    await db.query(
      'UPDATE payment_schedules SET payment_id = $1 WHERE id = $2',
      [paymentResult.rows[0].id, id]
    );

    await db.query('COMMIT');

    // Invalidate cache
    await cacheHelper.invalidateOverdueCache();
    await cacheHelper.invalidatePaymentsCache();

    res.status(201).json({
      message: 'Payment recorded successfully',
      payment: paymentResult.rows[0]
    });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Get next due payment for a rental
router.get('/:rentalId/next-due', async (req, res) => {
  try {
    const { rentalId } = req.params;

    const result = await db.query(
      `SELECT * FROM payment_schedules
       WHERE rental_agreement_id = $1 AND status != 'paid'
       ORDER BY due_date ASC
       LIMIT 1`,
      [rentalId]
    );

    if (result.rows.length === 0) {
      return res.json(null);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch next due payment' });
  }
});

module.exports = router;
