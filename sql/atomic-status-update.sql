-- FUNCTION: update_shop_order_status
-- Purpose: Updates a sub-order status AND immediately synchronizes the parent order status.
-- This replaces the reliance on triggers which can fail due to RLS.

CREATE OR REPLACE FUNCTION update_shop_order_status(
    p_order_id UUID,
    p_status TEXT
)
RETURNS JSONB
SECURITY DEFINER -- Runs with Admin privileges
SET search_path = public
AS $$
DECLARE
    v_parent_id UUID;
    v_sibling_statuses TEXT[];
    v_new_parent_status TEXT;
BEGIN
    -- 1. Update the Sub-Order
    UPDATE orders 
    SET status = p_status::order_status, 
        updated_at = NOW()
    WHERE id = p_order_id
    RETURNING parent_order_id INTO v_parent_id;

    IF v_parent_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Order not found');
    END IF;

    -- 2. Calculate New Parent Status based on ALL siblings
    SELECT array_agg(status) INTO v_sibling_statuses
    FROM orders
    WHERE parent_order_id = v_parent_id;

    IF 'DELIVERED' = ALL(v_sibling_statuses) THEN
        v_new_parent_status := 'DELIVERED';
    ELSIF 'CANCELLED' = ALL(v_sibling_statuses) THEN
        v_new_parent_status := 'CANCELLED';
    ELSIF 'OUT_FOR_DELIVERY' = ANY(v_sibling_statuses) THEN
        v_new_parent_status := 'OUT_FOR_DELIVERY';
    ELSIF 'READY_FOR_PICKUP' = ANY(v_sibling_statuses) THEN
        v_new_parent_status := 'READY_FOR_PICKUP';
    ELSIF 'PREPARING' = ANY(v_sibling_statuses) THEN
        v_new_parent_status := 'PROCESSING'; -- Map to valid Parent Status
    ELSIF 'CONFIRMED' = ANY(v_sibling_statuses) THEN
        v_new_parent_status := 'PROCESSING'; -- Map to valid Parent Status
    ELSE
        -- Fallback
        v_new_parent_status := 'PLACED';
    END IF;

    -- 3. Update Parent Order (No cast needed, it is VARCHAR)
    UPDATE parent_orders
    SET status = v_new_parent_status,
        updated_at = NOW()
    WHERE id = v_parent_id;

    RETURN jsonb_build_object(
        'success', true, 
        'parent_id', v_parent_id, 
        'new_parent_status', v_new_parent_status
    );
END;
$$ LANGUAGE plpgsql;

-- Grant access to authenticated users (Shop Owners)
GRANT EXECUTE ON FUNCTION update_shop_order_status(UUID, TEXT) TO authenticated;
