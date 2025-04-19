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

-- Create warehouse_sections table
CREATE TABLE warehouse_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  warehouse_name TEXT NOT NULL,
  section_number INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('green', 'red')),
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
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
('Main Indoor Storage', 'indoor', 'A'),
('Secondary Indoor Storage', 'indoor', 'B'),
('Tertiary Indoor Storage', 'indoor', 'C'),
('Quaternary Indoor Storage', 'indoor', 'D'),
('Main Outdoor Storage', 'outdoor', 'E'),
('Secondary Outdoor Storage', 'outdoor', 'F'),
('Tertiary Outdoor Storage', 'outdoor', 'G'),
('Quaternary Outdoor Storage', 'outdoor', 'H');

-- Create initial sections for each warehouse with positions
DO $$
DECLARE
  w RECORD;
  section_num INTEGER;
  pos_x INTEGER;
  pos_y INTEGER;
BEGIN
  FOR w IN SELECT * FROM warehouses LOOP
    FOR section_num IN 1..4 LOOP
      -- Calculate position based on section number
      pos_x := (section_num - 1) % 2;
      pos_y := (section_num - 1) / 2;
      
      INSERT INTO warehouse_sections (warehouse_id, warehouse_name, section_number, status, position_x, position_y)
      VALUES (w.id, w.name, section_num, 'green', pos_x, pos_y);
    END LOOP;
  END LOOP;
END $$; 