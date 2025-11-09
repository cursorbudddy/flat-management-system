# Flat Management Application - Complete System

A comprehensive building and flat management application with **authentication, role-based access control**, payment tracking, expense approval workflows, automated invoice generation, payment scheduling, and comprehensive PDF reporting.

**🎉 Status**: ✅ **Production Ready** - All 3 Phases Complete!

## 🚀 Quick Start

**Default Login Credentials:**
```
Admin: username: admin, password: admin123
User:  username: user1, password: user123
```
⚠️ Change these in production!

## ✨ Features

### Building Management
- Add and manage multiple buildings
- Track total flats, occupied/vacant status
- Building-specific details and contact information
- Automatic flat creation when adding buildings

### Tenant Management
- Complete tenant information (Name, ID, Nationality, Contact)
- ID document upload and storage
- Tenant rental history
- Payment history tracking
- Active/inactive tenant status

### Flat Management
- View all flats across buildings
- Filter by building and occupancy status
- Real-time occupancy tracking
- Flat-wise rental details

### Rental Agreements
- Create new rental agreements
- Configurable rental duration (days/months)
- Flexible rental amount (per day/month)
- Advance payment tracking
- Start and end date management

### Payment Tracking
- Record all payments (rent, advance, other)
- Payment history by tenant
- Payment history by date range
- Multiple payment methods support
- Pending payment tracking

### Expense Tracking
- Record building-specific or general expenses
- Categorize expenses
- Date-wise expense filtering
- Expense analytics by category

### Payment Scheduling & Invoices (Phase 2)
- Automatic payment schedule generation based on contract duration
- Unique invoice numbers (INV-XXXX) with auto-increment
- Unique contract numbers (CON-XXXX) per rental agreement
- PDF invoice generation and download
- Overdue payment tracking and alerts
- Fine/additional charges with descriptions
- Payment entry page with 5-month payment history
- Mobile phone with country code selector (default: +968 Oman)
- Support for 11 countries: UAE, Saudi Arabia, Yemen, Kuwait, Qatar, Egypt, India, Bangladesh, Pakistan, Sri Lanka, Others

### Authentication & Role-Based Access Control (Phase 3)
- JWT-based authentication with secure token management
- Two user roles: **Admin** and **User**
- Bcrypt password hashing (10 salt rounds)
- Session management with 24-hour token expiry
- Protected routes with role-based access control
- Audit logging for all user actions

### User Management (Admin Only)
- Create, edit, and delete users
- Reset user passwords
- Toggle user active/inactive status
- View user activity logs
- Assign roles and permissions

### Expense Approval Workflow (Phase 3)
- **Users**: Submit expenses (status: pending) awaiting admin approval
- **Admins**: Auto-approved expenses, bypass approval workflow
- Dedicated expense approval page for admins
- Approve/reject with notes and reason tracking
- View all pending, approved, and rejected expenses
- Audit trail of approver and timestamps

### Edit Time Window (Phase 3)
- **Users**: 15-minute edit window for new entries (tenants, rentals)
- **Admins**: Unlimited edit access to all records
- Automatic timestamp tracking with database triggers
- Visual indicators for edit permission status

### Admin Reports (Phase 3)
- Comprehensive PDF reports with date range selection
- Report types: 6 months, 12 months, custom date range
- Building-specific or all-buildings reports
- Includes: Building summaries, tenant details, payment breakdowns, rental information, income/expense analysis
- Professional PDF formatting with tables and sections

### Dashboard & Reports
- Real-time statistics with role-based data filtering
- Today's and monthly income/expense summary
- 7-day income/expense trends
- Visual charts and graphs
- Pending payments overview
- Pending expenses approval count (Admin)
- Recent activities

## Technology Stack

### Backend
- Node.js with Express.js
- PostgreSQL (database with triggers and sequences)
- Redis (3-month data caching)
- JWT (JSON Web Tokens) for authentication
- Bcrypt for password hashing
- PDFKit for invoice and report generation
- Multer for file uploads (ID documents)

