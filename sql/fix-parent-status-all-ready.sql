-- ===============================================================
-- FIX: Parent order should only become READY_FOR_PICKUP 
--      when ALL active (non-cancelled) suborders are ready.
--
-- PROBLEM: Previously, the parent order became READY_FOR_PICKUP
-- when ANY single suborder was ready. This caused couriers to see
-- the order before all shops had finished preparing.
--
-- SOLUTION: Change the status logic so READY_FOR_PICKUP only
-- triggers when every non-cancelled suborder is at READY_FOR_PICKUP
-- or a later stage (OUT_FOR_DELIVERY, DELIVERED).
--
-- This script updates BOTH:
--   1. The RPC function `update_shop_order_status` (called by shops)
--   2. The trigger function `update_parent_order_status` (backup sync)
-- ===============================================================

-- ─────────────────────────────────────────────────────
-- 1. Fix the RPC Function (called by shop owners)
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_shop_order_status(
    p_order_id UUID,
    p_status TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_parent_id UUID;
    v_all_statuses TEXT[];
    v_active_statuses TEXT[];
    v_new_parent_status TEXT;
BEGIN
    -- 1. Update the Sub-Order status
    UPDATE orders 
    SET status = p_status::order_status, 
        updated_at = NOW()
    WHERE id = p_order_id
    RETURNING parent_order_id INTO v_parent_id;

    -- If the order was not found at all
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Order not found');
    END IF;

    -- If it's a standalone order (no parent), just return success
    IF v_parent_id IS NULL THEN
        RETURN jsonb_build_object('success', true, 'message', 'Standalone order updated');
    END IF;

    -- 2. Get ALL sibling statuses
    SELECT array_agg(status::text) INTO v_all_statuses
    FROM orders
    WHERE parent_order_id = v_parent_id;

    IF v_all_statuses IS NULL THEN
        RETURN jsonb_build_object('success', true, 'parent_id', v_parent_id);
    END IF;

    -- 3. Get ACTIVE (non-cancelled) sibling statuses
    SELECT array_agg(status::text) INTO v_active_statuses
    FROM orders
    WHERE parent_order_id = v_parent_id
      AND status::text NOT IN ('CANCELLED', 'CANCELLED_BY_SHOP', 'CANCELLED_BY_ADMIN');

    -- 4. Calculate new parent status

    -- All suborders are cancelled
    IF v_active_statuses IS NULL OR array_length(v_active_statuses, 1) IS NULL THEN
        v_new_parent_status := 'CANCELLED';

    -- All active suborders are delivered
    ELSIF 'DELIVERED' = ALL(v_active_statuses) THEN
        v_new_parent_status := 'DELIVERED';

    -- Driver is actively delivering (at least one is OUT_FOR_DELIVERY)
    ELSIF 'OUT_FOR_DELIVERY' = ANY(v_active_statuses) THEN
        v_new_parent_status := 'OUT_FOR_DELIVERY';

    -- ★ KEY FIX: ALL active suborders must be READY_FOR_PICKUP or later
    -- Before: ANY suborder being ready would trigger this
    -- Now: ALL active suborders must be at READY_FOR_PICKUP, OUT_FOR_DELIVERY, or DELIVERED
    ELSIF NOT EXISTS (
        SELECT 1 FROM unnest(v_active_statuses) AS s
        WHERE s NOT IN ('READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED')
    ) THEN
        v_new_parent_status := 'READY_FOR_PICKUP';

    -- Some suborders are still being processed
    ELSIF 'PREPARING' = ANY(v_active_statuses) 
       OR 'CONFIRMED' = ANY(v_active_statuses) THEN
        v_new_parent_status := 'PROCESSING';

    -- Fallback
    ELSE
        v_new_parent_status := 'PLACED';
    END IF;

    -- 5. Update Parent Order
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

GRANT EXECUTE ON FUNCTION update_shop_order_status(UUID, TEXT) TO authenticated;


-- ─────────────────────────────────────────────────────
-- 2. Fix the Trigger Function (backup sync mechanism)
-- ─────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_parent_order_status()
RETURNS TRIGGER AS $$
DECLARE
    p_id UUID;
    v_active_statuses TEXT[];
    new_parent_status TEXT;
BEGIN
    p_id := NEW.parent_order_id;
    
    IF p_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Get ACTIVE (non-cancelled) sibling statuses
    SELECT array_agg(status::text) INTO v_active_statuses
    FROM orders
    WHERE parent_order_id = p_id
      AND status::text NOT IN ('CANCELLED', 'CANCELLED_BY_SHOP', 'CANCELLED_BY_ADMIN');

    -- All cancelled
    IF v_active_statuses IS NULL OR array_length(v_active_statuses, 1) IS NULL THEN
        new_parent_status := 'CANCELLED';

    -- All delivered
    ELSIF 'DELIVERED' = ALL(v_active_statuses) THEN
        new_parent_status := 'DELIVERED';

    -- Driver delivering
    ELSIF 'OUT_FOR_DELIVERY' = ANY(v_active_statuses) THEN
        new_parent_status := 'OUT_FOR_DELIVERY';

    -- ★ KEY FIX: ALL active suborders must be ready
    ELSIF NOT EXISTS (
        SELECT 1 FROM unnest(v_active_statuses) AS s
        WHERE s NOT IN ('READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'DELIVERED')
    ) THEN
        new_parent_status := 'READY_FOR_PICKUP';

    -- Still processing
    ELSIF 'PREPARING' = ANY(v_active_statuses) 
       OR 'CONFIRMED' = ANY(v_active_statuses) THEN
        new_parent_status := 'PROCESSING';

    ELSE
        new_parent_status := 'PLACED';
    END IF;

    UPDATE parent_orders 
    SET status = new_parent_status, updated_at = NOW() 
    WHERE id = p_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers already exist, no need to recreate them
-- (They point to the same function name which we just updated)


-- ─────────────────────────────────────────────────────
-- VERIFICATION: Run this after to confirm
-- ─────────────────────────────────────────────────────
SELECT 'Functions updated' AS status, proname AS name
FROM pg_proc 
WHERE proname IN ('update_shop_order_status', 'update_parent_order_status');
