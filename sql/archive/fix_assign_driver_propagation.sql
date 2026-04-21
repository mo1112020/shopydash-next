-- Function to atomically assign a driver to an order AND propagate to sub-orders
-- Fixing the issue where Shop Owners don't see the assignment in real-time because orders table wasn't touched.

CREATE OR REPLACE FUNCTION assign_driver_to_parent(
    p_parent_order_id UUID,
    p_driver_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_link_limit INTEGER;
    v_current_active INTEGER;
    v_order_status VARCHAR;
    v_updated_order RECORD;
BEGIN
    -- 1. Get the global limit
    SELECT max_active_orders INTO v_link_limit FROM delivery_settings WHERE id = TRUE;
    
    -- Default to 3 if not found
    IF v_link_limit IS NULL THEN
        v_link_limit := 3;
    END IF;

    -- 2. Count current active orders for this driver
    SELECT COUNT(*) INTO v_current_active
    FROM parent_orders
    WHERE delivery_user_id = p_driver_id
      AND status IN ('READY_FOR_PICKUP', 'OUT_FOR_DELIVERY');

    -- 3. Check limit
    IF v_current_active >= v_link_limit THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', 'عذراً، لقد وصلت للحد الأقصى من الطلبات النشطة (' || v_link_limit || '). يرجى توصيل الطلبات الحالية أولاً.'
        );
    END IF;

    -- 4. Check if order is available
    SELECT status INTO v_order_status
    FROM parent_orders
    WHERE id = p_parent_order_id;

    IF v_order_status != 'READY_FOR_PICKUP' THEN
         RETURN jsonb_build_object(
            'success', false,
            'message', 'هذا الطلب لم يعد متاحاً'
        );
    END IF;

    -- 5. Assign the order (Parent)
    UPDATE parent_orders
    SET 
        delivery_user_id = p_driver_id,
        updated_at = NOW()
    WHERE id = p_parent_order_id
    AND delivery_user_id IS NULL
    RETURNING * INTO v_updated_order;

    IF FOUND THEN
        -- 6. Propagate to Sub-Orders (Critical for Real-time updates)
        UPDATE orders
        SET 
            delivery_user_id = p_driver_id,
            updated_at = NOW()
        WHERE parent_order_id = p_parent_order_id;
        
        RETURN jsonb_build_object(
            'success', true,
            'message', 'تم استلام الطلب بنجاح',
            'order', row_to_json(v_updated_order)
        );
    ELSE
        RETURN jsonb_build_object(
            'success', false,
            'message', 'فشل تعيين الطلب، ربما تم استلامه من قبل مندوب آخر'
        );
    END IF;
END;
$$;
