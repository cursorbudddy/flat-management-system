# New Features Implementation Plan

**Date**: 2025-11-09
**Status**: 🚧 In Progress

## Features Overview

### 1. Invoice Generation ✅ (Already Exists)
- Auto-generate invoices when payment entries are recorded
- **Status**: Feature already implemented in `/backend/routes/invoices.js`

### 2. Dashboard Redesign 🔨
**Building Selection UI**:
- Show first 3 buildings as selectable cards/buttons (horizontal)
- Remaining buildings in dropdown
- When selected, show full building details in header

**Content Changes**:
- Replace "Today's Summary" with "Latest Rental Agreement Details"
  - Show: Tenant name, nationality, ID, phone, payment details
- Show: Recent Payments (top 5)
- Show: Recent Expenses (top 5)
- Show: Today's Summary stats
- Show: This Month Summary stats
- Remove: Income/Expense trends graph
- Add: Right sidebar pane with upcoming/pending payments

### 3. Building Context Filtering 🔨
- When building selected in dashboard → filter all tabs
- Tabs affected: Flats, Tenants, Payments, Payment Entry, Expenses
- Tab-specific building selection: temporary (current tab only)

### 4. Rental Agreement Enhancement 🔨
**Database**:
- Ensure unique contract numbers (already implemented: CON-{date}-{seq})
- Update Redis cache with rental agreements

### 5. Expense Tracking Enhancements 🔨
- Add flat number selection (for selected building)
- Add category-wise trend chart
- Filters: Building + Category + Flat Number

### 6. New Tenant Entry Page Improvements 🔨
**Nationality Dropdown**:
- Pre-populated list: Omani, Indian, Bangladeshi, Pakistani, Yemeni, Emirati, Egyptian, Thai, Vietnamese, Filipino, Sudanese, Saudi Arabian, Kuwaiti, Qatari
- Option: "Other" with text input

**ID Number Validation**:
- Check if ID exists before saving
- If exists: Show popup with:
  - Existing tenant details
  - Last rental details
  - ID document images
  - Prompt: "Continue with same ID?" (Yes/No)
  - If Yes: Pre-fill form with existing data

**Form Changes**:
- Remove: Email field
- Duration: Add "Custom Duration" option
  - Show dual calendar (start date + end date)
  - Auto-calculate days
  - Display calculated days near Duration/Rental fields

### 7. Payment Records Enhancements 🔨
**After Building Selection**:
- Show flat number dropdown
- Show overdue payments list (clickable for fast entry)
- Show 5 upcoming payments (clickable for fast entry)

### 8. New Rentals Tab 🔨
**Features**:
- Show current month rental agreements
- Show balance payment details
- Filter by building
- Summary of active rentals

## Implementation Order

### Phase 1: Backend APIs (Priority)
1. ✅ Invoice generation (already exists)
2. 🔨 Add endpoint: Check ID number exists
3. 🔨 Add endpoint: Get tenant by ID number with rental history
4. 🔨 Add endpoint: Get overdue payments
5. 🔨 Add endpoint: Get upcoming payments (5 next)
6. 🔨 Add endpoint: Get current month rentals with balance
7. 🔨 Add endpoint: Get expenses with flat filter
8. 🔨 Add endpoint: Category-wise expense trends

### Phase 2: Frontend Components
1. 🔨 Dashboard redesign
2. 🔨 Building selector component (3 cards + dropdown)
3. 🔨 Nationality dropdown component
4. 🔨 ID number checker with popup
5. 🔨 Custom duration calendar picker
6. 🔨 Overdue/upcoming payments selector
7. 🔨 New Rentals tab
8. 🔨 Expense tracking enhancements

### Phase 3: State Management
1. 🔨 Global building context
2. 🔨 Tab-specific building selection
3. 🔨 Redis cache updates

### Phase 4: Testing
1. 🔨 Test all new endpoints
2. 🔨 Test UI components
3. 🔨 Test building context switching
4. 🔨 Test ID validation flow

## Database Changes Required

### New Columns (if needed)
- ✅ Rental agreements already have unique contract_number
- ✅ Tenants table has all required fields
- 🔨 May need expense.flat_id column

### New Indexes
- 🔨 Index on tenants.id_number for fast lookup
- 🔨 Index on payment_schedules.due_date for upcoming payments

## Files to Create/Modify

### Backend
- `/backend/routes/tenants.js` - Add ID check endpoint
- `/backend/routes/payments.js` - Add overdue/upcoming endpoints
- `/backend/routes/rentals.js` - Add current month endpoint
- `/backend/routes/expenses.js` - Add flat filter, trends endpoint
- `/backend/database/migrations/` - New migration if needed

### Frontend
- `/frontend/src/pages/Dashboard.js` - Complete redesign
- `/frontend/src/pages/NewTenant.js` - Add validation, calendar
- `/frontend/src/pages/Payments.js` - Add quick selectors
- `/frontend/src/pages/Expenses.js` - Add filters, chart
- `/frontend/src/pages/Rentals.js` - NEW PAGE
- `/frontend/src/components/BuildingSelector.js` - NEW COMPONENT
- `/frontend/src/components/NationalityDropdown.js` - NEW COMPONENT
- `/frontend/src/components/DurationCalendar.js` - NEW COMPONENT
- `/frontend/src/context/BuildingContext.js` - NEW CONTEXT

## Estimated Implementation Time
- Backend APIs: 2-3 hours
- Frontend Components: 4-5 hours
- State Management: 1-2 hours
- Testing: 1-2 hours
- **Total**: 8-12 hours

## Notes
- Invoice generation already exists, just needs to be triggered on payment creation
- Nationality list includes all requested countries
- Building context should use React Context API
- Custom duration needs date-fns or similar library for calculations

---

**Legend**:
- ✅ Complete
- 🔨 In Progress
- ⏳ Pending
