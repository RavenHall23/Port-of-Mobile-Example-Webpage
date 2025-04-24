-- First, check if the column exists and add it if it doesn't
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'warehouses' 
        AND column_name = 'last_modified'
    ) THEN
        ALTER TABLE warehouses
        ADD COLUMN last_modified TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
    END IF;
END $$;

-- Update any NULL values to use the current timestamp
UPDATE warehouses
SET last_modified = timezone('utc'::text, now())
WHERE last_modified IS NULL;

-- Recreate the trigger function
CREATE OR REPLACE FUNCTION update_warehouse_last_modified()
RETURNS TRIGGER AS $$
DECLARE
    warehouse_id UUID;
BEGIN
  -- For warehouse_sections table
  IF TG_TABLE_NAME = 'warehouse_sections' THEN
    -- Get the warehouse_id that was affected
    warehouse_id := CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.warehouse_id
      ELSE NEW.warehouse_id
    END;
    
    -- Update only the specific warehouse's last_modified timestamp
    UPDATE warehouses
    SET last_modified = timezone('utc'::text, now())
    WHERE id = warehouse_id;
    
    -- Log the update for debugging
    RAISE NOTICE 'Updating last_modified for warehouse_sections change. Operation: %, Warehouse ID: %', 
      TG_OP, warehouse_id;
      
  -- For warehouses table
  ELSIF TG_TABLE_NAME = 'warehouses' THEN
    -- For INSERT operations, last_modified is already set by the DEFAULT
    -- For UPDATE operations, update last_modified
    IF TG_OP = 'UPDATE' THEN
      NEW.last_modified := timezone('utc'::text, now());
      -- Log the update for debugging
      RAISE NOTICE 'Updating last_modified for warehouse update. Warehouse ID: %', NEW.id;
    END IF;
  END IF;
  
  RETURN CASE 
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_warehouse_last_modified ON warehouse_sections;
DROP TRIGGER IF EXISTS update_warehouse_self_last_modified ON warehouses;

-- Create trigger to update last_modified when warehouse_sections are modified
CREATE TRIGGER update_warehouse_last_modified
  AFTER INSERT OR UPDATE OR DELETE ON warehouse_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_warehouse_last_modified();

-- Create trigger to update last_modified when warehouse is modified
CREATE TRIGGER update_warehouse_self_last_modified
  BEFORE UPDATE ON warehouses
  FOR EACH ROW
  EXECUTE FUNCTION update_warehouse_last_modified();

-- Ensure all warehouses have a valid last_modified value
UPDATE warehouses
SET last_modified = COALESCE(last_modified, updated_at, created_at, timezone('utc'::text, now()))
WHERE last_modified IS NULL OR last_modified = '1970-01-01 00:00:00+00' OR last_modified = '0001-01-01 00:00:00+00'; 