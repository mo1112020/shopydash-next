-- Function to atomically assign a driver to an order
-- Ensures race conditions are prevented and status is updated correctly.
CREATE OR REPLACE FUNCTION assign_driver_to_order(
    p_order_id UUID,
    p_driver_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_updated_order RECORD;
BEGIN
    -- Perform the update only if the order is still available
    UPDATE parent_orders
    SET 
        delivery_user_id = p_driver_id,
        status = 'OUT_FOR_DELIVERY', -- Immediate status transition as per plan
        updated_at = NOW()
    WHERE 
        id = p_order_id 
        AND delivery_user_id IS NULL 
        AND status = 'READY_FOR_PICKUP'
    RETURNING * INTO v_updated_order;

    -- Return result
    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Order assigned successfully',
            'order', row_to_json(v_updated_order)
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'message', 'Order is no longer available or already assigned'
        );
    END IF;
END;
$$ LANGUAGE plpgsql;
