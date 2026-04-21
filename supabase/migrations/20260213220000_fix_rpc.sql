
-- Drop old function first to change signature
DROP FUNCTION IF EXISTS cancel_shop_order(UUID, TEXT, TEXT);

-- Create new function with UUID actor_id
CREATE OR REPLACE FUNCTION cancel_shop_order(
    p_order_id UUID,
    p_reason TEXT,
    p_actor_id UUID, -- Now expects User ID (UUID)
    p_status order_status -- 'CANCELLED_BY_SHOP' or 'CANCELLED_BY_ADMIN'
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order_status order_status;
    v_parent_id UUID;
    v_sibling_statuses order_status[];
    v_new_parent_status VARCHAR;
BEGIN
    -- Input Validation
    IF length(trim(p_reason)) = 0 OR p_reason IS NULL THEN
        RAISE EXCEPTION 'Cancellation reason is required';
    END IF;

    IF p_status NOT IN ('CANCELLED_BY_SHOP', 'CANCELLED_BY_ADMIN') THEN
         RAISE EXCEPTION 'Invalid cancellation status';
    END IF;

    -- Fetch current status and parent_id
    SELECT status, parent_order_id INTO v_order_status, v_parent_id
    FROM orders
    WHERE id = p_order_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Order not found');
    END IF;

    -- Strict Status Validation
    IF v_order_status IN ('OUT_FOR_DELIVERY', 'DELIVERED') THEN
        RAISE EXCEPTION 'Cannot cancel order in current status (%)', v_order_status;
    END IF;

    -- Check if already cancelled
    IF v_order_status::text LIKE 'CANCELLED%' THEN
        RAISE EXCEPTION 'Order is already cancelled';
    END IF;

    -- Atomic Update of Sub-Order
    UPDATE orders 
    SET status = p_status,
        cancellation_reason = p_reason,
        cancelled_by = p_actor_id, -- Store as UUID directly
        cancelled_at = NOW(),
        updated_at = NOW()
    WHERE id = p_order_id;

    -- Parent Sync Logic
    IF v_parent_id IS NOT NULL THEN
        -- Get all sibling statuses (including the one just updated)
        SELECT array_agg(status) INTO v_sibling_statuses
        FROM orders
        WHERE parent_order_id = v_parent_id;

        -- Determine New Parent Status
        IF (
            SELECT bool_and(
                s::text = 'CANCELLED' OR 
                s::text = 'CANCELLED_BY_SHOP' OR 
                s::text = 'CANCELLED_BY_ADMIN'
            )
            FROM unnest(v_sibling_statuses) s
        ) THEN
            v_new_parent_status := 'CANCELLED';
        ELSE
             v_new_parent_status := NULL; 
        END IF;

        IF v_new_parent_status IS NOT NULL THEN
            UPDATE parent_orders
            SET status = v_new_parent_status,
                updated_at = NOW()
            WHERE id = v_parent_id;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true, 
        'message', 'Order cancelled successfully',
        'status', p_status
    );
END;
$$ LANGUAGE plpgsql;

-- Grant access
GRANT EXECUTE ON FUNCTION cancel_shop_order(UUID, TEXT, UUID, order_status) TO authenticated;
