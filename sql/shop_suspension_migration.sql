-- Add suspension columns to shops table
ALTER TABLE public.shops
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS disabled_reason TEXT,
ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS disabled_by UUID;

-- Create index for performance on orders
CREATE INDEX IF NOT EXISTS idx_orders_shop_status ON public.orders(shop_id, status);

-- RPC for Shop Analytics (Server-side aggregation)
-- Returns daily revenue and order count for a specific shop
CREATE OR REPLACE FUNCTION get_shop_analytics(
  p_shop_id UUID,
  p_start_date TIMESTAMP,
  p_end_date TIMESTAMP
)
RETURNS TABLE (
  date DATE,
  revenue NUMERIC,
  orders_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(o.created_at) as date,
    -- Revenue = Sum of (total - delivery_fee) for DELIVERED orders
    -- Note: Ideally use items total, but if total includes delivery fee, we subtract it.
    -- However, in multi-store checkout, suborders might just have total (without delivery fee if fee is on parent).
    -- We assume suborder 'total' is correct shop revenue.
    COALESCE(SUM(o.total), 0) as revenue,
    COUNT(o.id) as orders_count
  FROM orders o
  WHERE
    o.shop_id = p_shop_id
    AND o.status = 'DELIVERED'
    AND o.created_at >= p_start_date
    AND o.created_at <= p_end_date
  GROUP BY DATE(o.created_at)
  ORDER BY DATE(o.created_at);
END;
$$;

-- RLS Policy: Prevent Update on Shops if Suspended (Owner cannot edit shop profile)
-- Only Admin can update suspended shops (to re-enable them)
-- We need to check if auth.uid() is admin or owner.
-- Existing policies usually handle owner check. We append status check.
-- Actually, enforcing "No Action" is better done on specific tables (Products/Orders).

-- Enforce: Cannot Add/Edit Products if Shop is Suspended
CREATE POLICY "Block product changes if shop suspended"
ON public.products
FOR ALL
USING (
  (SELECT is_active FROM public.shops WHERE id = products.shop_id) = true
  OR 
  (auth.jwt() ->> 'role' = 'service_role') -- Allow admins/service role
);

-- Note: Existing policies might be permissive. We should ensure this restriction applies.
-- A better way for simple enforcement is a Trigger, because RLS policies are permissive (OR logic).
-- If there is ANY policy that allows it, it passes. So adding a restrictive policy might not work if others exist.
-- Triggers are safer for strict enforcement.

CREATE OR REPLACE FUNCTION check_shop_active()
RETURNS TRIGGER AS $$
DECLARE
  shop_active BOOLEAN;
BEGIN
  SELECT is_active INTO shop_active FROM public.shops WHERE id = NEW.shop_id;
  
  IF shop_active = FALSE THEN
    RAISE EXCEPTION 'Shop is suspended. Action not allowed.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for Products (Insert/Update)
DROP TRIGGER IF EXISTS check_shop_active_products ON public.products;
CREATE TRIGGER check_shop_active_products
BEFORE INSERT OR UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION check_shop_active();

-- Trigger for Orders (Insert/Update - prevent shop from confirming orders)
-- For Insert (Customer placing order) -> Block if shop suspended
DROP TRIGGER IF EXISTS check_shop_active_orders ON public.orders;
CREATE TRIGGER check_shop_active_orders
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION check_shop_active();

-- NOTE: Update logic for orders needs to allow 'DELIVERED' status update by Courier!
-- The trigger above blocks ALL updates. We need to refine it.
-- Allow if role is ADMIN or DELIVERY. Block if role is SHOP_OWNER.
-- But triggers don't always know auth role easily without headers.
-- Let's stick to simple "Block creation" for now. Updates might be tricky if we block everything.
-- Refined Trigger for Orders:
CREATE OR REPLACE FUNCTION check_shop_active_for_orders()
RETURNS TRIGGER AS $$
DECLARE
  shop_active BOOLEAN;
BEGIN
  -- Check shop status
  SELECT is_active INTO shop_active FROM public.shops WHERE id = NEW.shop_id;
  
  -- If shop is suspended
  IF shop_active = FALSE THEN
     -- Allow status updates to 'DELIVERED' or 'CANCELLED' (to clear queue)
     -- But block 'CONFIRMED' or 'PREPARING' (Shop actions)
     IF (TG_OP = 'UPDATE' AND (NEW.status = 'CONFIRMED' OR NEW.status = 'PREPARING')) THEN
         RAISE EXCEPTION 'Shop is suspended. Cannot process orders.';
     END IF;
     
     -- Block New Orders entirely
     IF (TG_OP = 'INSERT') THEN
         RAISE EXCEPTION 'Shop is suspended. Cannot place new orders.';
     END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_shop_active_orders ON public.orders;
CREATE TRIGGER check_shop_active_orders
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION check_shop_active_for_orders();
