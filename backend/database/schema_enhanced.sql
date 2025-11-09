-- Enhanced Flat Management Application Database Schema
-- Includes: Contract Management, Invoice System, Payment Tracking, Redis Cache Support

-- Buildings table
CREATE TABLE IF NOT EXISTS buildings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    total_flats INTEGER NOT NULL,
    contact_number VARCHAR(50),
    other_details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Flats table
CREATE TABLE IF NOT EXISTS flats (
    id SERIAL PRIMARY KEY,
    building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
    flat_number VARCHAR(50) NOT NULL,
    floor_number INTEGER,
    is_occupied BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(building_id, flat_number)
);

-- Tenants table (enhanced with country code)
CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    id_number VARCHAR(100) NOT NULL UNIQUE,
    nationality VARCHAR(100),
    country_code VARCHAR(10) DEFAULT '+968',
    contact_number VARCHAR(50),
    email VARCHAR(255),
    id_document_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contract sequence for generating unique contract numbers
CREATE SEQUENCE IF NOT EXISTS contract_number_seq START WITH 1000;

-- Rental agreements table (enhanced with contract number and payment terms)
CREATE TABLE IF NOT EXISTS rental_agreements (
    id SERIAL PRIMARY KEY,
    contract_number VARCHAR(50) UNIQUE NOT NULL DEFAULT ('CON-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('contract_number_seq')::TEXT, 6, '0')),
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    flat_id INTEGER REFERENCES flats(id) ON DELETE CASCADE,
    building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE,
    duration_value INTEGER NOT NULL,
    duration_unit VARCHAR(20) NOT NULL CHECK (duration_unit IN ('days', 'months')),
    rental_amount DECIMAL(10, 2) NOT NULL,
    rental_period VARCHAR(20) NOT NULL CHECK (rental_period IN ('day', 'month')),
    advance_amount DECIMAL(10, 2) DEFAULT 0,
    security_deposit DECIMAL(10, 2) DEFAULT 0,
    total_amount_due DECIMAL(10, 2),
    total_amount_paid DECIMAL(10, 2) DEFAULT 0,
    balance_amount DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoice sequence for generating unique invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START WITH 10000;

-- Invoices table
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(50) UNIQUE NOT NULL DEFAULT ('INV-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('invoice_number_seq')::TEXT, 6, '0')),
    contract_number VARCHAR(50) REFERENCES rental_agreements(contract_number),
    rental_agreement_id INTEGER REFERENCES rental_agreements(id) ON DELETE CASCADE,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
    flat_id INTEGER REFERENCES flats(id) ON DELETE CASCADE,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    billing_period_start DATE,
    billing_period_end DATE,
    rental_amount DECIMAL(10, 2) NOT NULL,
    previous_balance DECIMAL(10, 2) DEFAULT 0,
    payment_received DECIMAL(10, 2) DEFAULT 0,
    late_fee DECIMAL(10, 2) DEFAULT 0,
    fine_amount DECIMAL(10, 2) DEFAULT 0,
    fine_description TEXT,
    additional_charges DECIMAL(10, 2) DEFAULT 0,
    additional_charges_description TEXT,
    discount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    balance_amount DECIMAL(10, 2) NOT NULL,
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'partial', 'overdue')),
    pdf_path VARCHAR(500),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enhanced Payments table (linked to invoices)
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    payment_number VARCHAR(50) UNIQUE,
    invoice_id INTEGER REFERENCES invoices(id) ON DELETE SET NULL,
    rental_agreement_id INTEGER REFERENCES rental_agreements(id) ON DELETE CASCADE,
    contract_number VARCHAR(50),
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_type VARCHAR(50) CHECK (payment_type IN ('rent', 'advance', 'security_deposit', 'late_fee', 'other')),
    payment_method VARCHAR(50),
    payment_status VARCHAR(20) DEFAULT 'completed' CHECK (payment_status IN ('completed', 'pending', 'failed', 'refunded')),
    is_partial BOOLEAN DEFAULT FALSE,
    billing_period_start DATE,
    billing_period_end DATE,
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payment Schedule table (auto-generated based on contract)
CREATE TABLE IF NOT EXISTS payment_schedules (
    id SERIAL PRIMARY KEY,
    rental_agreement_id INTEGER REFERENCES rental_agreements(id) ON DELETE CASCADE,
    contract_number VARCHAR(50),
    due_date DATE NOT NULL,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    amount_due DECIMAL(10, 2) NOT NULL,
    amount_paid DECIMAL(10, 2) DEFAULT 0,
    balance DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'partial', 'overdue')),
    payment_id INTEGER REFERENCES payments(id) ON DELETE SET NULL,
    is_overdue BOOLEAN DEFAULT FALSE,
    days_overdue INTEGER DEFAULT 0,
    late_fee DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Expenses table
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    building_id INTEGER REFERENCES buildings(id) ON DELETE SET NULL,
    expense_date DATE NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_flats_building ON flats(building_id);