### Frontend
- React 18 with Hooks
- React Router v6 for routing
- React Context API for auth state management
- Recharts for data visualization
- Axios with interceptors for API calls
- React Icons for UI elements

## Installation

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Database Setup

1. Install PostgreSQL and create a database:
```bash
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo -u postgres psql

# In PostgreSQL console:
CREATE DATABASE flat_management;
CREATE USER flat_admin WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE flat_management TO flat_admin;
\q
```

2. Import all schemas in order (Phase 1, 2, and 3):
```bash
# Phase 1: Core tables
psql -U flat_admin -d flat_management -f backend/database/schema.sql

# Phase 2: Invoices, schedules, country codes
psql -U flat_admin -d flat_management -f backend/database/schema_phase2.sql

# Phase 3: Authentication and RBAC
psql -U flat_admin -d flat_management -f backend/database/schema_phase3_auth.sql
```

3. Verify the schema import:
```bash
psql -U flat_admin -d flat_management -c "\dt"
# Should show all tables including: buildings, flats, tenants, rentals, payments,
# expenses, invoices, payment_schedules, users, audit_log, sessions
```

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Edit `.env` with your database credentials and JWT secret:
```
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flat_management
DB_USER=flat_admin
DB_PASSWORD=your_secure_password

# JWT Authentication
JWT_SECRET=your_very_long_and_secure_random_secret_key_here_change_in_production

# Redis Configuration (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_TTL=7776000
```

⚠️ **Important**: Generate a strong JWT_SECRET for production:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

5. Start the backend server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The application will open at `http://localhost:3000`

## User Roles and Permissions

### Admin Role
**Full system access with all privileges:**
- ✅ View all buildings, flats, tenants, and payments
- ✅ Create, edit, and delete any records (no time restrictions)
- ✅ Access User Management page
- ✅ Create/edit/delete users and reset passwords
- ✅ Approve or reject expense submissions
- ✅ All submitted expenses are auto-approved
- ✅ Generate PDF reports (6m/12m/custom date range)
- ✅ View comprehensive admin reports
- ✅ Access all admin-only pages and features

### User Role
**Limited access for daily operations:**
- ✅ View dashboard with filtered statistics
- ✅ View all flats and their occupancy status
- ✅ Create new tenant entries (flat assignments)
- ✅ Make payment entries for existing tenants
- ✅ Submit expenses (status: pending, requires admin approval)
- ✅ Edit own entries within 15-minute window
- ❌ Cannot access buildings management
- ❌ Cannot view all tenants list
- ❌ Cannot view all payments history
- ❌ Cannot access admin reports
- ❌ Cannot access user management
- ❌ Cannot approve expenses
- ❌ Cannot edit after 15-minute window expires

### Default Accounts
The system includes two default accounts for testing:

**Admin Account:**
- Username: `admin`
- Password: `admin123`
- Full administrative access

**User Account:**
- Username: `user1`
- Password: `user123`
- Standard user access

⚠️ **Security Warning**: Change these default credentials immediately in production!

## Production Deployment on VPS

### 1. Server Preparation

```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Install Nginx
sudo apt-get install nginx

# Install PM2 for process management
sudo npm install -g pm2
```

### 2. Database Setup

```bash
# Create database and user
sudo -u postgres psql
CREATE DATABASE flat_management;
CREATE USER flat_admin WITH PASSWORD 'strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE flat_management TO flat_admin;
\q

# Import all schemas in order
psql -U flat_admin -d flat_management -f /path/to/backend/database/schema.sql
psql -U flat_admin -d flat_management -f /path/to/backend/database/schema_phase2.sql
psql -U flat_admin -d flat_management -f /path/to/backend/database/schema_phase3_auth.sql
```

### 3. Deploy Backend

```bash
# Clone or upload your project to VPS
cd /var/www/flat-management-app/backend

# Install dependencies
npm install --production

# Create .env file
nano .env
# Add your production configuration

# Start with PM2
pm2 start server.js --name flat-management-api
pm2 save
pm2 startup
```

