-- Add last_modified column to warehouses table
ALTER TABLE warehouses
ADD COLUMN last_modified TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Create function to update last_modified
CREATE OR REPLACE FUNCTION update_warehouse_last_modified()
RETURNS TRIGGER AS $$
BEGIN
  -- For warehouse_sections table
  IF TG_TABLE_NAME = 'warehouse_sections' THEN
    -- Update the warehouse's last_modified timestamp
    UPDATE warehouses
    SET last_modified = timezone('utc'::text, now())
    WHERE id = CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.warehouse_id
      ELSE NEW.warehouse_id
    END;
    
    -- Log the update for debugging
    RAISE NOTICE 'Updating last_modified for warehouse_sections change. Operation: %, Warehouse ID: %', 
      TG_OP,
      CASE 
        WHEN TG_OP = 'DELETE' THEN OLD.warehouse_id
        ELSE NEW.warehouse_id
      END;
      
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

-- Update initial last_modified values
UPDATE warehouses
SET last_modified = updated_at; 