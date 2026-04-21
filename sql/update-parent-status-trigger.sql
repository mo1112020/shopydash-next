-- Function to update parent order status based on suborders
CREATE OR REPLACE FUNCTION update_parent_order_status()
RETURNS TRIGGER AS $$
DECLARE
    p_id UUID;
    sibling_statuses TEXT[];
BEGIN
    p_id := NEW.parent_order_id;
    
    -- Only proceed if it is a suborder
    IF p_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get all sibling statuses
    SELECT array_agg(status) INTO sibling_statuses
    FROM orders
    WHERE parent_order_id = p_id;

    -- Determine new parent status
    IF 'DELIVERED' = ALL(sibling_statuses) THEN
        UPDATE parent_orders SET status = 'DELIVERED' WHERE id = p_id;
    ELSIF 'CANCELLED' = ALL(sibling_statuses) THEN
        UPDATE parent_orders SET status = 'CANCELLED' WHERE id = p_id;
    ELSIF 'OUT_FOR_DELIVERY' = ANY(sibling_statuses) THEN
        UPDATE parent_orders SET status = 'OUT_FOR_DELIVERY' WHERE id = p_id;
    ELSIF 'READY_FOR_PICKUP' = ANY(sibling_statuses) THEN
        UPDATE parent_orders SET status = 'READY_FOR_PICKUP' WHERE id = p_id;
    ELSIF 'PREPARING' = ANY(sibling_statuses) THEN
        UPDATE parent_orders SET status = 'PREPARING' WHERE id = p_id;
    ELSIF 'CONFIRMED' = ANY(sibling_statuses) THEN
        UPDATE parent_orders SET status = 'CONFIRMED' WHERE id = p_id;
    ELSE
        -- Default/Fallback
        UPDATE parent_orders SET status = 'PLACED' WHERE id = p_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists to avoid errors
DROP TRIGGER IF EXISTS update_parent_status_trigger ON orders;

-- Create trigger
CREATE TRIGGER update_parent_status_trigger
AFTER UPDATE OF status ON orders
FOR EACH ROW
EXECUTE FUNCTION update_parent_order_status();
