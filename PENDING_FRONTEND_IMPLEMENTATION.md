# Pending Frontend Implementation

**Status**: 🚧 Backend Complete - Frontend Pending
**Backend APIs**: ✅ All Implemented and Tested
**Estimated Frontend Work**: 8-12 hours

---

## ✅ Backend Work Completed

### Database Changes
- ✅ Added `flat_id` column to expenses table with foreign key constraint
- ✅ Added index on `expenses.flat_id` for performance
- ✅ All database migrations complete

### New API Endpoints (8 Total)

| Endpoint | Method | Purpose | Auth Required |
|----------|--------|---------|---------------|
| `/api/tenants/check-id/:idNumber` | GET | Check if tenant ID exists, return full details + rental history | No |
| `/api/payment-schedules/overdue` | GET | Get overdue payments with optional building filter | Yes |
| `/api/payment-schedules/upcoming` | GET | Get next N upcoming payments (default 5) | Yes |
| `/api/rentals/current-month` | GET | Get active rentals for current month | No |
| `/api/rentals/latest` | GET | Get today's most recent rental agreement | No |
| `/api/expenses/trends/category` | GET | Category-wise expense trends with date range | No |
| `/api/expenses` (updated) | GET | Now supports `flat_id` query parameter | Optional Auth |

### API Response Formats

**Tenant ID Check** (`/api/tenants/check-id/:idNumber`):
```json
{
  "exists": true,
  "tenant": {
    "name": "John Doe",
    "nationality": "Indian",
    "contact": "+91-9876543210",
    "id_document_path": "/uploads/id-docs/ID123.pdf"
  },
  "last_rental": {
    "building": "Sunrise Apartments",
    "flat": "A-101",
    "contract_number": "CON-20251109-001000",
    "start_date": "2025-11-09",
    "end_date": "2026-11-09",
    "rental_amount": "1200.00",
    "status": "active"
  }
}
```

**Overdue/Upcoming Payments**:
```json
[{
  "id": 1,
  "contract_number": "CON-20251109-001000",
  "tenant_name": "John Doe",
  "building_name": "Test Building",
  "flat_number": "1",
  "due_date": "2025-11-10",
  "amount_due": "1200.00",
  "balance": "1200.00"
}]
```

---

## 🚧 Frontend Implementation Required

### 1. Dashboard Complete Redesign (Priority: HIGH)

**Current State**: Shows all buildings in grid, basic stats

**Required Changes**:

#### Building Selector Component
```
File: /frontend/src/components/BuildingSelector.js (NEW)

Layout:
┌─────────────────────────────────────────────────────────┐
│ [Building 1] [Building 2] [Building 3] [▼ More (5) ▼] │
└─────────────────────────────────────────────────────────┘

Behavior:
- Show first 3 buildings as horizontal cards/buttons
- If more than 3 buildings: Show remaining in dropdown
- When selected: Update global building context
- Show full building details in header when selected
```

**Implementation Details**:
- Component: `<BuildingSelector buildings={buildings} onSelect={handleSelect} />`
- State: Selected building stored in React Context
- API: Use existing `GET /api/buildings`
- Styling: Horizontal flexbox with card design

#### Dashboard Content Reorganization

**Current**: Today's Summary → Trends Graph → Recent Activity
**New Layout**:

