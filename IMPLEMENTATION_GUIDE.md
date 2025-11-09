# Enhanced Property Management System - Implementation Guide

## Overview

This document outlines the comprehensive enhancements to transform the basic flat management application into a professional-grade property management system with advanced features including contract management, invoice generation, payment tracking, and overdue payment monitoring.

---

## ✅ Phase 1: COMPLETED

### 1. Enhanced Database Schema (`backend/database/schema_enhanced.sql`)

**New Tables:**
- `invoices`: Complete invoice management with unique invoice numbers
- `payment_schedules`: Auto-generated payment schedules based on rental contracts
- `country_codes`: Predefined country codes (Oman +968, UAE, Saudi, etc.)

**Enhanced Tables:**
- `tenants`: Added `country_code` field (default +968)
- `rental_agreements`: Added `contract_number`, `security_deposit`, `total_amount_due`, `total_amount_paid`, `balance_amount`
- `payments`: Added `invoice_id`, `contract_number`, `is_partial`, `billing_period_start/end`

**Auto-Generated Fields:**
- Contract numbers: `CON-YYYYMMDD-XXXXXX` (e.g., CON-20241215-001234)
- Invoice numbers: `INV-YYYYMMDD-XXXXXX` (e.g., INV-20241215-010001)

**Database Views:**
- `overdue_payments_view`: Real-time view of all overdue payments
- `pending_payments_view`: View of pending/partial payments

**Triggers & Functions:**
- Auto-calculate rental totals
- Auto-update payment schedule status
- Auto-update rental agreement paid amounts

### 2. Redis Caching System (`backend/database/redis.js`)

**Features:**
- Cache last 3 months of payment data
- Cache dashboard statistics
- Cache tenant and contract details
- Configurable cache durations (5min, 30min, 1hr, 1day)

**Helper Functions:**
```javascript
cacheHelper.getRecentPayments(tenantId, buildingId)
cacheHelper.setRecentPayments(data, tenantId, buildingId)
cacheHelper.getDashboardStats(buildingId)
cacheHelper.getOverduePayments(buildingId)
// + many more
```

### 3. Invoice Generation System (`backend/utils/invoiceGenerator.js`)

**Features:**
- Professional PDF invoices with company branding
- Detailed payment breakdown
- Last 4 payment history on each invoice
- Contract and billing period information
- Automatic invoice number generation
- QR code ready structure

**Invoice Includes:**
- Header with company details
- Invoice & contract numbers
- Tenant information
- Property details (building, flat)
- Payment breakdown table
- Previous balance tracking
- Late fees and discounts
- Payment history (last 4 payments)
- Balance due prominently displayed

### 4. Payment Schedule Generator (`backend/utils/paymentScheduleGenerator.js`)

**Features:**
- Auto-generate payment schedules based on rental contract
- Support for daily and monthly billing cycles
- Calculate due dates automatically
- Track overdue payments
- Calculate late fees
- Allocate payments to correct billing periods

**Functions:**
- `generateSchedule(rentalAgreement)`: Create full payment schedule
- `updateScheduleStatus(schedules)`: Update based on current date
- `calculateLateFee(daysOverdue, amount)`: Auto-calculate late fees
- `applyPayment(schedules, amount)`: Smart payment allocation

### 5. Invoice Management API (`backend/routes/invoices.js`)

**Endpoints:**
- `GET /api/invoices` - List all invoices with filters
- `GET /api/invoices/:id` - Get single invoice details
- `POST /api/invoices` - Create invoice and generate PDF
- `PUT /api/invoices/:id` - Update invoice (payment status)
- `GET /api/invoices/:id/download` - Download invoice PDF
- `DELETE /api/invoices/:id` - Delete invoice

**Features:**
- Automatic PDF generation on invoice creation
- Links to recent payments
- Contract number tracking
- Status management (paid, pending, partial, overdue)

### 6. Country Code Selector Component

