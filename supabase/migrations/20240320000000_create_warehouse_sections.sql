-- Create warehouse_sections table
CREATE TABLE IF NOT EXISTS warehouse_sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  warehouse_letter TEXT NOT NULL REFERENCES warehouses(letter) ON DELETE CASCADE,
  section_number INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('green', 'red')),
  utilization INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(warehouse_letter, section_number)
);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_warehouse_sections_updated_at
  BEFORE UPDATE ON warehouse_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 