### 4. Build and Deploy Frontend

```bash
cd /var/www/flat-management-app/frontend

# Install dependencies
npm install

# Create production build
npm run build

# The build folder will contain your static files
```

### 5. Configure Nginx

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/flat-management
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or IP

    # Frontend
    location / {
        root /var/www/flat-management-app/frontend/build;
        try_files $uri /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Serve uploaded files
    location /uploads {
        alias /var/www/flat-management-app/backend/uploads;
    }

    client_max_body_size 10M;
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/flat-management /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 6. Setup SSL (Optional but Recommended)

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 7. Setup Firewall

```bash
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

## Usage

### Initial Setup

1. Access the application at `http://your-domain.com` or `http://your-vps-ip`

2. **Login** with default credentials:
   - Admin: username `admin`, password `admin123`
   - User: username `user1`, password `user123`
   - Change these credentials immediately after first login!

3. **(Admin Only)** Create additional user accounts:
   - Navigate to "User Management" in the navbar
   - Click "Create User"
   - Fill in username, email, full name, password
   - Select role (admin or user)
   - Submit to create the account

4. **(Admin Only)** Start by adding your buildings:
   - Go to "Buildings" page
   - Click "Add Building"
   - Enter building details and number of flats
   - Flats will be created automatically

3. Add new tenants:
   - Click "New Entry" button on dashboard
   - Fill in tenant information
   - Upload ID document (optional)
   - Select building and available flat
   - Set rental terms (duration, amount, advance)
   - Submit to create tenant and rental agreement

4. Record payments and expenses as they occur

### Daily Operations

**For All Users:**
- **Dashboard**: View statistics and quick actions (role-filtered)
- **Flats**: View all flats and their occupancy status
- **Payment Entry**: Record payments for existing tenants
- **Expenses**: Submit expenses (users: pending approval, admins: auto-approved)
- **New Entry**: Create new tenant entries with flat assignments

**For Admin Users Only:**
- **Buildings**: Manage building information and add new buildings
- **Tenants**: View complete tenant list and history
- **Payments**: View all payment history and analytics
- **Expense Approval**: Approve/reject pending expense submissions
- **Reports**: Generate comprehensive PDF reports (6m/12m/custom)
- **User Management**: Create, edit, delete users and manage permissions

**Edit Permissions:**
- **Users**: Can edit own entries for 15 minutes after creation
- **Admins**: Can edit any record at any time

## Maintenance

### Backup Database

```bash
# Create backup
pg_dump -U flat_admin flat_management > backup_$(date +%Y%m%d).sql

# Restore from backup
psql -U flat_admin flat_management < backup_20231201.sql
```

### View Logs

```bash
# PM2 logs
pm2 logs flat-management-api

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Update Application

```bash
# Backend
cd /var/www/flat-management-app/backend
git pull  # or upload new files
npm install
pm2 restart flat-management-api

# Frontend
cd /var/www/flat-management-app/frontend
git pull  # or upload new files
npm install
npm run build
sudo systemctl reload nginx
```

## Security Recommendations

### Critical (Do Before Production)
1. **Change default user credentials** (admin/user1) immediately
2. **Generate a strong JWT_SECRET** using: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
3. **Change default database password** to a strong random password
4. **Enable SSL/HTTPS** with Let's Encrypt or your certificate provider

### Authentication & Authorization
5. Set JWT token expiry appropriately (default: 24 hours)
6. Implement password complexity requirements
7. Add account lockout after failed login attempts
8. Enable two-factor authentication (2FA) for admin accounts
9. Review and audit user permissions regularly
10. Monitor audit logs for suspicious activities

### Database & Infrastructure
11. Use environment variables for all sensitive data
12. Set up automated daily database backups
13. Limit database access to localhost only
14. Keep Node.js, PostgreSQL, and all dependencies updated
15. Set appropriate file permissions (uploads directory: 755)
16. Configure Redis with authentication if exposed

### Network & Access
17. Setup firewall rules (allow only 22, 80, 443)
18. Use fail2ban to prevent brute-force attacks
19. Implement rate limiting on API endpoints
20. Review and restrict CORS settings

## Troubleshooting

### Backend won't start
- Check PostgreSQL is running: `sudo systemctl status postgresql`
- Verify database credentials in `.env`
- Ensure JWT_SECRET is set in `.env`
- Check all 3 schema files were imported correctly
- Check logs: `pm2 logs flat-management-api`

### Frontend shows blank page
- Check if build was created: `ls frontend/build`
- Verify Nginx configuration: `sudo nginx -t`
- Check browser console for errors
- Ensure backend API is running and accessible

### Database connection errors
- Verify PostgreSQL is running
- Check firewall settings
- Verify database credentials
- Check PostgreSQL logs: `sudo tail -f /var/log/postgresql/postgresql-*.log`

### Authentication issues
- **Cannot login**: Verify JWT_SECRET is set in backend `.env`
- **Token expired**: Tokens expire after 24 hours, login again
- **403 Forbidden**: User lacks required permissions for the resource
- **401 Unauthorized**: Token is invalid or expired, clear localStorage and login
- Check browser console for specific error messages
- Verify user account is active in database: `SELECT * FROM users WHERE username = 'admin';`

### Permission denied errors
- **User role** cannot access admin-only pages (Buildings, Tenants, Payments list, Reports, User Management)
- **15-minute edit window** expired for user role
- Check user role: Look at navbar user badge (ADMIN or USER)
- Admin can bypass all time-based edit restrictions

### Expense approval not working
- Only **admin** users can approve/reject expenses
- User-submitted expenses show as "pending" status
- Check Expense Approval page (admin only)
- Verify user role in database: `SELECT role FROM users WHERE id = X;`

## Project Development Status

### ✅ Phase 1: Core Flat Management System (Complete)
**Completed Features:**
- Building management with automatic flat creation
- Tenant management with ID document upload
- Flat occupancy tracking
- Rental agreements with flexible duration (days/months)
- Payment tracking (rent, advance, other)
- Expense tracking with categorization
- Dashboard with statistics and visualizations
- Real-time occupancy and financial summaries

### ✅ Phase 2: Enhanced Features (Complete)
**Completed Features:**
- Mobile phone with country code selector (11 countries + Others)
- Default country code: +968 (Oman)
- PostgreSQL sequences for unique numbers
- Unique contract numbers (CON-XXXX) per rental agreement
- Unique invoice numbers (INV-XXXX) with auto-increment
- Automated invoice generation with PDF download
- Payment scheduling based on contract duration
- Overdue payment tracking and alerts
- Payment entry page with 5-month payment history
- Fine/additional charges with description fields
- Redis caching for 3-month data optimization

### ✅ Phase 3: Authentication & RBAC (Complete)
**Completed Features:**
- JWT-based authentication system
- Bcrypt password hashing (10 salt rounds)
- Two user roles: Admin and User
- Protected routes with role-based access control
- User management interface (admin only)
- Expense approval workflow (pending/approved/rejected)
- 15-minute edit window for users
- Unlimited edit access for admins
- Admin PDF reports (6m/12m/custom date range)
- Comprehensive reporting with building/tenant/payment details
- Audit logging for all user actions
- Session management with 24-hour token expiry
- Role-based navigation menu
- Access denied page for unauthorized access

### 🎉 Production Status
**All 3 Phases Complete** - The system is production-ready with:
- ✅ Complete authentication and authorization
- ✅ Role-based access control
- ✅ Comprehensive financial tracking
- ✅ Automated invoice generation
- ✅ Expense approval workflows
- ✅ Professional PDF reporting
- ✅ Secure password management
- ✅ Audit trail for compliance

## Support

For issues or questions, please check the logs and error messages for detailed information.

## License

This project is licensed for private use.