**Features:**
- Default: Oman (+968)
- Predefined countries: UAE, Saudi Arabia, Yemen, Kuwait, Qatar, Egypt, India, Bangladesh, Pakistan, Sri Lanka
- Custom country code entry option
- Flag emojis for visual identification
- Dropdown with search capability

**Usage:**
```jsx
<CountryCodeSelector
  value={formData.country_code}
  onChange={handleChange}
  name="country_code"
/>
```

### 7. Updated Dependencies

**Backend (`package.json`):**
```json
{
  "redis": "^4.6.11",
  "pdfkit": "^0.14.0",
  "pdfkit-table": "^0.1.99",
  "moment": "^2.29.4"
}
```

---

## 🔄 Phase 2: IN PROGRESS / PENDING

### 1. Payment Schedules API Route

**File to Create:** `backend/routes/payment-schedules.js`

**Required Endpoints:**
```javascript
GET    /api/payment-schedules/:rentalId          // Get schedules for a rental
GET    /api/payment-schedules/overdue            // Get all overdue schedules
POST   /api/payment-schedules/:rentalId/generate // Generate schedules
PUT    /api/payment-schedules/:id                // Update schedule
POST   /api/payment-schedules/:id/payment        // Record payment for schedule
```

**Key Features:**
- Auto-generate schedules when rental agreement is created
- Update schedule status daily (overdue check)
- Allocate payments to correct billing periods
- Calculate late fees automatically

### 2. Enhanced Rentals Route

**File to Update:** `backend/routes/rentals.js`

**Changes Needed:**
1. When creating rental agreement:
   - Generate contract number (auto via database)
   - Create payment schedules automatically
   - Initialize payment tracking

2. Add payment recording endpoint:
   ```javascript
   POST /api/rentals/:contractNumber/payment
   ```

3. Get payment history:
   ```javascript
   GET /api/rentals/:contractNumber/payments
   ```

### 3. Payment Entry Page for Existing Tenants

**File to Create:** `frontend/src/pages/PaymentEntry.js`

**Features Required:**
- Search by flat number
- Auto-populate tenant details when flat selected
- Display contract information
- Show last 5 months payment history
- Show current outstanding/overdue amounts
- Payment amount entry
- Payment method selection
- Generate invoice on payment submission
- Download invoice button

**UI Flow:**
1. User enters flat number
2. System shows:
   - Tenant name, contact, ID
   - Contract number and details
   - Last 5 payment records
   - Outstanding balance
   - Overdue amount (if any)
   - Next due date
3. User enters payment amount
4. System allocates to billing periods
5. Generate and display invoice
6. Option to download PDF

### 4. Update NewEntry Page

**File to Update:** `frontend/src/pages/NewEntry.js`

**Changes:**
1. Replace contact number field with:
   ```jsx
   <div className="phone-input-group">
     <CountryCodeSelector
       value={formData.country_code}
       onChange={handleChange}
       name="country_code"
     />
     <input
       type="tel"
       name="contact_number"
       value={formData.contact_number}
       onChange={handleChange}
     />
   </div>
   ```

2. After successful tenant creation:
   - Generate payment schedules
   - Create first invoice (if advance paid)
   - Show contract number to user

### 5. Enhanced Dashboard

**File to Update:** `frontend/src/pages/Dashboard.js`

**New Statistics to Add:**
- Total overdue payments (amount & count)
- Pending payments this month
- Partial payments requiring follow-up

**New Sections:**
1. **Overdue Payments Table:**
   - Tenant name
   - Building & flat
   - Amount overdue
   - Days overdue
   - Contact number
   - Quick action button (Record Payment)

2. **This Month's Due Payments:**
   - List of payments due this month
   - Status indicators
   - Total expected vs collected

### 6. Update Tenants Page

**File to Update:** `frontend/src/pages/Tenants.js`

**Changes:**
1. Display country code with phone number
2. Add "Record Payment" button for active tenants
3. Show outstanding balance in tenant list
4. Filter by payment status (current, overdue, etc.)

### 7. Update TenantDetails Page

**File to Update:** `frontend/src/pages/TenantDetails.js`

