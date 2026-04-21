-- FIX: Run Trigger as SECURITY DEFINER to bypass RLS permissions

-- 1. Drop existing function/trigger to be safe
DROP TRIGGER IF EXISTS update_parent_status_trigger ON orders;
DROP FUNCTION IF EXISTS update_parent_order_status();

-- 2. Recreate Function with SECURITY DEFINER
-- This ensures the function runs with Admin privileges, not the Shop Owner's restricted access
CREATE OR REPLACE FUNCTION update_parent_order_status()
RETURNS TRIGGER 
SECURITY DEFINER 
SET search_path = public
AS $$
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

    -- LOGIC:
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
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Re-Attach Trigger
CREATE TRIGGER update_parent_status_trigger
AFTER UPDATE OF status ON orders
FOR EACH ROW
EXECUTE FUNCTION update_parent_order_status();

-- 4. Grant Execute (Just in case, though Public usually has it)
GRANT EXECUTE ON FUNCTION update_parent_order_status() TO authenticated;
GRANT EXECUTE ON FUNCTION update_parent_order_status() TO service_role;
