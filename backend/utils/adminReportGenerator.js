const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const db = require('../database/db');

class AdminReportGenerator {
  /**
   * Generate comprehensive admin report
   * @param {string} startDate - Report start date
   * @param {string} endDate - Report end date
   * @param {number} buildingId - Optional building filter
   * @returns {Promise<string>} - Path to generated PDF
   */
  async generateReport(startDate, endDate, buildingId = null) {
    try {
      // Fetch all report data
      const data = await this._fetchReportData(startDate, endDate, buildingId);

      // Generate PDF
      const filename = `admin-report-${moment(startDate).format('YYYYMMDD')}-${moment(endDate).format('YYYYMMDD')}.pdf`;
      const filepath = path.join(__dirname, '../reports', filename);

      // Ensure reports directory exists
      const reportsDir = path.join(__dirname, '../reports');
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
      }

      await this._createPDF(data, filepath, startDate, endDate);

      return filepath;
    } catch (error) {
      console.error('Report generation error:', error);
      throw new Error('Failed to generate report');
    }
  }

  /**
   * Fetch all data needed for the report
   */
  async _fetchReportData(startDate, endDate, buildingId) {
    const buildingFilter = buildingId ? `AND b.id = ${buildingId}` : '';

    // Get building summary
    const buildingsQuery = `
      SELECT
        b.id,
        b.name,
        b.address,
        COUNT(DISTINCT f.id) as total_flats,
        COUNT(DISTINCT CASE WHEN f.is_occupied THEN f.id END) as occupied_flats,
        COUNT(DISTINCT CASE WHEN NOT f.is_occupied THEN f.id END) as vacant_flats,
        COUNT(DISTINCT ra.id) FILTER (WHERE ra.is_active) as active_rentals
      FROM buildings b
      LEFT JOIN flats f ON b.id = f.building_id
      LEFT JOIN rental_agreements ra ON f.id = ra.flat_id AND ra.is_active = true
      WHERE 1=1 ${buildingFilter}
      GROUP BY b.id, b.name, b.address
      ORDER BY b.name
    `;
    const buildingsResult = await db.query(buildingsQuery);

    // Get tenant summary
    const tenantsQuery = `
      SELECT
        t.id,
        t.name,
        t.id_number,
        t.nationality,
        t.country_code,
        t.contact_number,
        t.email,
        ra.contract_number,
        ra.start_date,
        ra.end_date,
        ra.rental_amount,
        ra.rental_period,
        f.flat_number,
        b.name as building_name,
        COALESCE(SUM(p.amount), 0) as total_paid
      FROM tenants t
      JOIN rental_agreements ra ON t.id = ra.tenant_id
      JOIN flats f ON ra.flat_id = f.id
      JOIN buildings b ON f.building_id = b.id
      LEFT JOIN payments p ON ra.id = p.rental_agreement_id
        AND p.payment_date BETWEEN $1 AND $2
      WHERE ra.is_active = true
        ${buildingFilter.replace('b.id', 'b.id')}
      GROUP BY t.id, t.name, t.id_number, t.nationality, t.country_code,
               t.contact_number, t.email, ra.contract_number, ra.start_date,
               ra.end_date, ra.rental_amount, ra.rental_period,
               f.flat_number, b.name
      ORDER BY b.name, f.flat_number
    `;
    const tenantsResult = await db.query(tenantsQuery, [startDate, endDate]);

    // Get payment summary
    const paymentsQuery = `
      SELECT
        DATE(p.payment_date) as payment_date,
        p.amount,
        p.payment_method,
        p.payment_type,
        t.name as tenant_name,
        f.flat_number,
        b.name as building_name,
        ra.contract_number
      FROM payments p
      LEFT JOIN rental_agreements ra ON p.rental_agreement_id = ra.id
      LEFT JOIN tenants t ON p.tenant_id = t.id
      LEFT JOIN flats f ON ra.flat_id = f.id
      LEFT JOIN buildings b ON p.building_id = b.id
      WHERE p.payment_date BETWEEN $1 AND $2
        ${buildingFilter.replace('b.id', 'b.id')}
      ORDER BY p.payment_date DESC
    `;
    const paymentsResult = await db.query(paymentsQuery, [startDate, endDate]);

    // Get expense summary
    const expensesQuery = `
      SELECT
        DATE(e.expense_date) as expense_date,
        e.amount,
        e.category,
        e.description,
        e.payment_method,
        e.approval_status,
        b.name as building_name
      FROM expenses e
      LEFT JOIN buildings b ON e.building_id = b.id
      WHERE e.expense_date BETWEEN $1 AND $2
        AND e.approval_status = 'approved'
        ${buildingFilter.replace('b.id', 'b.id')}
      ORDER BY e.expense_date DESC
    `;
    const expensesResult = await db.query(expensesQuery, [startDate, endDate]);

    // Get financial summary
    const financialQuery = `
      SELECT
        COALESCE(SUM(p.amount), 0) as total_income,
        COALESCE((
          SELECT SUM(e.amount)
          FROM expenses e
          WHERE e.expense_date BETWEEN $1 AND $2
            AND e.approval_status = 'approved'
            ${buildingFilter.replace('b.id', 'e.building_id')}
        ), 0) as total_expenses
      FROM payments p
      LEFT JOIN buildings b ON p.building_id = b.id
      WHERE p.payment_date BETWEEN $1 AND $2
        ${buildingFilter.replace('b.id', 'b.id')}
    `;
    const financialResult = await db.query(financialQuery, [startDate, endDate]);

    return {
      buildings: buildingsResult.rows,
      tenants: tenantsResult.rows,
      payments: paymentsResult.rows,
      expenses: expensesResult.rows,
      financial: financialResult.rows[0]
    };
  }

  /**
   * Create PDF document
   */
  async _createPDF(data, filepath, startDate, endDate) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50, size: 'A4' });
        const stream = fs.createWriteStream(filepath);

        doc.pipe(stream);

        // Header
        this._addHeader(doc, startDate, endDate);

        // Financial Summary
        this._addFinancialSummary(doc, data.financial);

        // Building Summary
        this._addBuildingSummary(doc, data.buildings);

        // Tenant Details
        this._addTenantDetails(doc, data.tenants);

        // Payment Details
        this._addPaymentDetails(doc, data.payments);

        // Expense Details
        this._addExpenseDetails(doc, data.expenses);

        // Footer
        this._addFooter(doc);

        doc.end();

        stream.on('finish', () => resolve(filepath));
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  _addHeader(doc, startDate, endDate) {
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('Comprehensive Management Report', { align: 'center' })
      .fontSize(12)
      .font('Helvetica')
      .moveDown(0.5)
      .text(`Report Period: ${moment(startDate).format('MMM DD, YYYY')} - ${moment(endDate).format('MMM DD, YYYY')}`, { align: 'center' })
      .text(`Generated: ${moment().format('MMM DD, YYYY HH:mm')}`, { align: 'center' })
      .moveDown(2);
  }

  _addFinancialSummary(doc, financial) {
    const totalIncome = parseFloat(financial.total_income || 0);
    const totalExpenses = parseFloat(financial.total_expenses || 0);
    const netIncome = totalIncome - totalExpenses;

    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Financial Summary', { underline: true })
      .moveDown(0.5)
      .fontSize(12)
      .font('Helvetica');

    const startY = doc.y;
    const leftX = 100;
    const rightX = 350;

    doc
      .text('Total Income:', leftX, startY)
      .text(this._formatCurrency(totalIncome), rightX, startY, { align: 'right' })
      .moveDown(0.5)
      .text('Total Expenses:', leftX)
      .text(this._formatCurrency(totalExpenses), rightX, doc.y - 15, { align: 'right' })
      .moveDown(0.5)
      .strokeColor('#000')
      .lineWidth(1)
      .moveTo(leftX, doc.y)
      .lineTo(rightX + 100, doc.y)
      .stroke()
      .moveDown(0.3)
      .font('Helvetica-Bold')
      .text('Net Income:', leftX)
      .text(this._formatCurrency(netIncome), rightX, doc.y - 15, { align: 'right', color: netIncome >= 0 ? 'green' : 'red' })
      .moveDown(2);
  }

  _addBuildingSummary(doc, buildings) {
    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .text('Building Summary', { underline: true })
      .moveDown(0.5)
      .fontSize(10)
      .font('Helvetica');

    if (buildings.length === 0) {
      doc.text('No buildings found.').moveDown(2);
      return;
    }

    buildings.forEach((building, index) => {
      if (index > 0) doc.moveDown(0.5);

      doc
        .font('Helvetica-Bold')
        .text(`${building.name}`)
        .font('Helvetica')
        .text(`Address: ${building.address || 'N/A'}`)
        .text(`Total Flats: ${building.total_flats} | Occupied: ${building.occupied_flats} | Vacant: ${building.vacant_flats}`)
        .text(`Active Rentals: ${building.active_rentals}`);
    });

    doc.moveDown(2);
  }

  _addTenantDetails(doc, tenants) {
    doc
      .addPage()
      .font('Helvetica-Bold')
      .fontSize(16)
      .text('Tenant Details', { underline: true })
      .moveDown(0.5)
      .fontSize(10)
      .font('Helvetica');

    if (tenants.length === 0) {
      doc.text('No active tenants found.').moveDown(2);
      return;
    }

    tenants.forEach((tenant, index) => {
      // Check if we need a new page
      if (doc.y > 700) {
        doc.addPage().fontSize(10);
      }

      if (index > 0) doc.moveDown(0.8);

      doc
        .font('Helvetica-Bold')
        .text(`${index + 1}. ${tenant.name}`)
        .font('Helvetica')
        .text(`Contract: ${tenant.contract_number} | ID: ${tenant.id_number}`)
        .text(`Building: ${tenant.building_name} | Flat: ${tenant.flat_number}`)
        .text(`Contact: ${tenant.country_code || ''} ${tenant.contact_number || 'N/A'}`)
        .text(`Rental: ${this._formatCurrency(tenant.rental_amount)} per ${tenant.rental_period}`)
        .text(`Period: ${moment(tenant.start_date).format('MMM DD, YYYY')} - ${moment(tenant.end_date).format('MMM DD, YYYY')}`)
        .text(`Total Paid (Period): ${this._formatCurrency(tenant.total_paid)}`);
    });

    doc.moveDown(2);
  }

  _addPaymentDetails(doc, payments) {
    doc
      .addPage()
      .font('Helvetica-Bold')
      .fontSize(16)
      .text('Payment Details', { underline: true })
      .moveDown(0.5)
      .fontSize(9)
      .font('Helvetica');

    if (payments.length === 0) {
      doc.text('No payments found for this period.').moveDown(2);
      return;
    }

    // Table header
    doc
      .font('Helvetica-Bold')
      .text('Date', 60, doc.y, { width: 70, continued: true })
      .text('Tenant', { width: 120, continued: true })
      .text('Flat', { width: 60, continued: true })
      .text('Method', { width: 70, continued: true })
      .text('Amount', { width: 80, align: 'right' })
      .moveDown(0.3)
      .strokeColor('#000')
      .lineWidth(0.5)
      .moveTo(60, doc.y)
      .lineTo(550, doc.y)
      .stroke()
      .moveDown(0.3);

    let totalAmount = 0;
    payments.forEach((payment) => {
      // Check if we need a new page
      if (doc.y > 720) {
        doc.addPage().fontSize(9).moveDown(0.5);
      }

      const y = doc.y;
      doc
        .font('Helvetica')
        .text(moment(payment.payment_date).format('MMM DD'), 60, y, { width: 70, continued: true })
        .text(payment.tenant_name || 'N/A', { width: 120, continued: true })
        .text(payment.flat_number || 'N/A', { width: 60, continued: true })
        .text(payment.payment_method || 'N/A', { width: 70, continued: true })
        .text(this._formatCurrency(payment.amount), { width: 80, align: 'right' })
        .moveDown(0.2);

      totalAmount += parseFloat(payment.amount || 0);
    });

    doc
      .moveDown(0.5)
      .strokeColor('#000')
      .lineWidth(0.5)
      .moveTo(400, doc.y)
      .lineTo(550, doc.y)
      .stroke()
      .moveDown(0.3)
      .font('Helvetica-Bold')
      .text('Total Payments:', 400, doc.y, { width: 70, continued: true })
      .text(this._formatCurrency(totalAmount), { width: 80, align: 'right' })
      .moveDown(2);
  }

  _addExpenseDetails(doc, expenses) {
    doc
      .addPage()
      .font('Helvetica-Bold')
      .fontSize(16)
      .text('Expense Details', { underline: true })
      .moveDown(0.5)
      .fontSize(9)
      .font('Helvetica');

    if (expenses.length === 0) {
      doc.text('No approved expenses found for this period.').moveDown(2);
      return;
    }

    // Table header
    doc
      .font('Helvetica-Bold')
      .text('Date', 60, doc.y, { width: 70, continued: true })
      .text('Category', { width: 100, continued: true })
      .text('Description', { width: 150, continued: true })
      .text('Building', { width: 100, continued: true })
      .text('Amount', { width: 80, align: 'right' })
      .moveDown(0.3)
      .strokeColor('#000')
      .lineWidth(0.5)
      .moveTo(60, doc.y)
      .lineTo(550, doc.y)
      .stroke()
      .moveDown(0.3);

    let totalAmount = 0;
    expenses.forEach((expense) => {
      // Check if we need a new page
      if (doc.y > 720) {
        doc.addPage().fontSize(9).moveDown(0.5);
      }

      const y = doc.y;
      doc
        .font('Helvetica')
        .text(moment(expense.expense_date).format('MMM DD'), 60, y, { width: 70, continued: true })
        .text(expense.category || 'N/A', { width: 100, continued: true })
        .text(expense.description || 'N/A', { width: 150, continued: true })
        .text(expense.building_name || 'General', { width: 100, continued: true })
        .text(this._formatCurrency(expense.amount), { width: 80, align: 'right' })
        .moveDown(0.2);

      totalAmount += parseFloat(expense.amount || 0);
    });

    doc
      .moveDown(0.5)
      .strokeColor('#000')
      .lineWidth(0.5)
      .moveTo(400, doc.y)
      .lineTo(550, doc.y)
      .stroke()
      .moveDown(0.3)
      .font('Helvetica-Bold')
      .text('Total Expenses:', 400, doc.y, { width: 70, continued: true })
      .text(this._formatCurrency(totalAmount), { width: 80, align: 'right' });
  }

  _addFooter(doc) {
    doc
      .fontSize(8)
      .font('Helvetica')
      .text(
        'This is a system-generated report. All amounts are in USD unless specified otherwise.',
        50,
        doc.page.height - 50,
        { align: 'center', width: doc.page.width - 100 }
      );
  }

  _formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  }
}

module.exports = new AdminReportGenerator();
