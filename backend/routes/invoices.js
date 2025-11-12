const express = require('express');
const router = express.Router();
const db = require('../database/db');
const invoiceGenerator = require('../utils/invoiceGenerator');
const { cacheHelper } = require('../database/redis');

// Get all invoices
router.get('/', async (req, res) => {
  try {
    const { contract_number, tenant_id, building_id, status, start_date, end_date } = req.query;

    let query = `
      SELECT i.*,
        t.name as tenant_name,
        b.name as building_name,
        f.flat_number,
        ra.contract_number
      FROM invoices i
      LEFT JOIN tenants t ON i.tenant_id = t.id
      LEFT JOIN buildings b ON i.building_id = b.id
      LEFT JOIN flats f ON i.flat_id = f.id
      LEFT JOIN rental_agreements ra ON i.rental_agreement_id = ra.id
      WHERE 1=1
    `;

    const params = [];

    if (contract_number) {
      params.push(contract_number);
      query += ` AND i.contract_number = $${params.length}`;
    }

    if (tenant_id) {
      params.push(tenant_id);
      query += ` AND i.tenant_id = $${params.length}`;
    }

    if (building_id) {
      params.push(building_id);
      query += ` AND i.building_id = $${params.length}`;
    }

    if (status) {
      params.push(status);
      query += ` AND i.payment_status = $${params.length}`;
    }

    if (start_date) {
      params.push(start_date);
      query += ` AND i.invoice_date >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      query += ` AND i.invoice_date <= $${params.length}`;
    }

    query += ' ORDER BY i.invoice_date DESC, i.created_at DESC';

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch invoices' });
  }
});

// Get single invoice
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query(
      `SELECT i.*,
        t.name as tenant_name,
        t.id_number as tenant_id_number,
        t.country_code,
        t.contact_number as tenant_contact,
        t.email as tenant_email,
        b.name as building_name,
        b.address as building_address,
        f.flat_number,
        ra.rental_amount as contract_rental_amount,
        ra.rental_period as contract_rental_period
      FROM invoices i
      LEFT JOIN tenants t ON i.tenant_id = t.id
      LEFT JOIN buildings b ON i.building_id = b.id
      LEFT JOIN flats f ON i.flat_id = f.id
      LEFT JOIN rental_agreements ra ON i.rental_agreement_id = ra.id
      WHERE i.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch invoice' });
  }
});

// Create new invoice and generate PDF
router.post('/', async (req, res) => {
  try {
    const {
      rental_agreement_id,
      tenant_id,
      building_id,
      flat_id,
      billing_period_start,
      billing_period_end,
      rental_amount,
      previous_balance = 0,
      late_fee = 0,
      fine_amount = 0,
      fine_description = '',
      additional_charges = 0,
      additional_charges_description = '',
      discount = 0,
      notes
    } = req.body;

    if (!rental_agreement_id || !tenant_id || !building_id || !flat_id || !rental_amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Start transaction
    await db.query('BEGIN');

    // Get contract number
    const contractResult = await db.query(
      'SELECT contract_number FROM rental_agreements WHERE id = $1',
      [rental_agreement_id]
    );

    if (contractResult.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ error: 'Rental agreement not found' });
    }

    const contract_number = contractResult.rows[0].contract_number;

    // Calculate totals
    const total_amount = parseFloat(rental_amount) + parseFloat(previous_balance) + parseFloat(late_fee) + parseFloat(fine_amount) + parseFloat(additional_charges) - parseFloat(discount);
    const balance_amount = total_amount; // No payment received yet

    // Calculate due date (7 days from invoice date)
    const invoice_date = new Date();
    const due_date = new Date(invoice_date);
    due_date.setDate(due_date.getDate() + 7);

    // Create invoice
    const invoiceResult = await db.query(
      `INSERT INTO invoices
        (contract_number, rental_agreement_id, tenant_id, building_id, flat_id,
         invoice_date, due_date, billing_period_start, billing_period_end,
         rental_amount, previous_balance, payment_received, late_fee,
         fine_amount, fine_description, additional_charges, additional_charges_description,
         discount, total_amount, balance_amount, payment_status, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
      RETURNING *`,
      [
        contract_number, rental_agreement_id, tenant_id, building_id, flat_id,
        invoice_date, due_date, billing_period_start, billing_period_end,
        rental_amount, previous_balance, 0, late_fee,
        fine_amount, fine_description, additional_charges, additional_charges_description,
        discount, total_amount, balance_amount, 'pending', notes
      ]
    );

    const invoice = invoiceResult.rows[0];

    // Get full invoice data for PDF generation
    const fullInvoiceResult = await db.query(
      `SELECT i.*,
        t.name as tenant_name,
        t.id_number as tenant_id_number,
        t.country_code,
        t.contact_number as tenant_contact,
        t.email as tenant_email,
        b.name as building_name,
        b.address as building_address,
        f.flat_number,
        ra.rental_amount as contract_rental_amount,
        ra.rental_period as contract_rental_period,
        ra.contract_number
      FROM invoices i
      JOIN tenants t ON i.tenant_id = t.id
      JOIN buildings b ON i.building_id = b.id
      JOIN flats f ON i.flat_id = f.id
      JOIN rental_agreements ra ON i.rental_agreement_id = ra.id
      WHERE i.id = $1`,
      [invoice.id]
    );

    const fullInvoice = fullInvoiceResult.rows[0];

    // Get recent payments (last 4)
    const recentPaymentsResult = await db.query(
      `SELECT * FROM payments
       WHERE tenant_id = $1 AND rental_agreement_id = $2 AND payment_status = 'completed'
       ORDER BY payment_date DESC LIMIT 4`,
      [tenant_id, rental_agreement_id]
    );

    // Generate PDF
    try {
      const pdfPath = await invoiceGenerator.generateInvoice(
        fullInvoice,
        {
          contract_number: fullInvoice.contract_number,
          rental_amount: fullInvoice.contract_rental_amount,
          rental_period: fullInvoice.contract_rental_period
        },
        {
          name: fullInvoice.tenant_name,
          id_number: fullInvoice.tenant_id_number,
          country_code: fullInvoice.country_code,
          contact_number: fullInvoice.tenant_contact,
          email: fullInvoice.tenant_email
        },
        {
          name: fullInvoice.building_name,
          address: fullInvoice.building_address
        },
        {
          flat_number: fullInvoice.flat_number
        },
        recentPaymentsResult.rows
      );

      // Update invoice with PDF path
      await db.query(
        'UPDATE invoices SET pdf_path = $1 WHERE id = $2',
        [pdfPath, invoice.id]
      );

      invoice.pdf_path = pdfPath;
    } catch (pdfError) {
      console.error('PDF generation failed:', pdfError);
      // Continue even if PDF generation fails
    }

    await db.query('COMMIT');

    res.status(201).json(invoice);
  } catch (err) {
    await db.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Failed to create invoice' });
  }
});

