-- =====================================================
-- FIX: 500 ERROR ON ORDERS QUERIES
-- The order_items and order_status_history policies were
-- causing infinite recursion. This rewrites them safely
-- using SECURITY DEFINER helper functions.
-- =====================================================

-- 1. Create a SECURITY DEFINER helper to check order ownership
-- This breaks the recursive RLS lookup
CREATE OR REPLACE FUNCTION is_my_order(p_order_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM orders WHERE id = p_order_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 2. Create a SECURITY DEFINER helper to check parent order ownership
CREATE OR REPLACE FUNCTION is_my_parent_order(p_parent_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM parent_orders WHERE id = p_parent_id AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 3. FIX order_items policies (drop old, recreate clean)
-- =====================================================
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
DROP POLICY IF EXISTS "Shop owners can view shop order items" ON order_items;
DROP POLICY IF EXISTS "Admins can view all order items" ON order_items;
DROP POLICY IF EXISTS "Users can create order items" ON order_items;

CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  USING (is_my_order(order_id));

CREATE POLICY "Shop owners can view shop order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND owns_shop(orders.shop_id)
    )
  );

CREATE POLICY "Admins can view all order items"
  ON order_items FOR SELECT
  USING (is_admin());

CREATE POLICY "Users can create order items"
  ON order_items FOR INSERT
  WITH CHECK (is_my_order(order_id));

-- =====================================================
-- 4. FIX order_status_history policies
-- =====================================================
DROP POLICY IF EXISTS "Users can view own order history" ON order_status_history;
DROP POLICY IF EXISTS "Shop owners can view shop order history" ON order_status_history;
DROP POLICY IF EXISTS "Admins can view all order history" ON order_status_history;
DROP POLICY IF EXISTS "System can insert order history" ON order_status_history;

CREATE POLICY "Users can view own order history"
  ON order_status_history FOR SELECT
  USING (is_my_order(order_id));

CREATE POLICY "Shop owners can view shop order history"
  ON order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_status_history.order_id
      AND owns_shop(orders.shop_id)
    )
  );

CREATE POLICY "Admins can view all order history"
  ON order_status_history FOR SELECT
  USING (is_admin());

CREATE POLICY "System can insert order history"
  ON order_status_history FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- 5. FIX parent_orders RLS (drop any duplicates first)
-- =====================================================
DROP POLICY IF EXISTS "Users can view own parent orders" ON parent_orders;
DROP POLICY IF EXISTS "Users can create parent orders" ON parent_orders;
DROP POLICY IF EXISTS "Admins can manage all parent orders" ON parent_orders;
DROP POLICY IF EXISTS "Drivers can view assigned parent orders" ON parent_orders;
DROP POLICY IF EXISTS "Drivers can update assigned parent orders" ON parent_orders;
DROP POLICY IF EXISTS "Shop Owners can view related parent orders" ON parent_orders;

ALTER TABLE public.parent_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own parent orders"
  ON public.parent_orders FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create parent orders"
  ON public.parent_orders FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all parent orders"
  ON public.parent_orders FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Drivers can view assigned parent orders"
  ON public.parent_orders FOR SELECT
  USING (
    delivery_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'DELIVERY')
  );

CREATE POLICY "Drivers can update assigned parent orders"
  ON public.parent_orders FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'DELIVERY'));

CREATE POLICY "Shop Owners can view related parent orders"
  ON public.parent_orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.parent_order_id = parent_orders.id
      AND owns_shop(orders.shop_id)
    )
  );