```
┌─────────────────────────────────────────────────────┬─────────────┐
│ Latest Rental Agreement Details                     │  Upcoming   │
│ ┌─────────────────────────────────────────────────┐ │  Payments   │
│ │ Tenant: John Doe                                 │ │  ───────    │
│ │ Nationality: Indian  ID: ABC123                  │ │  Due: 10/12 │
│ │ Phone: +91-xxx  Contract: CON-20251109-001000   │ │  Amt: 1200  │
│ │ Advance: 2400  Monthly: 1200                     │ │  ...        │
│ └─────────────────────────────────────────────────┘ │  (5 items)  │
│                                                       │             │
│ Recent Payments (5)                                   │             │
│ ┌─────────────────────────────────────────────────┐ │             │
│ │ Date | Tenant | Amount | Type | Building        │ │             │
│ └─────────────────────────────────────────────────┘ │             │
│                                                       │             │
│ Recent Expenses (5)                                   │             │
│ ┌─────────────────────────────────────────────────┐ │             │
│ │ Date | Category | Amount | Building             │ │             │
│ └─────────────────────────────────────────────────┘ │             │
│                                                       │             │
│ Today's Summary         This Month Summary           │             │
│ ┌──────────────────┐   ┌──────────────────┐        │             │
│ │ Income: 2400     │   │ Income: 12000    │        │             │
│ │ Expenses: 500    │   │ Expenses: 3000   │        │             │
│ │ Net: 1900        │   │ Net: 9000        │        │             │
│ └──────────────────┘   └──────────────────┘        │             │
└─────────────────────────────────────────────────────┴─────────────┘

REMOVE: Income/Expense Trends Graph
```

**APIs to Use**:
- `GET /api/rentals/latest` - Latest rental agreement
- `GET /api/payment-schedules/upcoming?limit=5` - Upcoming payments sidebar
- `GET /api/payments` - Recent payments (limit 5, order by date DESC)
- `GET /api/expenses` - Recent expenses (limit 5, order by date DESC)
- `GET /api/dashboard/stats` - Today's and month's summary

**File**: `/frontend/src/pages/Dashboard.js`

---

### 2. New Tenant Entry Page Enhancements (Priority: HIGH)

**File**: `/frontend/src/pages/NewTenant.js` or create `/frontend/src/pages/TenantEntry.js`

#### Feature 1: Nationality Dropdown with Pre-populated List

```javascript
const NATIONALITIES = [
  'Omani',
  'Indian',
  'Bangladeshi',
  'Pakistani',
  'Yemeni',
  'Emirati',
  'Egyptian',
  'Thai',
  'Vietnamese',
  'Filipino',
  'Sudanese',
  'Saudi Arabian',
  'Kuwaiti',
  'Qatari',
  'Other (Specify)'
];
```

**Component**: `<NationalityDropdown value={nationality} onChange={handleChange} />`
- Dropdown with above options
- If "Other" selected: Show text input field below
- Store selected value in form state

#### Feature 2: ID Number Validation with Popup

**Flow**:
1. User enters ID number
2. On blur or click "Check ID" button → Call `GET /api/tenants/check-id/:idNumber`
3. If ID exists:
   - Show modal/popup with:
     - Tenant details (name, nationality, contact)
     - Last rental details (building, flat, dates, amount, status)
     - ID document image preview
     - Prompt: "This ID already exists. Continue with same details?"
     - Buttons: [Yes, Pre-fill Form] [No, Cancel]
4. If "Yes": Pre-fill form with existing data
5. If "No": Clear ID field, let user enter new ID

**Implementation**:
```javascript
const handleIdCheck = async (idNumber) => {
  try {
    const response = await axios.get(`/api/tenants/check-id/${idNumber}`);
    if (response.data.exists) {
      setIdCheckResult(response.data);
      setShowIdCheckModal(true);
    }
  } catch (error) {
    console.error('ID check failed:', error);
  }
};

const handlePrefillForm = () => {
  const { tenant } = idCheckResult;
  setFormData({
    ...formData,
    name: tenant.name,
    nationality: tenant.nationality,
    contact_number: tenant.contact,
    id_document_path: tenant.id_document_path
  });
  setShowIdCheckModal(false);
};
```

**Modal Component**: Create `<IdCheckModal tenant={data} onConfirm={handlePrefill} onCancel={closeModal} />`

#### Feature 3: Custom Duration with Dual Calendar

**Remove**: Email field from form

**Duration Field Enhancement**:
```
Current: [Days ▼] [Months ▼]

New:
[Days ▼] [Months ▼] [Custom Duration ▼]

If "Custom Duration" selected:
┌────────────────────────────────────────┐
│  Start Date: [Calendar Picker]         │
│  End Date:   [Calendar Picker]         │
│                                         │
│  Duration: 365 days (calculated)       │
└────────────────────────────────────────┘
```

