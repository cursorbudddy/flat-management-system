const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const { optionalAuth } = require('../middleware/auth');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads/id-documents');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'ID-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only .png, .jpg, .jpeg and .pdf formats are allowed!'));
    }
  }
});

// Get all tenants
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      `SELECT t.*,
        ra.id as current_rental_id,
        ra.flat_id,
        f.flat_number,
        b.name as building_name,
        ra.is_active as is_currently_renting
       FROM tenants t
       LEFT JOIN rental_agreements ra ON t.id = ra.tenant_id AND ra.is_active = true
       LEFT JOIN flats f ON ra.flat_id = f.id
       LEFT JOIN buildings b ON f.building_id = b.id
       ORDER BY t.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tenants' });
  }
});

// Get single tenant
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT t.*,
        ra.id as current_rental_id,
        ra.flat_id,
        f.flat_number,
        b.name as building_name,
        b.id as building_id,
        ra.rental_amount,
        ra.rental_period,
        ra.start_date,
        ra.end_date,
        ra.advance_amount
       FROM tenants t
       LEFT JOIN rental_agreements ra ON t.id = ra.tenant_id AND ra.is_active = true
       LEFT JOIN flats f ON ra.flat_id = f.id
       LEFT JOIN buildings b ON f.building_id = b.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch tenant' });
  }
});

// Get tenant payment history
router.get('/:id/payments', async (req, res) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;

    let query = `
      SELECT p.*,
        b.name as building_name,
        f.flat_number,
        ra.rental_amount
       FROM payments p
       LEFT JOIN rental_agreements ra ON p.rental_agreement_id = ra.id
       LEFT JOIN flats f ON ra.flat_id = f.id
       LEFT JOIN buildings b ON f.building_id = b.id
       WHERE p.tenant_id = $1
    `;

    const params = [id];

    if (start_date) {
      params.push(start_date);
      query += ` AND p.payment_date >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      query += ` AND p.payment_date <= $${params.length}`;
    }

    query += ' ORDER BY p.payment_date DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// Get tenant rental history
router.get('/:id/rentals', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT ra.*,
        f.flat_number,
        b.name as building_name,
        b.address as building_address
       FROM rental_agreements ra
       JOIN flats f ON ra.flat_id = f.id
       JOIN buildings b ON f.building_id = b.id
       WHERE ra.tenant_id = $1
       ORDER BY ra.start_date DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch rental history' });
  }
});

// Create new tenant (with optional file upload)
router.post('/', optionalAuth, upload.single('id_document'), async (req, res) => {
  try {
    const { name, id_number, nationality, country_code, contact_number, email } = req.body;

    if (!name || !id_number) {
      return res.status(400).json({ error: 'Name and ID number are required' });
    }

    const id_document_path = req.file ? `/uploads/id-documents/${req.file.filename}` : null;
    const created_by = req.user ? req.user.id : null;

    const result = await db.query(
      `INSERT INTO tenants (name, id_number, nationality, country_code, contact_number, email, id_document_path, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, id_number, nationality, country_code, contact_number, email, id_document_path, created_by]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') { // Unique constraint violation
      return res.status(400).json({ error: 'Tenant with this ID number already exists' });
    }
    res.status(500).json({ error: 'Failed to create tenant' });
  }
});

// Update tenant
router.put('/:id', upload.single('id_document'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, id_number, nationality, contact_number, email } = req.body;

    let id_document_path = undefined;
    if (req.file) {
      id_document_path = `/uploads/id-documents/${req.file.filename}`;
    }

    const result = await db.query(
      `UPDATE tenants
       SET name = COALESCE($1, name),
           id_number = COALESCE($2, id_number),
           nationality = COALESCE($3, nationality),
           contact_number = COALESCE($4, contact_number),
           email = COALESCE($5, email),
           id_document_path = COALESCE($6, id_document_path)
       WHERE id = $7
       RETURNING *`,
      [name, id_number, nationality, contact_number, email, id_document_path, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

// Delete tenant
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM tenants WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Delete associated ID document file if exists
    if (result.rows[0].id_document_path) {
      const filePath = path.join(__dirname, '..', result.rows[0].id_document_path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    res.json({ message: 'Tenant deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
});

module.exports = router;
