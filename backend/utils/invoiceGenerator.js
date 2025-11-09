const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

class InvoiceGenerator {
  constructor() {
    this.invoicesDir = path.join(__dirname, '../invoices');

    // Create invoices directory if it doesn't exist
    if (!fs.existsSync(this.invoicesDir)) {
      fs.mkdirSync(this.invoicesDir, { recursive: true });
    }
  }

  /**
   * Generate invoice PDF
   * @param {Object} invoiceData - Invoice data
   * @param {Object} contractData - Contract/rental agreement data
   * @param {Object} tenantData - Tenant data
   * @param {Object} buildingData - Building data
   * @param {Array} recentPayments - Last 4 payments
   * @returns {Promise<string>} - Path to generated PDF
   */
  async generateInvoice(invoiceData, contractData, tenantData, buildingData, flatData, recentPayments = []) {
    return new Promise((resolve, reject) => {
      try {
        const fileName = `${invoiceData.invoice_number}.pdf`;
        const filePath = path.join(this.invoicesDir, fileName);

        // Create PDF document
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: 50,
            bottom: 50,
            left: 50,
            right: 50
          }
        });

        // Pipe to file
        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        // Add content
        this._addHeader(doc);
        this._addInvoiceInfo(doc, invoiceData, contractData);
        this._addTenantInfo(doc, tenantData, buildingData, flatData);
        this._addPaymentDetails(doc, invoiceData, contractData);
        this._addRecentPayments(doc, recentPayments);
        this._addFooter(doc, invoiceData);

        // Finalize PDF
        doc.end();

        writeStream.on('finish', () => {
          resolve(`/invoices/${fileName}`);
        });

        writeStream.on('error', (error) => {
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  _addHeader(doc) {
    // Company/App Header
    doc
      .fontSize(24)
      .font('Helvetica-Bold')
      .text('FLAT MANAGEMENT SYSTEM', 50, 50)
      .fontSize(10)
      .font('Helvetica')
      .text('Property Management Services', 50, 80)
      .text('Email: info@flatmanagement.com', 50, 95)
      .text('Phone: +968 1234 5678', 50, 110);

    // Add logo placeholder (you can add actual logo here)
    doc
      .fontSize(40)
      .fillColor('#2c3e50')
      .text('FM', 500, 50)
      .fillColor('#000000');

    // Line separator
    doc
      .moveTo(50, 130)
      .lineTo(560, 130)
      .strokeColor('#2c3e50')
      .lineWidth(2)
      .stroke();
  }

  _addInvoiceInfo(doc, invoiceData, contractData) {
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('INVOICE', 50, 150);

    const col1X = 50;
    const col2X = 350;
    let currentY = 180;

    // Invoice details
    doc
      .fontSize(11)
      .font('Helvetica-Bold')
      .text('Invoice Number:', col1X, currentY)
      .font('Helvetica')
      .text(invoiceData.invoice_number, col1X + 110, currentY);

    doc
      .font('Helvetica-Bold')
      .text('Contract Number:', col2X, currentY)
      .font('Helvetica')
      .text(contractData.contract_number, col2X + 110, currentY);

    currentY += 20;

    doc
      .font('Helvetica-Bold')
      .text('Invoice Date:', col1X, currentY)
      .font('Helvetica')
      .text(moment(invoiceData.invoice_date).format('DD MMM YYYY'), col1X + 110, currentY);

    doc
      .font('Helvetica-Bold')
      .text('Due Date:', col2X, currentY)
      .font('Helvetica')
      .text(invoiceData.due_date ? moment(invoiceData.due_date).format('DD MMM YYYY') : 'N/A', col2X + 110, currentY);

    currentY += 20;

    if (invoiceData.billing_period_start && invoiceData.billing_period_end) {
      doc
        .font('Helvetica-Bold')
        .text('Billing Period:', col1X, currentY)
        .font('Helvetica')
        .text(
          `${moment(invoiceData.billing_period_start).format('DD MMM YYYY')} - ${moment(invoiceData.billing_period_end).format('DD MMM YYYY')}`,
          col1X + 110,
          currentY
        );
    }

    currentY += 25;

    // Status badge
    const statusColor = {
      'paid': '#28a745',
      'pending': '#ffc107',
      'partial': '#17a2b8',
      'overdue': '#dc3545'
    }[invoiceData.payment_status] || '#6c757d';

    doc
      .fontSize(12)
      .fillColor(statusColor)
      .font('Helvetica-Bold')
      .text(`Status: ${invoiceData.payment_status.toUpperCase()}`, col1X, currentY)
      .fillColor('#000000');
  }

  _addTenantInfo(doc, tenantData, buildingData, flatData) {
    let currentY = 280;

    // Tenant Information Box
    doc
      .roundedRect(50, currentY, 240, 120, 5)
      .strokeColor('#e0e0e0')
      .lineWidth(1)
      .stroke();

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('TENANT INFORMATION', 60, currentY + 10);

    currentY += 30;

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Name:', 60, currentY)
      .font('Helvetica')
      .text(tenantData.name, 130, currentY);

    currentY += 15;

    doc
      .font('Helvetica-Bold')
      .text('ID Number:', 60, currentY)
      .font('Helvetica')
      .text(tenantData.id_number, 130, currentY);

    currentY += 15;

    doc
      .font('Helvetica-Bold')
      .text('Contact:', 60, currentY)
      .font('Helvetica')
      .text(`${tenantData.country_code || ''} ${tenantData.contact_number || 'N/A'}`, 130, currentY);

    currentY += 15;

    if (tenantData.email) {
      doc
        .font('Helvetica-Bold')
        .text('Email:', 60, currentY)
        .font('Helvetica')
        .text(tenantData.email, 130, currentY);
    }

    // Property Information Box
    currentY = 280;

    doc
      .roundedRect(310, currentY, 240, 120, 5)
      .strokeColor('#e0e0e0')
      .lineWidth(1)
      .stroke();

    doc
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('PROPERTY INFORMATION', 320, currentY + 10);

    currentY += 30;

    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Building:', 320, currentY)
      .font('Helvetica')
      .text(buildingData.name, 390, currentY);

    currentY += 15;

    doc
      .font('Helvetica-Bold')
      .text('Flat Number:', 320, currentY)
      .font('Helvetica')
      .text(flatData.flat_number, 390, currentY);

    currentY += 15;

    if (buildingData.address) {
      doc
        .font('Helvetica-Bold')
        .text('Address:', 320, currentY)
        .font('Helvetica')
        .text(buildingData.address, 390, currentY, { width: 150 });
    }
  }

  _addPaymentDetails(doc, invoiceData, contractData) {
    let currentY = 430;

    // Payment Details Table Header
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('PAYMENT DETAILS', 50, currentY);

    currentY += 30;

    // Table header background
    doc
      .rect(50, currentY, 510, 25)
      .fillColor('#2c3e50')
      .fill();

    // Table headers
    doc
      .fontSize(10)
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .text('Description', 60, currentY + 8)
      .text('Amount', 460, currentY + 8);

    currentY += 25;

    // Reset color
    doc.fillColor('#000000');

    // Table rows
    const rows = [];

    // Rental amount
    rows.push({
      description: `Rental Amount (${contractData.rental_period})`,
      amount: this._formatCurrency(invoiceData.rental_amount)
    });

    // Previous balance
    if (invoiceData.previous_balance && invoiceData.previous_balance > 0) {
      rows.push({
        description: 'Previous Balance',
        amount: this._formatCurrency(invoiceData.previous_balance)
      });
    }

    // Late fee
    if (invoiceData.late_fee && invoiceData.late_fee > 0) {
      rows.push({
        description: 'Late Fee',
        amount: this._formatCurrency(invoiceData.late_fee)
      });
    }

    // Fine amount
    if (invoiceData.fine_amount && invoiceData.fine_amount > 0) {
      rows.push({
        description: `Fine: ${invoiceData.fine_description || 'Applied fine'}`,
        amount: this._formatCurrency(invoiceData.fine_amount)
      });
    }

    // Additional charges
    if (invoiceData.additional_charges && invoiceData.additional_charges > 0) {
      rows.push({
        description: `Additional Charges: ${invoiceData.additional_charges_description || 'Misc charges'}`,
        amount: this._formatCurrency(invoiceData.additional_charges)
      });
    }

    // Discount
    if (invoiceData.discount && invoiceData.discount > 0) {
      rows.push({
        description: 'Discount',
        amount: `- ${this._formatCurrency(invoiceData.discount)}`
      });
    }

    // Draw rows
    doc.font('Helvetica');
    rows.forEach((row, index) => {
      const bgColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';

      doc
        .rect(50, currentY, 510, 20)
        .fillColor(bgColor)
        .fill();

      doc
        .fillColor('#000000')
        .fontSize(10)
        .text(row.description, 60, currentY + 5)
        .text(row.amount, 460, currentY + 5);

      currentY += 20;
    });

    // Subtotal
    doc
      .rect(50, currentY, 510, 20)
      .fillColor('#e0e0e0')
      .fill();

    doc
      .fillColor('#000000')
      .font('Helvetica-Bold')
      .text('Subtotal:', 60, currentY + 5)
      .text(this._formatCurrency(invoiceData.total_amount), 460, currentY + 5);

    currentY += 20;

    // Payment received
    doc
      .rect(50, currentY, 510, 20)
      .fillColor('#d4edda')
      .fill();

    doc
      .fillColor('#155724')
      .font('Helvetica-Bold')
      .text('Payment Received:', 60, currentY + 5)
      .text(this._formatCurrency(invoiceData.payment_received), 460, currentY + 5);

    currentY += 20;

    // Balance due
    doc
      .rect(50, currentY, 510, 25)
      .fillColor('#2c3e50')
      .fill();

    doc
      .fillColor('#ffffff')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('BALANCE DUE:', 60, currentY + 6)
      .text(this._formatCurrency(invoiceData.balance_amount), 460, currentY + 6);

    currentY += 25;

    doc.fillColor('#000000');
  }

  _addRecentPayments(doc, recentPayments) {
    if (!recentPayments || recentPayments.length === 0) {
      return;
    }

    let currentY = doc.y + 30;

    // Check if we need a new page
    if (currentY > 650) {
      doc.addPage();
      currentY = 50;
    }

    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('RECENT PAYMENT HISTORY (Last 4 Payments)', 50, currentY);

    currentY += 30;

    // Table header
    doc
      .rect(50, currentY, 510, 25)
      .fillColor('#2c3e50')
      .fill();

    doc
      .fontSize(9)
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .text('Date', 60, currentY + 8)
      .text('Period', 150, currentY + 8)
      .text('Amount', 330, currentY + 8)
      .text('Method', 420, currentY + 8);

    currentY += 25;
    doc.fillColor('#000000');

    // Payment rows
    recentPayments.slice(0, 4).forEach((payment, index) => {
      const bgColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';

      doc
        .rect(50, currentY, 510, 20)
        .fillColor(bgColor)
        .fill();

      doc
        .fillColor('#000000')
        .fontSize(9)
        .font('Helvetica')
        .text(moment(payment.payment_date).format('DD MMM YYYY'), 60, currentY + 5)
        .text(
          payment.billing_period_start && payment.billing_period_end
            ? `${moment(payment.billing_period_start).format('DD MMM')} - ${moment(payment.billing_period_end).format('DD MMM')}`
            : 'N/A',
          150,
          currentY + 5,
          { width: 170 }
        )
        .text(this._formatCurrency(payment.amount), 330, currentY + 5)
        .text(payment.payment_method || 'N/A', 420, currentY + 5);

      currentY += 20;
    });
  }

  _addFooter(doc, invoiceData) {
    const pageHeight = 842; // A4 height in points
    let footerY = pageHeight - 100;

    // Notes
    if (invoiceData.notes) {
      footerY -= 40;
      doc
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Notes:', 50, footerY)
        .font('Helvetica')
        .text(invoiceData.notes, 50, footerY + 15, { width: 510 });
    }

    // Footer line
    doc
      .moveTo(50, pageHeight - 80)
      .lineTo(560, pageHeight - 80)
      .strokeColor('#e0e0e0')
      .lineWidth(1)
      .stroke();

    // Footer text
    doc
      .fontSize(9)
      .font('Helvetica')
      .fillColor('#666666')
      .text(
        'Thank you for your business. For any queries, please contact our office.',
        50,
        pageHeight - 65,
        { align: 'center', width: 510 }
      )
      .text(
        `Invoice generated on ${moment().format('DD MMM YYYY, HH:mm')}`,
        50,
        pageHeight - 50,
        { align: 'center', width: 510 }
      );
  }

  _formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  }

  /**
   * Get invoice file path
   */
  getInvoicePath(invoiceNumber) {
    return path.join(this.invoicesDir, `${invoiceNumber}.pdf`);
  }

  /**
   * Check if invoice PDF exists
   */
  invoiceExists(invoiceNumber) {
    const filePath = this.getInvoicePath(invoiceNumber);
    return fs.existsSync(filePath);
  }
}

module.exports = new InvoiceGenerator();
