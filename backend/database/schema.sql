-- Flat Management Application Database Schema

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

-- Tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    id_number VARCHAR(100) NOT NULL UNIQUE,
    nationality VARCHAR(100),
    contact_number VARCHAR(50),
    email VARCHAR(255),
    id_document_path VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rental agreements table
CREATE TABLE IF NOT EXISTS rental_agreements (
    id SERIAL PRIMARY KEY,
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
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    rental_agreement_id INTEGER REFERENCES rental_agreements(id) ON DELETE CASCADE,
    tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
    building_id INTEGER REFERENCES buildings(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_type VARCHAR(50) CHECK (payment_type IN ('rent', 'advance', 'other')),
    payment_method VARCHAR(50),
    remarks TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
CREATE INDEX idx_flats_building ON flats(building_id);
CREATE INDEX idx_flats_occupied ON flats(is_occupied);
CREATE INDEX idx_rental_agreements_tenant ON rental_agreements(tenant_id);
CREATE INDEX idx_rental_agreements_flat ON rental_agreements(flat_id);
CREATE INDEX idx_rental_agreements_active ON rental_agreements(is_active);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_payments_rental_agreement ON payments(rental_agreement_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_building ON expenses(building_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
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
