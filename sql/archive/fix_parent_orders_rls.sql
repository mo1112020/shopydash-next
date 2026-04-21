-- =====================================================
-- ROW LEVEL SECURITY FOR PARENT ORDERS (FIXED)
-- =====================================================

-- 1. Enable RLS on parent_orders table
ALTER TABLE public.parent_orders ENABLE ROW LEVEL SECURITY;

-- 2. Users can view their own parent orders
CREATE POLICY "Users can view own parent orders"
  ON public.parent_orders
  FOR SELECT
  USING (user_id = auth.uid());

-- 3. Users can insert their own parent orders
CREATE POLICY "Users can create parent orders"
  ON public.parent_orders
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- 4. Admins can view and manage all parent orders
CREATE POLICY "Admins can manage all parent orders"
  ON public.parent_orders
  FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

-- 5. Delivery Users (Drivers) can view parent orders assigned to them
CREATE POLICY "Drivers can view assigned parent orders"
  ON public.parent_orders
  FOR SELECT
  USING (delivery_user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'DELIVERY'));

-- 6. Drivers can update their assigned parent orders
CREATE POLICY "Drivers can update assigned parent orders"
  ON public.parent_orders
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'DELIVERY'));

-- 7. Shop Owners can view parent orders if they have a sub-order in it
CREATE POLICY "Shop Owners can view related parent orders"
  ON public.parent_orders
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.parent_order_id = parent_orders.id 
      AND owns_shop(orders.shop_id)
    )
  );