**Implementation**:
- Use `react-datepicker` or `date-fns` for calendar
- Component: `<CustomDurationPicker onDateSelect={handleDates} />`
- Calculate days: `Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))`
- Display calculated days near Duration and Rental Amount fields

**Library to Install**:
```bash
npm install react-datepicker date-fns
```

**Usage**:
```javascript
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const [startDate, setStartDate] = useState(new Date());
const [endDate, setEndDate] = useState(null);

const calculatedDays = endDate
  ? Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
  : 0;
```

---

### 3. Payment Records Page Enhancements (Priority: MEDIUM)

**File**: `/frontend/src/pages/Payments.js`

#### Feature: Building → Flat Cascading Dropdowns

**Current**: Single building selector

**New**:
```
1. Select Building: [Dropdown ▼]
2. Select Flat: [Dropdown ▼] (populated after building selected)
3. Quick Select from:

   Overdue Payments:
   ┌─────────────────────────────────────────┐
   │ [Select] Tenant | Flat | Due | Amount   │
   │ [Select] Tenant | Flat | Due | Amount   │
   └─────────────────────────────────────────┘

   Upcoming Payments (Next 5):
   ┌─────────────────────────────────────────┐
   │ [Select] Tenant | Flat | Due | Amount   │
   │ [Select] Tenant | Flat | Due | Amount   │
   └─────────────────────────────────────────┘
```

**APIs**:
- `GET /api/payment-schedules/overdue?building_id={id}` - Overdue payments
- `GET /api/payment-schedules/upcoming?building_id={id}&limit=5` - Upcoming
- `GET /api/flats/building/{buildingId}` - Get flats for selected building

**Implementation**:
```javascript
const [selectedBuilding, setSelectedBuilding] = useState(null);
const [flats, setFlats] = useState([]);
const [overduePayments, setOverduePayments] = useState([]);
const [upcomingPayments, setUpcomingPayments] = useState([]);

useEffect(() => {
  if (selectedBuilding) {
    fetchFlats(selectedBuilding);
    fetchOverduePayments(selectedBuilding);
    fetchUpcomingPayments(selectedBuilding);
  }
}, [selectedBuilding]);

const handleQuickSelect = (payment) => {
  // Pre-fill payment form with selected payment details
  setPaymentForm({
    tenant_id: payment.tenant_id,
    flat_id: payment.flat_id,
    amount: payment.balance,
    payment_schedule_id: payment.id
  });
};
```

---

### 4. Expense Tracking Page Enhancements (Priority: MEDIUM)

**File**: `/frontend/src/pages/Expenses.js`

#### Changes Required:

1. **Add Flat Number Selection**:
```
Filters:
Building: [Dropdown ▼]
Category: [Dropdown ▼]
Flat: [Dropdown ▼] (populated after building selected)
Date Range: [From] [To]
```

2. **Add Category-wise Trend Chart**:
```javascript
// Use recharts library (already installed)
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const CategoryTrendChart = ({ data }) => (
  <BarChart width={600} height={300} data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="category" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Bar dataKey="total_amount" fill="#8884d8" />
  </BarChart>
);
```

**API**: `GET /api/expenses/trends/category?building_id={id}&start_date={start}&end_date={end}`

3. **Update Record Expense Form**:
   - Add: Flat Number dropdown (after building selection)
   - Send `flat_id` in POST request body

---

### 5. New Rentals Tab (Priority: MEDIUM)

**Create New Page**: `/frontend/src/pages/Rentals.js`

**Features**:
- Show current month rental agreements
- Display balance payment details
- Filter by building
- Summary statistics

**Layout**:
```
┌──────────────────────────────────────────────────────────┐
│ Rentals - Current Month                                  │
│                                                           │
│ Filter: Building [Dropdown ▼]                           │
│                                                           │
│ Summary Cards:                                           │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│ │ Total    │ │ Total    │ │ Collected│ │ Balance  │   │
│ │ Rentals  │ │ Amount   │ │ Amount   │ │ Amount   │   │
│ │   15     │ │  18,000  │ │  12,000  │ │  6,000   │   │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│                                                           │
│ Rental Agreements Table:                                 │
│ ┌────────────────────────────────────────────────────┐  │
│ │ Contract | Tenant | Building | Flat | Amount |... │  │
│ │ CON-001  | John   | Sunrise  | A101 | 1200   |... │  │
│ └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**API**: `GET /api/rentals/current-month?building_id={id}`

**Add to Navigation**:
```javascript
// In App.js or navigation component
<Route path="/rentals" element={<Rentals />} />

