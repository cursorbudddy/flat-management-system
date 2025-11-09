-- Phase 3: Authentication and Role-Based Access Control
-- This script adds user authentication, roles, and permissions

-- ============================================
-- 1. Create Users and Roles Tables
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user', -- 'admin' or 'user'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Create index on username and email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ============================================
-- 2. Update Expenses Table with Approval System
-- ============================================

-- Add approval fields to expenses table
ALTER TABLE expenses
ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS submitted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS approval_notes TEXT;

-- Create index on approval_status for faster filtering
CREATE INDEX IF NOT EXISTS idx_expenses_approval_status ON expenses(approval_status);
CREATE INDEX IF NOT EXISTS idx_expenses_submitted_by ON expenses(submitted_by);

-- ============================================
-- 3. Add Edit Tracking for New Entries
-- ============================================

-- Add created_at to rental_agreements if not exists
ALTER TABLE rental_agreements
ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS can_edit_until TIMESTAMP;

-- Add created_at to tenants if not exists
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS can_edit_until TIMESTAMP;

-- Create indexes for edit tracking
CREATE INDEX IF NOT EXISTS idx_rental_agreements_created_by ON rental_agreements(created_by);
CREATE INDEX IF NOT EXISTS idx_tenants_created_by ON tenants(created_by);

-- ============================================
-- 4. Create Audit Log Table
-- ============================================

CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INTEGER,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for audit log
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- ============================================
-- 5. Create User Sessions Table (Optional - for session management)
-- ============================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token_hash ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- ============================================
-- 6. Create Database Views for Different User Roles
-- ============================================

-- View for regular users: Shows only essential flat and tenant information
CREATE OR REPLACE VIEW user_flats_view AS
SELECT
    f.id,
    f.flat_number,
    f.is_occupied,
    b.id as building_id,
    b.name as building_name,
    CASE
        WHEN f.is_occupied THEN t.name
        ELSE NULL
    END as tenant_name,
    CASE
        WHEN f.is_occupied THEN ra.start_date
        ELSE NULL
    END as rental_start_date,
    CASE
        WHEN f.is_occupied THEN ra.rental_amount
        ELSE NULL
    END as rental_amount
FROM flats f
JOIN buildings b ON f.building_id = b.id
LEFT JOIN rental_agreements ra ON f.id = ra.flat_id AND ra.is_active = true
LEFT JOIN tenants t ON ra.tenant_id = t.id;

-- View for admin: Complete payment and expense report
CREATE OR REPLACE VIEW admin_financial_summary AS
SELECT
    DATE(p.payment_date) as transaction_date,
    'income' as transaction_type,
    p.amount,
    b.name as building_name,
    t.name as entity_name,
    'Payment' as category
FROM payments p
LEFT JOIN rental_agreements ra ON p.rental_agreement_id = ra.id
LEFT JOIN tenants t ON p.tenant_id = t.id
LEFT JOIN buildings b ON p.building_id = b.id
WHERE p.payment_date IS NOT NULL

UNION ALL

SELECT
    DATE(e.expense_date) as transaction_date,
    'expense' as transaction_type,
    e.amount,
    b.name as building_name,
    e.category as entity_name,
    e.category
FROM expenses e
LEFT JOIN buildings b ON e.building_id = b.id
WHERE e.expense_date IS NOT NULL AND e.approval_status = 'approved'

ORDER BY transaction_date DESC;

-- ============================================
-- 7. Create Functions for Common Operations
-- ============================================

-- Function to check if user can edit an entry
CREATE OR REPLACE FUNCTION can_user_edit_entry(
    p_user_id INTEGER,
    p_created_by INTEGER,
    p_can_edit_until TIMESTAMP,
    p_user_role VARCHAR
) RETURNS BOOLEAN AS $$
BEGIN
    -- Admin can always edit
    IF p_user_role = 'admin' THEN
        RETURN TRUE;
    END IF;

    -- Check if user created the entry
    IF p_created_by = p_user_id THEN
        -- Check if within edit time window
        IF p_can_edit_until IS NOT NULL AND CURRENT_TIMESTAMP <= p_can_edit_until THEN
            RETURN TRUE;
        END IF;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Function to set edit time window (15 minutes from creation)
CREATE OR REPLACE FUNCTION set_edit_time_window() RETURNS TRIGGER AS $$
BEGIN
    NEW.can_edit_until := CURRENT_TIMESTAMP + INTERVAL '15 minutes';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for rental_agreements
DROP TRIGGER IF EXISTS set_rental_edit_window ON rental_agreements;
CREATE TRIGGER set_rental_edit_window
    BEFORE INSERT ON rental_agreements
    FOR EACH ROW
    EXECUTE FUNCTION set_edit_time_window();

-- Trigger for tenants
DROP TRIGGER IF EXISTS set_tenant_edit_window ON tenants;
CREATE TRIGGER set_tenant_edit_window
    BEFORE INSERT ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION set_edit_time_window();

-- ============================================
-- 8. Create Default Admin User
-- ============================================

-- Note: Password is 'admin123' (hashed with bcrypt)
-- This should be changed immediately after first login
INSERT INTO users (username, email, password_hash, full_name, role, is_active)
VALUES (
    'admin',
    'admin@flatmanagement.com',
    '$2b$10$rBV2LHXf.OqP3Z9hE0jV5.YnXqKGEk4YiF3yLNJLFDX5QKqNcV4Xa', -- bcrypt hash of 'admin123'
    'System Administrator',
    'admin',
    true
)
ON CONFLICT (username) DO NOTHING;

-- ============================================
-- 9. Grant Appropriate Permissions
-- ============================================

-- Admin has full access to all tables
-- Regular users have limited access (handled in application layer)

-- ============================================
-- 10. Create Indexes for Performance
-- ============================================

-- Additional indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_expenses_approval_approved_at ON expenses(approved_at) WHERE approval_status = 'approved';
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_rental_agreements_dates ON rental_agreements(start_date, end_date);

-- ============================================
-- Comments for Documentation
-- ============================================

COMMENT ON TABLE users IS 'System users with role-based access control';
COMMENT ON TABLE audit_log IS 'Audit trail for all system actions';
COMMENT ON TABLE user_sessions IS 'Active user sessions for token management';
COMMENT ON COLUMN expenses.approval_status IS 'Status: pending, approved, rejected';
COMMENT ON COLUMN rental_agreements.can_edit_until IS '15-minute edit window after creation';
COMMENT ON COLUMN tenants.can_edit_until IS '15-minute edit window after creation';

-- ============================================
-- Sample Additional User (Optional)
-- ============================================

-- Sample regular user (password: 'user123')
INSERT INTO users (username, email, password_hash, full_name, role, is_active, created_by)
SELECT
    'user1',
    'user1@flatmanagement.com',
    '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGqhePPVQ8vhAHqVqvZPkXa', -- bcrypt hash of 'user123'
    'Regular User',
    'user',
    true,
    (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE username = 'admin')
ON CONFLICT (username) DO NOTHING;

-- ============================================
-- Phase 3 Schema Complete
-- ============================================