// Update invoice (mainly for payment status)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_received, payment_status, notes } = req.body;

    // Get current invoice
    const currentResult = await db.query('SELECT * FROM invoices WHERE id = $1', [id]);

    if (currentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const current = currentResult.rows[0];
    const newPaymentReceived = payment_received !== undefined ? payment_received : current.payment_received;
    const newBalance = parseFloat(current.total_amount) - parseFloat(newPaymentReceived);

    // Determine status
    let newStatus = payment_status;
    if (!newStatus) {
      if (newBalance <= 0) {
        newStatus = 'paid';
      } else if (newPaymentReceived > 0) {
        newStatus = 'partial';
      } else if (new Date() > new Date(current.due_date)) {
        newStatus = 'overdue';
      } else {
        newStatus = 'pending';
      }
    }

    const result = await db.query(
      `UPDATE invoices
       SET payment_received = COALESCE($1, payment_received),
           balance_amount = $2,
           payment_status = $3,
           notes = COALESCE($4, notes)
       WHERE id = $5
       RETURNING *`,
      [newPaymentReceived, newBalance, newStatus, notes, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update invoice' });
  }
});

// Download invoice PDF
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.query(
      'SELECT invoice_number, pdf_path FROM invoices WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const invoice = result.rows[0];

    if (!invoice.pdf_path) {
      return res.status(404).json({ error: 'Invoice PDF not generated' });
    }

    const filePath = invoiceGenerator.getInvoicePath(invoice.invoice_number);

    if (!invoiceGenerator.invoiceExists(invoice.invoice_number)) {
      return res.status(404).json({ error: 'Invoice PDF file not found' });
    }

    res.download(filePath, `${invoice.invoice_number}.pdf`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to download invoice' });
  }
});

// Delete invoice
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM invoices WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    res.json({ message: 'Invoice deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete invoice' });
  }
});

module.exports = router;