// In sidebar/navigation
<Link to="/rentals">Rentals</Link>
```

---

### 6. Global Building Context (Priority: HIGH)

**Create**: `/frontend/src/context/BuildingContext.js`

```javascript
import React, { createContext, useState, useContext } from 'react';

const BuildingContext = createContext();

export const BuildingProvider = ({ children }) => {
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [tabSpecificBuilding, setTabSpecificBuilding] = useState({});

  const setGlobalBuilding = (building) => {
    setSelectedBuilding(building);
  };

  const setTabBuilding = (tab, building) => {
    setTabSpecificBuilding(prev => ({ ...prev, [tab]: building }));
  };

  const getEffectiveBuilding = (tab) => {
    return tabSpecificBuilding[tab] || selectedBuilding;
  };

  return (
    <BuildingContext.Provider value={{
      selectedBuilding,
      setGlobalBuilding,
      setTabBuilding,
      getEffectiveBuilding
    }}>
      {children}
    </BuildingContext.Provider>
  );
};

export const useBuilding = () => useContext(BuildingContext);
```

**Wrap App**:
```javascript
// In App.js or index.js
import { BuildingProvider } from './context/BuildingContext';

<BuildingProvider>
  <App />
</BuildingProvider>
```

**Usage in Components**:
```javascript
import { useBuilding } from '../context/BuildingContext';

function Dashboard() {
  const { selectedBuilding, setGlobalBuilding } = useBuilding();

  // Dashboard selection affects all tabs
  const handleBuildingSelect = (building) => {
    setGlobalBuilding(building);
  };
}

function Flats() {
  const { getEffectiveBuilding, setTabBuilding } = useBuilding();
  const [tabBuilding, setTabBuilding] = useState(getEffectiveBuilding('flats'));

  // Tab-specific selection (temporary)
  const handleTabBuildingSelect = (building) => {
    setTabBuilding('flats', building);
    setTabBuilding(building);
  };
}
```

---

## Implementation Checklist

### Phase 1: Core Infrastructure (2-3 hours)
- [ ] Create BuildingContext (`/frontend/src/context/BuildingContext.js`)
- [ ] Wrap app with BuildingProvider
- [ ] Create BuildingSelector component (`/frontend/src/components/BuildingSelector.js`)
- [ ] Test building context switching

### Phase 2: Dashboard Redesign (3-4 hours)
- [ ] Implement BuildingSelector in Dashboard
- [ ] Add Latest Rental Agreement section (API: `/api/rentals/latest`)
- [ ] Add Upcoming Payments sidebar (API: `/api/payment-schedules/upcoming`)
- [ ] Reorganize Recent Payments section
- [ ] Reorganize Recent Expenses section
- [ ] Update Today's/Month's Summary layout
- [ ] Remove Trends Graph
- [ ] Test dashboard with building context

### Phase 3: Tenant Entry Enhancements (2-3 hours)
- [ ] Create NationalityDropdown component
- [ ] Implement ID number validation (API: `/api/tenants/check-id/:id`)
- [ ] Create IdCheckModal component
- [ ] Implement form pre-fill on ID match
- [ ] Remove email field
- [ ] Install react-datepicker: `npm install react-datepicker date-fns`
- [ ] Create CustomDurationPicker component
- [ ] Add calculated days display
- [ ] Test ID validation flow
- [ ] Test custom duration selection

### Phase 4: Payment Records (1-2 hours)
- [ ] Add flat dropdown (cascading from building)
- [ ] Fetch overdue payments (API: `/api/payment-schedules/overdue`)
- [ ] Display overdue payments list
- [ ] Fetch upcoming payments (API: `/api/payment-schedules/upcoming`)
- [ ] Display upcoming payments list
- [ ] Implement quick select for payments
- [ ] Test payment entry with quick select

### Phase 5: Expense Tracking (1-2 hours)
- [ ] Add flat number dropdown to filters
- [ ] Fetch expense trends (API: `/api/expenses/trends/category`)
- [ ] Create CategoryTrendChart component
- [ ] Add chart to expenses page
- [ ] Update record expense form with flat selection
- [ ] Test expense filtering and charting

### Phase 6: New Rentals Tab (1-2 hours)
- [ ] Create Rentals.js page (`/frontend/src/pages/Rentals.js`)
- [ ] Fetch current month rentals (API: `/api/rentals/current-month`)
- [ ] Display summary cards
- [ ] Display rentals table
- [ ] Add building filter
- [ ] Add route to App.js
- [ ] Add navigation link
- [ ] Test rentals page

### Phase 7: Testing & Polish (1-2 hours)
- [ ] Test all building context switching
- [ ] Test tab-specific vs global building selection
- [ ] Test all new API integrations
- [ ] Fix any styling issues
- [ ] Test on different screen sizes
- [ ] Verify data consistency across tabs

---

## Required NPM Packages

```bash
cd /home/flat-management-system/frontend

