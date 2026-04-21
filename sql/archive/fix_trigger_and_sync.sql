-- 1. DROP EXISTING TRIGGER AND FUNCTION
DROP TRIGGER IF EXISTS update_parent_status_trigger ON orders;
DROP FUNCTION IF EXISTS update_parent_order_status();

-- 2. RECREATE FUNCTION WITH ROBUST LOGIC
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

    -- LOGIC:
    -- 1. If ALL are DELIVERED -> DELIVERED
    -- 2. If ALL are CANCELLED -> CANCELLED
    -- 3. If ANY is OUT_FOR_DELIVERY -> OUT_FOR_DELIVERY (Bundle is on the move)
    -- 4. If ANY is READY_FOR_PICKUP -> READY_FOR_PICKUP (Courier can come)
    -- 5. If ANY is PREPARING -> PREPARING
    -- 6. Else -> PLACED

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
        -- No change or fallback
        NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. RECREATE TRIGGER
CREATE TRIGGER update_parent_status_trigger
AFTER UPDATE OF status ON orders
FOR EACH ROW
EXECUTE FUNCTION update_parent_order_status();

-- 4. MANUALLY FIX STUCK ORDERS (FORCE SYNC)
-- Find all parents that are PLACED/PREPARING/CONFIRMED but have a READY suborder
UPDATE parent_orders
SET status = 'READY_FOR_PICKUP'
WHERE id IN (
    SELECT DISTINCT po.id
    FROM parent_orders po
    JOIN orders o ON o.parent_order_id = po.id
    WHERE o.status = 'READY_FOR_PICKUP'
    AND po.status IN ('PLACED', 'CONFIRMED', 'PREPARING')
);

-- 5. RETURN FIXED ROWS TO CONFIRM
SELECT id, status FROM parent_orders WHERE status = 'READY_FOR_PICKUP' ORDER BY updated_at DESC LIMIT 5;
