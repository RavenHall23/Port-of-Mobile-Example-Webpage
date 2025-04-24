-- Add position columns to warehouse_sections table
ALTER TABLE warehouse_sections
ADD COLUMN position_x INTEGER DEFAULT 0,
ADD COLUMN position_y INTEGER DEFAULT 0;

-- Update the audit trigger to include position changes
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      old_value,
      new_value,
      changed_by,
      device_type,
      device_id,
      ip_address
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'INSERT',
      NULL,
      CASE 
        WHEN TG_TABLE_NAME = 'warehouses' THEN NEW.type
        WHEN TG_TABLE_NAME = 'warehouse_sections' THEN NEW.status
      END,
      current_user,
      current_setting('request.headers')::json->>'x-device-type',
      current_setting('request.headers')::json->>'x-device-id',
      current_setting('request.headers')::json->>'x-forwarded-for'
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF TG_TABLE_NAME = 'warehouse_sections' AND (
      OLD.status != NEW.status OR
      OLD.position_x != NEW.position_x OR
      OLD.position_y != NEW.position_y
    ) THEN
      INSERT INTO audit_logs (
        table_name,
        record_id,
        action,
        old_value,
        new_value,
        changed_by,
        device_type,
        device_id,
        ip_address
      ) VALUES (
        TG_TABLE_NAME,
        NEW.id,
        'UPDATE',
        CASE 
          WHEN OLD.status != NEW.status THEN OLD.status
          ELSE CONCAT(OLD.position_x, ',', OLD.position_y)
        END,
        CASE 
          WHEN OLD.status != NEW.status THEN NEW.status
          ELSE CONCAT(NEW.position_x, ',', NEW.position_y)
        END,
        current_user,
        current_setting('request.headers')::json->>'x-device-type',
        current_setting('request.headers')::json->>'x-device-id',
        current_setting('request.headers')::json->>'x-forwarded-for'
      );
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      table_name,
      record_id,
      action,
      old_value,
      new_value,
      changed_by,
      device_type,
      device_id,
      ip_address
    ) VALUES (
      TG_TABLE_NAME,
      OLD.id,
      'DELETE',
      CASE 
        WHEN TG_TABLE_NAME = 'warehouses' THEN OLD.type
        WHEN TG_TABLE_NAME = 'warehouse_sections' THEN OLD.status
      END,
      NULL,
      current_user,
      current_setting('request.headers')::json->>'x-device-type',
      current_setting('request.headers')::json->>'x-device-id',
      current_setting('request.headers')::json->>'x-forwarded-for'
    );
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql; 