# Date picker for custom duration
npm install react-datepicker date-fns

# Chart library (already installed - verify)
npm list recharts

# If not installed:
npm install recharts
```

---

## API Testing Commands

Before frontend implementation, test all backend endpoints:

```bash
# Get a fresh auth token
TOKEN=$(curl -s -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"jbadmin","password":"123456"}' \
  | jq -r '.token')

# Test all new endpoints
curl http://localhost:5000/api/tenants/check-id/TEST123456
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/payment-schedules/overdue
curl -H "Authorization: Bearer $TOKEN" http://localhost:5000/api/payment-schedules/upcoming?limit=5
curl http://localhost:5000/api/rentals/current-month
curl http://localhost:5000/api/rentals/latest
curl http://localhost:5000/api/expenses/trends/category
curl http://localhost:5000/api/expenses?flat_id=21
```

---

## File Structure Summary

**New Files to Create**:
```
frontend/src/
├── context/
│   └── BuildingContext.js (NEW)
├── components/
│   ├── BuildingSelector.js (NEW)
│   ├── NationalityDropdown.js (NEW)
│   ├── IdCheckModal.js (NEW)
│   ├── CustomDurationPicker.js (NEW)
│   └── CategoryTrendChart.js (NEW)
└── pages/
    └── Rentals.js (NEW)
```

**Files to Modify**:
```
frontend/src/
├── App.js (add BuildingProvider, add Rentals route)
├── pages/
│   ├── Dashboard.js (complete redesign)
│   ├── NewTenant.js or TenantEntry.js (major enhancements)
│   ├── Payments.js (add quick selectors)
│   └── Expenses.js (add chart and flat filter)
```

---

## Notes for Claude GitHub Implementation

1. **Start with BuildingContext** - This is the foundation for many other features
2. **Test incrementally** - Test each component before moving to the next
3. **Use existing styling** - Match the current design patterns in the app
4. **API responses are ready** - All backend endpoints return the expected data format
5. **Database is updated** - `flat_id` column exists in expenses table
6. **Server is running** - Backend is live with all new routes loaded

---

## Current System State

**Backend**:
- ✅ All APIs implemented and running
- ✅ Database schema updated
- ✅ Redis caching configured
- ✅ Server running on port 5000

**Frontend**:
- ✅ Running on port 3002
- ✅ Accessible via Tailscale: https://vmi2736951-2.tailc7190b.ts.net/
- ⏳ Awaiting frontend implementation of new features

**Git Status**:
- All backend changes committed
- Ready for frontend development

**Users**:
- Admin: jbadmin / 123456
- User: bldng1 / 567890

---

**Last Updated**: 2025-11-09
**Backend Version**: v2.0 (with new APIs)
**Frontend Version**: v1.0 (original - needs updates)