**Add:**
1. Contract number display
2. Payment schedule view
3. Generate invoice button
4. Outstanding/overdue summary
5. Payment entry form

### 8. Update Server Configuration

**File to Update:** `backend/server.js`

**Add Routes:**
```javascript
const invoiceRoutes = require('./routes/invoices');
const paymentScheduleRoutes = require('./routes/payment-schedules');

app.use('/api/invoices', invoiceRoutes);
app.use('/api/payment-schedules', paymentScheduleRoutes);

// Serve invoice PDFs
app.use('/invoices', express.static(path.join(__dirname, 'invoices')));
```

### 9. Update Environment Variables

**File to Update:** `backend/.env.example`

**Add:**
```
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Invoice Configuration
INVOICE_COMPANY_NAME=Flat Management System
INVOICE_EMAIL=info@flatmanagement.com
INVOICE_PHONE=+968 1234 5678

# Payment Configuration
LATE_FEE_PERCENTAGE=5
LATE_FEE_GRACE_DAYS=3
PAYMENT_DUE_DAYS=7
```

### 10. Frontend API Helper

**File to Update:** `frontend/src/api.js`

**Add:**
```javascript
// Invoices
export const getInvoices = (params) => api.get('/invoices', { params });
export const getInvoice = (id) => api.get(`/invoices/${id}`);
export const createInvoice = (data) => api.post('/invoices', data);
export const downloadInvoice = (id) => api.get(`/invoices/${id}/download`, {
  responseType: 'blob'
});

// Payment Schedules
export const getPaymentSchedules = (rentalId) => api.get(`/payment-schedules/${rentalId}`);
export const getOverdueSchedules = (params) => api.get('/payment-schedules/overdue', { params });

// Contract Payments
export const recordContractPayment = (contractNumber, data) =>
  api.post(`/rentals/${contractNumber}/payment`, data);
```

---

## 📋 Database Migration

### Migration Script

**File to Create:** `backend/database/migrate_to_enhanced.js`

**Purpose:**
- Migrate existing data from old schema to new enhanced schema
- Preserve all existing data
- Generate contract numbers for existing rentals
- Create payment schedules for active rentals

**Steps:**
1. Backup existing database
2. Run enhanced schema
3. Migrate data:
   - Add default country codes to existing tenants
   - Generate contract numbers for existing rentals
   - Create payment schedules for active contracts
   - Generate invoices for recent payments

**Command:**
```bash
node backend/database/migrate_to_enhanced.js
```

---

## 🚀 Installation & Setup

### 1. Install New Dependencies

```bash
# Backend
cd backend
npm install

# This will install:
# - redis
# - pdfkit
# - pdfkit-table
# - moment
```

### 2. Install and Configure Redis

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

### 3. Update Environment Variables

```bash
cd backend
cp .env.example .env
# Edit .env and add Redis configuration
```

### 4. Database Migration

**Option A: Fresh Installation**
```bash
# Use enhanced schema
psql -U flat_admin -d flat_management -f backend/database/schema_enhanced.sql
```

**Option B: Existing Data Migration**
```bash
# Create migration script first (Phase 2)
node backend/database/migrate_to_enhanced.js
```

### 5. Create Required Directories

```bash
cd backend
mkdir -p invoices
mkdir -p uploads/id-documents
chmod 755 invoices
chmod 755 uploads
```

---

## 🎯 Testing Checklist

### Backend Testing

- [ ] Redis connection works
- [ ] Contract numbers generate correctly
- [ ] Invoice numbers generate correctly
- [ ] Payment schedules generate for new rentals
- [ ] Invoices create with PDF
- [ ] PDF download works
- [ ] Overdue calculations are accurate
- [ ] Payment allocation works correctly

### Frontend Testing

- [ ] Country code selector works
- [ ] Default +968 shows correctly
- [ ] Custom country code entry works
- [ ] Payment entry page loads
- [ ] Flat number search works
- [ ] Invoice download works
- [ ] Dashboard shows overdue payments
- [ ] Payment history displays correctly

