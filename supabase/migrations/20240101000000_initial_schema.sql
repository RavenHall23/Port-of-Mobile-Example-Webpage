-- Drop existing tables and constraints
DROP TABLE IF EXISTS warehouse_sections CASCADE;
DROP TABLE IF EXISTS sections CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;

-- Create a function to generate shorter UUIDs
CREATE OR REPLACE FUNCTION generate_short_uuid()
RETURNS UUID AS $$
DECLARE
  v_uuid UUID;
BEGIN
  -- Generate a UUID
  v_uuid := gen_random_uuid();
  -- Return the first 8 characters followed by zeros
  RETURN (substring(v_uuid::text, 1, 8) || '-0000-0000-0000-000000000000')::uuid;
END;
$$ LANGUAGE plpgsql;

-- Create warehouses table with shorter UUIDs
CREATE TABLE warehouses (
  id UUID DEFAULT generate_short_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('indoor', 'outdoor')),
  letter TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create warehouse_sections table with shorter UUIDs
CREATE TABLE warehouse_sections (
  id UUID DEFAULT generate_short_uuid() PRIMARY KEY,
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  warehouse_name TEXT NOT NULL,
  section_number INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('green', 'yellow', 'orange', 'red')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(warehouse_id, section_number)
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update warehouse_name in warehouse_sections when warehouse name changes
CREATE OR REPLACE FUNCTION update_warehouse_sections_name()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE warehouse_sections
  SET warehouse_name = NEW.name
  WHERE warehouse_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at and warehouse name
CREATE TRIGGER update_warehouses_updated_at
  BEFORE UPDATE ON warehouses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warehouse_sections_updated_at
  BEFORE UPDATE ON warehouse_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warehouse_sections_name
  AFTER UPDATE OF name ON warehouses
  FOR EACH ROW
  EXECUTE FUNCTION update_warehouse_sections_name();

-- Enable RLS
ALTER TABLE warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE warehouse_sections ENABLE ROW LEVEL SECURITY;

-- Create policies that allow all operations
CREATE POLICY "Allow all operations" ON warehouses
  FOR ALL USING (true);

CREATE POLICY "Allow all operations" ON warehouse_sections
  FOR ALL USING (true);

-- Insert initial data
INSERT INTO warehouses (name, type, letter) VALUES
-- Indoor Warehouses (A-Z, then AA-AZ)
('BERTH 2', 'indoor', 'A'),
('BERTH 3', 'indoor', 'B'),
('BERTH 4', 'indoor', 'C'),
('BERTH 5', 'indoor', 'D'),
('BERTH 6', 'indoor', 'E'),
('BERTH 7', 'indoor', 'F'),
('BERTH 8', 'indoor', 'G'),
('BERTH 8 RO/RO', 'indoor', 'H'),
('BERTH 8 WHS', 'indoor', 'I'),
('UNIT 19 WHS', 'indoor', 'J'),
('PIER A SOUTH', 'indoor', 'K'),
('A 18 WHS 2', 'indoor', 'L'),
('Center A WHS', 'indoor', 'M'),
('PIER A NORTH', 'indoor', 'N'),
('MOBILE REGRIG', 'indoor', 'O'),
('PIER B SOUTH', 'indoor', 'P'),
('PIER B RIVER END', 'indoor', 'Q'),
('PIER B NORTH', 'indoor', 'R'),
('PIER C SOUTH', 'indoor', 'S'),
('PIER C RIVER END', 'indoor', 'T'),
('PIER C (1,2, &3 Below)', 'indoor', 'U'),
('PIER C 1&2', 'indoor', 'V'),
('PIER C NORTH 3', 'indoor', 'W'),
('PIG IRON DOCK', 'indoor', 'X'),
('PIER D WHS', 'indoor', 'Y'),
('PIER D2', 'indoor', 'Z'),
('PIER E', 'indoor', 'AA'),
('BULK PLANT', 'indoor', 'AB'),
('BLAKEYLEY DOCK', 'indoor', 'AC'),
-- Outdoor Warehouses (BA-BZ, then CA-CZ)
('BERTH 2', 'outdoor', 'BA'),
('BERTH 3', 'outdoor', 'BB'),
('BERTH 4', 'outdoor', 'BC'),
('BERTH 5', 'outdoor', 'BD'),
('BERTH 6', 'outdoor', 'BE'),
('BERTH 7', 'outdoor', 'BF'),
('BERTH 8', 'outdoor', 'BG'),
('BERTH 8 RO/RO', 'outdoor', 'BH'),
('BERTH 8 WHS', 'outdoor', 'BI'),
('UNIT 19 WHS', 'outdoor', 'BJ'),
('PIER A SOUTH', 'outdoor', 'BK'),
('A 18 WHS 2', 'outdoor', 'BL'),
('Center A WHS', 'outdoor', 'BM'),
('PIER A NORTH', 'outdoor', 'BN'),
('MOBILE REGRIG', 'outdoor', 'BO'),
('PIER B SOUTH', 'outdoor', 'BP'),
('PIER B RIVER END', 'outdoor', 'BQ'),
('PIER B NORTH', 'outdoor', 'BR'),
('PIER C SOUTH', 'outdoor', 'BS'),
('PIER C RIVER END', 'outdoor', 'BT'),
('PIER C (1,2, &3 Below)', 'outdoor', 'BU'),
('PIER C 1&2', 'outdoor', 'BV'),
('PIER C NORTH 3', 'outdoor', 'BW'),
('PIG IRON DOCK', 'outdoor', 'BX'),
('PIER D WHS', 'outdoor', 'BY'),
('PIER D2', 'outdoor', 'BZ'),
('PIER E', 'outdoor', 'CA'),
('BULK PLANT', 'outdoor', 'CB'),
('BLAKEYLEY DOCK', 'outdoor', 'CC');

-- Insert sections for all warehouses
INSERT INTO warehouse_sections (warehouse_id, warehouse_name, section_number, status)
SELECT w.id, w.name, s.section_number, 'green'::text
FROM warehouses w
CROSS JOIN (SELECT generate_series(1, 4) as section_number) s; 