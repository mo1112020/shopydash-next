
-- =====================================================
-- FIX REALTIME ORDERS VISIBILITY FOR COURIERS
-- =====================================================

-- 1. Enable RLS (just in case)
ALTER TABLE parent_orders ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing restrictive policies to avoid conflicts
-- Drop ALL potential policies to ensure a clean slate
DROP POLICY IF EXISTS "parent_orders_select" ON parent_orders;
DROP POLICY IF EXISTS "parent_orders_insert" ON parent_orders;
DROP POLICY IF EXISTS "parent_orders_update" ON parent_orders;
DROP POLICY IF EXISTS "parent_orders_delete" ON parent_orders;
DROP POLICY IF EXISTS "Couriers can view available orders" ON parent_orders;
DROP POLICY IF EXISTS "Couriers can view assigned orders" ON parent_orders;
DROP POLICY IF EXISTS "Customers can view own parent orders" ON parent_orders;
DROP POLICY IF EXISTS "Admins can view all parent orders" ON parent_orders;
DROP POLICY IF EXISTS "Users can insert parent orders" ON parent_orders;
DROP POLICY IF EXISTS "Couriers can claim orders" ON parent_orders;
DROP POLICY IF EXISTS "Couriers can update assigned orders" ON parent_orders;
DROP POLICY IF EXISTS "Admins can update all parent orders" ON parent_orders;
DROP POLICY IF EXISTS "Admins can delete parent orders" ON parent_orders;

-- 3. Create Comprehensive Policies

-- A. SELECT Policies
-- Customers can see their own
CREATE POLICY "Customers can view own parent orders"
ON parent_orders FOR SELECT
USING (auth.uid() = user_id);

-- Couriers can see AVAILABLE orders (Ready & Unassigned)
CREATE POLICY "Couriers can view available orders"
ON parent_orders FOR SELECT
USING (
  status = 'READY_FOR_PICKUP' 
  AND delivery_user_id IS NULL
);

-- Couriers can see ASSIGNED orders
CREATE POLICY "Couriers can view assigned orders"
ON parent_orders FOR SELECT
USING (delivery_user_id = auth.uid());

-- Admins can see ALL
CREATE POLICY "Admins can view all parent orders"
ON parent_orders FOR SELECT
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);


-- B. INSERT Policies
-- Customers can create orders
CREATE POLICY "Users can insert parent orders"
ON parent_orders FOR INSERT
WITH CHECK (auth.uid() = user_id);


-- C. UPDATE Policies
-- Couriers can CLAIM orders (assign to self)
CREATE POLICY "Couriers can claim orders"
ON parent_orders FOR UPDATE
USING (status = 'READY_FOR_PICKUP' AND delivery_user_id IS NULL)
WITH CHECK (delivery_user_id = auth.uid());

-- Couriers can UPDATE status of assigned orders
CREATE POLICY "Couriers can update assigned orders"
ON parent_orders FOR UPDATE
USING (delivery_user_id = auth.uid())
WITH CHECK (delivery_user_id = auth.uid());

-- Admins can update ANYTHING
CREATE POLICY "Admins can update all parent orders"
ON parent_orders FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);

-- D. DELETE Policies
-- Admins only
CREATE POLICY "Admins can delete parent orders"
ON parent_orders FOR DELETE
USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')
);
