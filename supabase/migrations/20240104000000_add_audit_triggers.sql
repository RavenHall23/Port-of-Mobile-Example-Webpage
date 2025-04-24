-- Create function to handle audit logging
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
DECLARE
    v_device_id TEXT;
    v_device_type TEXT;
    v_ip_address TEXT;
BEGIN
    -- Get the current user's device info from the request headers
    v_device_id := current_setting('request.headers', true)::json->>'x-device-id';
    v_device_type := current_setting('request.headers', true)::json->>'x-device-type';
    v_ip_address := current_setting('request.headers', true)::json->>'x-forwarded-for';

    -- If device info is not available, use defaults
    v_device_id := COALESCE(v_device_id, 'unknown');
    v_device_type := COALESCE(v_device_type, 'unknown');
    v_ip_address := COALESCE(v_ip_address, '127.0.0.1');

    -- For warehouse changes
    IF TG_TABLE_NAME = 'warehouses' THEN
        IF TG_OP = 'INSERT' THEN
            INSERT INTO audit_logs (
                device_id,
                device_type,
                ip_address,
                action,
                warehouse_name,
                new_value
            ) VALUES (
                v_device_id,
                v_device_type,
                v_ip_address,
                'create',
                NEW.name,
                NEW.type
            );
        ELSIF TG_OP = 'UPDATE' THEN
            INSERT INTO audit_logs (
                device_id,
                device_type,
                ip_address,
                action,
                warehouse_name,
                old_value,
                new_value
            ) VALUES (
                v_device_id,
                v_device_type,
                v_ip_address,
                'update',
                NEW.name,
                OLD.type,
                NEW.type
            );
        ELSIF TG_OP = 'DELETE' THEN
            INSERT INTO audit_logs (
                device_id,
                device_type,
                ip_address,
                action,
                warehouse_name,
                old_value
            ) VALUES (
                v_device_id,
                v_device_type,
                v_ip_address,
                'delete',
                OLD.name,
                OLD.type
            );
        END IF;
    -- For warehouse section changes
    ELSIF TG_TABLE_NAME = 'warehouse_sections' THEN
        IF TG_OP = 'INSERT' THEN
            INSERT INTO audit_logs (
                device_id,
                device_type,
                ip_address,
                action,
                warehouse_name,
                section_letter,
                new_value
            ) VALUES (
                v_device_id,
                v_device_type,
                v_ip_address,
                'create',
                NEW.warehouse_name,
                (SELECT letter FROM warehouses WHERE id = NEW.warehouse_id) || NEW.section_number::text,
                NEW.status
            );
        ELSIF TG_OP = 'UPDATE' THEN
            INSERT INTO audit_logs (
                device_id,
                device_type,
                ip_address,
                action,
                warehouse_name,
                section_letter,
                old_value,
                new_value
            ) VALUES (
                v_device_id,
                v_device_type,
                v_ip_address,
                'update',
                NEW.warehouse_name,
                (SELECT letter FROM warehouses WHERE id = NEW.warehouse_id) || NEW.section_number::text,
                OLD.status,
                NEW.status
            );
            INSERT INTO audit_logs (
                device_id,
                device_type,
                ip_address,
                action,
                warehouse_name,
                section_letter,
                old_value
            ) VALUES (
                v_device_id,
                v_device_type,
                v_ip_address,
                'delete',
                OLD.warehouse_name,
                (SELECT letter FROM warehouses WHERE id = OLD.warehouse_id) || OLD.section_number::text,
                OLD.status
            );
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for warehouses
DROP TRIGGER IF EXISTS audit_warehouses ON warehouses;
CREATE TRIGGER audit_warehouses
    AFTER INSERT OR UPDATE OR DELETE ON warehouses
    FOR EACH ROW
    EXECUTE FUNCTION log_audit();

-- Create triggers for warehouse_sections
DROP TRIGGER IF EXISTS audit_warehouse_sections ON warehouse_sections;
CREATE TRIGGER audit_warehouse_sections
    AFTER INSERT OR UPDATE OR DELETE ON warehouse_sections
    FOR EACH ROW
    EXECUTE FUNCTION log_audit(); 