-- ==========================================================
-- Schema: Industrial Machinery & Energy Consumption Telemetry
-- Target Engine: Neon Serverless PostgreSQL
-- ==========================================================

-- 1. Machine Inventory Table
CREATE TABLE IF NOT EXISTS machines (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    machine_type VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    location VARCHAR(100),
    nominal_power_kw NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Machine Consumption Readings Table (Time-Series Telemetry)
CREATE TABLE IF NOT EXISTS consumption_readings (
    id BIGSERIAL PRIMARY KEY,
    machine_id VARCHAR(64) NOT NULL REFERENCES machines(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    active_power_kw NUMERIC(10, 3) NOT NULL,
    total_kwh NUMERIC(12, 3) NOT NULL,
    voltage_v NUMERIC(8, 2),
    current_a NUMERIC(8, 2),
    status VARCHAR(50) NOT NULL DEFAULT 'OPERATIONAL'
);

-- 3. Composite Index: Essential for fast retrieval of latest reading per machine & time-window ranges
CREATE INDEX IF NOT EXISTS idx_readings_machine_recorded 
ON consumption_readings (machine_id, recorded_at DESC);

-- 4. Global Time Index: Fast filtering across all machines for historical windows
CREATE INDEX IF NOT EXISTS idx_readings_recorded 
ON consumption_readings (recorded_at DESC);
