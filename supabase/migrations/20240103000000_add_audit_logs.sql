-- Create audit_logs table
CREATE TABLE audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    device_id TEXT NOT NULL,
    device_type TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    warehouse_name TEXT NOT NULL,
    section_letter TEXT,
    old_value TEXT,
    new_value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow public access to audit_logs" ON audit_logs;

-- Create new policy with more permissive rules
CREATE POLICY "Allow public access to audit_logs"
    ON audit_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_audit_logs_device_id ON audit_logs(device_id);
CREATE INDEX idx_audit_logs_device_type ON audit_logs(device_type);
CREATE INDEX idx_audit_logs_ip_address ON audit_logs(ip_address);
CREATE INDEX idx_audit_logs_warehouse_name ON audit_logs(warehouse_name);
CREATE INDEX idx_audit_logs_section_letter ON audit_logs(section_letter);
CREATE INDEX idx_audit_logs_updated_at ON audit_logs(updated_at); 