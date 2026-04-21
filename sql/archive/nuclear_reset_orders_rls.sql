-- =====================================================
-- NUCLEAR RESET: Fix all orders RLS from scratch
-- Run this entirely in Supabase SQL Editor
-- =====================================================

-- STEP 1: Drop ALL existing policies on ALL orders-related tables
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname, tablename
        FROM pg_policies
        WHERE tablename IN ('orders', 'parent_orders', 'order_items', 'order_status_history')
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- STEP 2: Disable RLS on child tables (no recursion, protected via parent)
ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history DISABLE ROW LEVEL SECURITY;

-- STEP 3: Enable RLS on the main tables
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parent_orders ENABLE ROW LEVEL SECURITY;

-- STEP 4: Simple, non-recursive policies for ORDERS table
-- (NO cross-table joins in any policy to avoid recursion)
CREATE POLICY "orders_own_select"
  ON public.orders FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "orders_shop_select"
  ON public.orders FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM shops WHERE shops.id = orders.shop_id AND shops.owner_id = auth.uid()
  ));

CREATE POLICY "orders_admin_all"
  ON public.orders FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "orders_delivery_select"
  ON public.orders FOR SELECT
  USING (delivery_user_id = auth.uid());

CREATE POLICY "orders_delivery_update"
  ON public.orders FOR UPDATE
  USING (delivery_user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM shops WHERE shops.id = orders.shop_id AND shops.owner_id = auth.uid()
  ));

CREATE POLICY "orders_own_insert"
  ON public.orders FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- STEP 5: Simple, non-recursive policies for PARENT_ORDERS table
CREATE POLICY "parent_orders_own_select"
  ON public.parent_orders FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "parent_orders_own_insert"
  ON public.parent_orders FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "parent_orders_admin_all"
  ON public.parent_orders FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Drivers: only column-based check (no profile join to avoid recursion)
CREATE POLICY "parent_orders_driver_select"
  ON public.parent_orders FOR SELECT
  USING (delivery_user_id = auth.uid());

CREATE POLICY "parent_orders_driver_update"
  ON public.parent_orders FOR UPDATE
  USING (delivery_user_id = auth.uid());

-- Shop owners: join only shops table (not orders) to avoid circular dependency
CREATE POLICY "parent_orders_shop_select"
  ON public.parent_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      JOIN shops sh ON sh.id = o.shop_id
      WHERE o.parent_order_id = parent_orders.id
      AND sh.owner_id = auth.uid()
    )
  );