CREATE INDEX IF NOT EXISTS idx_flats_occupied ON flats(is_occupied);
CREATE INDEX IF NOT EXISTS idx_tenants_country_code ON tenants(country_code);
CREATE INDEX IF NOT EXISTS idx_rental_agreements_tenant ON rental_agreements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rental_agreements_flat ON rental_agreements(flat_id);
CREATE INDEX IF NOT EXISTS idx_rental_agreements_active ON rental_agreements(is_active);
CREATE INDEX IF NOT EXISTS idx_rental_agreements_contract ON rental_agreements(contract_number);
CREATE INDEX IF NOT EXISTS idx_invoices_contract ON invoices(contract_number);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_rental_agreement ON payments(rental_agreement_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_contract ON payments(contract_number);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_due_date ON payment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_status ON payment_schedules(status);
CREATE INDEX IF NOT EXISTS idx_payment_schedules_overdue ON payment_schedules(is_overdue);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_building ON expenses(building_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate balance in payment schedules
CREATE OR REPLACE FUNCTION calculate_payment_schedule_balance()
RETURNS TRIGGER AS $$
BEGIN
    NEW.balance = NEW.amount_due - NEW.amount_paid;

    -- Update status based on amount paid
    IF NEW.amount_paid >= NEW.amount_due THEN
        NEW.status = 'paid';
        NEW.is_overdue = FALSE;
    ELSIF NEW.amount_paid > 0 THEN
        NEW.status = 'partial';
    ELSIF NEW.due_date < CURRENT_DATE THEN
        NEW.status = 'overdue';
        NEW.is_overdue = TRUE;
        NEW.days_overdue = CURRENT_DATE - NEW.due_date;
    ELSE
        NEW.status = 'pending';
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate rental agreement totals
CREATE OR REPLACE FUNCTION calculate_rental_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate total amount due based on duration
    IF NEW.rental_period = 'month' THEN
        IF NEW.duration_unit = 'months' THEN
            NEW.total_amount_due = NEW.rental_amount * NEW.duration_value + NEW.advance_amount + NEW.security_deposit;
        ELSE
            -- Convert days to months (approximate)
            NEW.total_amount_due = NEW.rental_amount * CEILING(NEW.duration_value::DECIMAL / 30) + NEW.advance_amount + NEW.security_deposit;
        END IF;
    ELSIF NEW.rental_period = 'day' THEN
        IF NEW.duration_unit = 'days' THEN
            NEW.total_amount_due = NEW.rental_amount * NEW.duration_value + NEW.advance_amount + NEW.security_deposit;
        ELSE
            -- Convert months to days (approximate)
            NEW.total_amount_due = NEW.rental_amount * (NEW.duration_value * 30) + NEW.advance_amount + NEW.security_deposit;
        END IF;
    END IF;

    -- Calculate balance
    NEW.balance_amount = NEW.total_amount_due - NEW.total_amount_paid;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to update rental agreement paid amount when payment is made
CREATE OR REPLACE FUNCTION update_rental_paid_amount()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_status = 'completed' AND NEW.rental_agreement_id IS NOT NULL THEN
        UPDATE rental_agreements
        SET total_amount_paid = total_amount_paid + NEW.amount,
            balance_amount = total_amount_due - (total_amount_paid + NEW.amount)
        WHERE id = NEW.rental_agreement_id;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_buildings_updated_at BEFORE UPDATE ON buildings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flats_updated_at BEFORE UPDATE ON flats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rental_agreements_updated_at BEFORE UPDATE ON rental_agreements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_schedules_updated_at BEFORE UPDATE ON payment_schedules
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create triggers for calculations
CREATE TRIGGER calculate_rental_totals_trigger BEFORE INSERT OR UPDATE ON rental_agreements
    FOR EACH ROW EXECUTE FUNCTION calculate_rental_totals();

CREATE TRIGGER calculate_payment_schedule_balance_trigger BEFORE INSERT OR UPDATE ON payment_schedules
    FOR EACH ROW EXECUTE FUNCTION calculate_payment_schedule_balance();

CREATE TRIGGER update_rental_paid_amount_trigger AFTER INSERT ON payments
    FOR EACH ROW EXECUTE FUNCTION update_rental_paid_amount();

-- Create view for overdue payments
CREATE OR REPLACE VIEW overdue_payments_view AS
SELECT
    ps.*,
    ra.contract_number,
    t.name as tenant_name,
    t.country_code || ' ' || t.contact_number as tenant_contact,
    b.name as building_name,
    f.flat_number,
    ra.rental_amount,
    ra.rental_period
FROM payment_schedules ps
JOIN rental_agreements ra ON ps.rental_agreement_id = ra.id
JOIN tenants t ON ra.tenant_id = t.id
JOIN flats f ON ra.flat_id = f.id
JOIN buildings b ON ra.building_id = b.id
WHERE ps.is_overdue = TRUE AND ra.is_active = TRUE
ORDER BY ps.days_overdue DESC, ps.due_date ASC;

-- Create view for pending payments
CREATE OR REPLACE VIEW pending_payments_view AS
SELECT
    ps.*,
    ra.contract_number,
    t.name as tenant_name,
    t.country_code || ' ' || t.contact_number as tenant_contact,
    b.name as building_name,
    f.flat_number,
    ra.rental_amount,
    ra.rental_period
FROM payment_schedules ps
JOIN rental_agreements ra ON ps.rental_agreement_id = ra.id
JOIN tenants t ON ra.tenant_id = t.id
JOIN flats f ON ra.flat_id = f.id
JOIN buildings b ON ra.building_id = b.id
WHERE ps.status IN ('pending', 'partial') AND ra.is_active = TRUE
ORDER BY ps.due_date ASC;

-- Insert default country codes data (for reference)
CREATE TABLE IF NOT EXISTS country_codes (
    id SERIAL PRIMARY KEY,
    country_name VARCHAR(100) NOT NULL,
    country_code VARCHAR(10) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE
);

INSERT INTO country_codes (country_name, country_code, is_default) VALUES
('Oman', '+968', TRUE),
('UAE', '+971', FALSE),
('Saudi Arabia', '+966', FALSE),
('Yemen', '+967', FALSE),
('Kuwait', '+965', FALSE),
('Qatar', '+974', FALSE),
('Egypt', '+20', FALSE),
('India', '+91', FALSE),
('Bangladesh', '+880', FALSE),
('Pakistan', '+92', FALSE),
('Sri Lanka', '+94', FALSE)
ON CONFLICT DO NOTHING;