---

## 📊 Data Flow

### New Rental Agreement Flow

```
1. User creates new rental →
2. System generates contract number (CON-YYYYMMDD-XXXXXX) →
3. System calculates rental periods based on duration →
4. System generates payment schedules automatically →
5. If advance paid, create first invoice →
6. Generate invoice PDF →
7. Return contract number to user
```

### Payment Recording Flow

```
1. User searches by flat number →
2. System shows tenant + contract details →
3. System shows payment schedules (paid, pending, overdue) →
4. User enters payment amount →
5. System allocates payment to schedules (oldest first) →
6. System creates payment record →
7. System creates invoice →
8. System generates invoice PDF →
9. System updates payment schedules →
10. System updates contract totals →
11. User can download invoice
```

### Overdue Payment Detection Flow

```
1. Daily cron job (or on-demand check) →
2. Check all payment schedules →
3. Compare due_date with current date →
4. Mark overdue if past due →
5. Calculate days overdue →
6. Calculate late fees (if applicable) →
7. Update cache →
8. Send notifications (future feature)
```

---

## 🔐 Security Considerations

1. **Invoice PDFs:** Store in protected directory, serve via authenticated endpoint
2. **Redis:** Use password protection in production
3. **Payment Data:** Encrypt sensitive payment information
4. **ID Documents:** Serve via authenticated endpoints only
5. **Rate Limiting:** Add rate limiting to payment endpoints

---

## 📈 Performance Optimization

1. **Redis Caching:**
   - Cache last 3 months payments
   - Cache dashboard stats (5 min)
   - Cache overdue payments (5 min)
   - Invalidate on updates

2. **Database Indexes:**
   - All created in enhanced schema
   - Query optimization with proper joins

3. **PDF Generation:**
   - Generate async in production
   - Cache generated PDFs
   - Clean old invoices periodically

---

## 🐛 Troubleshooting

### Redis Connection Error

```bash
# Check Redis is running
sudo systemctl status redis-server

# Check Redis connectivity
redis-cli ping

# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log
```

### PDF Generation Error

```bash
# Check invoices directory exists
ls -la backend/invoices

# Check permissions
chmod 755 backend/invoices

# Check PDFKit installation
npm list pdfkit
```

### Database Schema Issues

```bash
# Check if tables exist
psql -U flat_admin -d flat_management -c "\dt"

# Check if sequences exist
psql -U flat_admin -d flat_management -c "\ds"

# Recreate schema if needed
psql -U flat_admin -d flat_management -f backend/database/schema_enhanced.sql
```

---

## 📝 Next Steps

1. ✅ Complete Phase 1 (DONE)
2. ⏳ Implement payment schedules API
3. ⏳ Create payment entry page
4. ⏳ Update all existing components
5. ⏳ Add database migration script
6. ⏳ Test end-to-end workflow
7. ⏳ Add email notifications for overdue payments
8. ⏳ Add SMS notifications (optional)
9. ⏳ Add recurring payment reminders
10. ⏳ Generate monthly reports

---

## 💡 Future Enhancements

1. **Email Notifications:**
   - Payment due reminders
   - Overdue payment alerts
   - Invoice email delivery

2. **SMS Notifications:**
   - Using Twilio or similar
   - Payment reminders
   - Contract expiry alerts

3. **Reports:**
   - Monthly income/expense reports
   - Occupancy reports
   - Tenant payment behavior analysis

4. **Online Payments:**
   - Integration with payment gateways
   - Tenant portal for online payment
   - Payment history for tenants

5. **Mobile App:**
   - React Native app
   - Push notifications
   - Mobile payment entry

---

## 📞 Support

For any issues or questions regarding implementation:
1. Check this guide first
2. Review the code comments
3. Check the error logs
4. Refer to the DEPLOYMENT.md for server setup

---

**Last Updated:** December 2024
**Status:** Phase 1 Complete, Phase 2 In Progress
**Version:** 2.0.0-beta
