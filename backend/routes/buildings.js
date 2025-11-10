const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { authenticate, authorize } = require('../middleware/auth');

// Get all buildings
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT b.*,
        COUNT(DISTINCT f.id) as total_flats_count,
        COUNT(DISTINCT CASE WHEN f.is_occupied THEN f.id END) as occupied_flats,
        COUNT(DISTINCT CASE WHEN NOT f.is_occupied THEN f.id END) as vacant_flats
       FROM buildings b
       LEFT JOIN flats f ON b.id = f.building_id
       GROUP BY b.id
       ORDER BY b.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch buildings' });
  }
});

// Get single building
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT b.*,
        COUNT(DISTINCT f.id) as total_flats_count,
        COUNT(DISTINCT CASE WHEN f.is_occupied THEN f.id END) as occupied_flats,
        COUNT(DISTINCT CASE WHEN NOT f.is_occupied THEN f.id END) as vacant_flats
       FROM buildings b
       LEFT JOIN flats f ON b.id = f.building_id
       WHERE b.id = $1
       GROUP BY b.id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Building not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch building' });
  }
});

// Create new building
router.post('/', authenticate, authorize('admin'), async (req, res) => {
  const client = await db.pool.connect();
  try {
    const { name, address, total_flats, contact_number, other_details } = req.body;

    if (!name || !total_flats) {
      return res.status(400).json({ error: 'Name and total_flats are required' });
    }

    // Start transaction
    await client.query('BEGIN');

    // Insert building
    const buildingResult = await client.query(
      `INSERT INTO buildings (name, address, total_flats, contact_number, other_details)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, address, total_flats, contact_number, other_details]
    );

    const building = buildingResult.rows[0];

    // Create flats for this building
    const flatInserts = [];
    for (let i = 1; i <= total_flats; i++) {
      flatInserts.push(
        client.query(
          `INSERT INTO flats (building_id, flat_number, is_occupied)
           VALUES ($1, $2, $3)`,
          [building.id, i.toString(), false]
        )
      );
    }

    await Promise.all(flatInserts);
    await client.query('COMMIT');

    res.status(201).json(building);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Building creation error:', err.message, err.stack);
    res.status(500).json({ error: 'Failed to create building', details: err.message });
  } finally {
    client.release();
  }
});

// Update building
router.put('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, total_flats, contact_number, other_details } = req.body;

    const result = await db.query(
      `UPDATE buildings
       SET name = COALESCE($1, name),
           address = COALESCE($2, address),
           total_flats = COALESCE($3, total_flats),
           contact_number = COALESCE($4, contact_number),
           other_details = COALESCE($5, other_details)
       WHERE id = $6
       RETURNING *`,
      [name, address, total_flats, contact_number, other_details, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Building not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update building' });
  }
});

// Delete building
router.delete('/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM buildings WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Building not found' });
    }

    res.json({ message: 'Building deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete building' });
  }
});

module.exports = router;
