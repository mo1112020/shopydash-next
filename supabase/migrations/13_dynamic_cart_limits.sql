-- =====================================================
-- 13_DYNAMIC_CART_LIMITS.SQL
-- Expose the max_shops_per_order setting for the frontend cart validation
-- =====================================================

CREATE OR REPLACE FUNCTION get_max_shops_per_order()
RETURNS INT
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_limit INT;
BEGIN
    SELECT COALESCE(max_shops_per_order, 0) INTO v_limit FROM delivery_settings WHERE id = true;
    RETURN v_limit;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION public.get_max_shops_per_order TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_max_shops_per_order TO anon;

-- Add a default value on creation if it doesn't exist
ALTER TABLE delivery_settings ALTER COLUMN max_shops_per_order SET DEFAULT 0;

-- Refresh PostgREST API Schema Cache
NOTIFY pgrst, 'reload schema';
