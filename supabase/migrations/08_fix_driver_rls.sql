-- FUNCTION: update_driver_order_status
-- Purpose: Allows assigned drivers to update the parent order status and cascade it to active suborders.
-- Runs with Admin privileges to bypass RLS on the `orders` table.

CREATE OR REPLACE FUNCTION update_driver_order_status(
    p_parent_id UUID,
    p_status TEXT,
    p_driver_id UUID
)
RETURNS JSONB
SECURITY DEFINER -- Runs with Admin privileges
SET search_path = public
AS $$
DECLARE
    v_actual_driver_id UUID;
    v_current_parent_status TEXT;
BEGIN
    -- 1. Verify Driver owns this order
    SELECT delivery_user_id, status INTO v_actual_driver_id, v_current_parent_status
    FROM parent_orders
    WHERE id = p_parent_id;

    IF v_actual_driver_id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'message', 'Order not found or no driver assigned');
    END IF;

    IF v_actual_driver_id != p_driver_id THEN
        RETURN jsonb_build_object('success', false, 'message', 'Unauthorized: You are not assigned to this order');
    END IF;

    -- 2. Update Parent Order
    UPDATE parent_orders
    SET status = p_status,
        updated_at = NOW()
    WHERE id = p_parent_id;

    -- 3. Cascade to Sub-Orders (exclude cancelled orders)
    IF p_status IN ('OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'CANCELLED_BY_SHOP', 'CANCELLED_BY_ADMIN') THEN
        UPDATE orders
        SET status = p_status::order_status,
            updated_at = NOW()
        WHERE parent_order_id = p_parent_id
          AND status::text NOT IN ('CANCELLED', 'CANCELLED_BY_SHOP', 'CANCELLED_BY_ADMIN');
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Status updated successfully');
END;
$$ LANGUAGE plpgsql;

-- Grant access to authenticated users (Delivery Drivers)
GRANT EXECUTE ON FUNCTION update_driver_order_status(UUID, TEXT, UUID) TO authenticated;
