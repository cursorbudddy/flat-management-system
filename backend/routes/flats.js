const express = require('express');
const router = express.Router();
const db = require('../database/db');

// Get all flats for a building
router.get('/building/:buildingId', async (req, res) => {
  try {
    const { buildingId } = req.params;
    const result = await db.query(
      `SELECT f.*,
        ra.id as rental_agreement_id,
        t.name as tenant_name,
        t.id as tenant_id,
        ra.rental_amount,
        ra.start_date,
        ra.end_date
       FROM flats f
       LEFT JOIN rental_agreements ra ON f.id = ra.flat_id AND ra.is_active = true
       LEFT JOIN tenants t ON ra.tenant_id = t.id
       WHERE f.building_id = $1
       ORDER BY CAST(f.flat_number AS INTEGER)`,
      [buildingId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch flats' });
  }
});

// Get all flats (all buildings)
router.get('/', async (req, res) => {
  try {
    const { status } = req.query; // occupied, vacant, or all

    let query = `
      SELECT f.*,
        b.name as building_name,
        ra.id as rental_agreement_id,
        t.name as tenant_name,
        t.id as tenant_id,
        ra.rental_amount,
        ra.start_date,
        ra.end_date
       FROM flats f
       JOIN buildings b ON f.building_id = b.id
       LEFT JOIN rental_agreements ra ON f.id = ra.flat_id AND ra.is_active = true
       LEFT JOIN tenants t ON ra.tenant_id = t.id
    `;

    if (status === 'occupied') {
      query += ' WHERE f.is_occupied = true';
    } else if (status === 'vacant') {
      query += ' WHERE f.is_occupied = false';
    }

    query += ' ORDER BY b.name, CAST(f.flat_number AS INTEGER)';

    const result = await db.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch flats' });
  }
});

// Get single flat details
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT f.*,
        b.name as building_name,
        b.address as building_address,
        ra.id as rental_agreement_id,
        t.name as tenant_name,
        t.id as tenant_id,
        t.contact_number as tenant_contact,
        ra.rental_amount,
        ra.rental_period,
        ra.start_date,
        ra.end_date,
        ra.advance_amount
       FROM flats f
       JOIN buildings b ON f.building_id = b.id
       LEFT JOIN rental_agreements ra ON f.id = ra.flat_id AND ra.is_active = true
       LEFT JOIN tenants t ON ra.tenant_id = t.id
       WHERE f.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Flat not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch flat details' });
  }
});

// Get flat rental history
router.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT ra.*,
        t.name as tenant_name,
        t.id_number as tenant_id_number,
        t.contact_number as tenant_contact
       FROM rental_agreements ra
       JOIN tenants t ON ra.tenant_id = t.id
       WHERE ra.flat_id = $1
       ORDER BY ra.start_date DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch flat history' });
  }
});

// Update flat
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { flat_number, floor_number } = req.body;

    const result = await db.query(
      `UPDATE flats
       SET flat_number = COALESCE($1, flat_number),
           floor_number = COALESCE($2, floor_number)
       WHERE id = $3
       RETURNING *`,
      [flat_number, floor_number, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Flat not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update flat' });
  }
});

module.exports = router;
