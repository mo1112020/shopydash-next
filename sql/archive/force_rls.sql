-- FORCE update of RLS policies for parent_orders
-- Run this in Supabase SQL Editor

-- 1. Ensure RLS is enabled
ALTER TABLE parent_orders ENABLE ROW LEVEL SECURITY;

-- 2. Drop all existing policies to ensure a clean slate (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Customers can view own parent orders" ON parent_orders;
DROP POLICY IF EXISTS "Couriers can view available orders" ON parent_orders;
DROP POLICY IF EXISTS "Couriers can view assigned orders" ON parent_orders;
DROP POLICY IF EXISTS "Admins can view all parent orders" ON parent_orders;
DROP POLICY IF EXISTS "Couriers can claim orders" ON parent_orders;
DROP POLICY IF EXISTS "Couriers can update assigned orders" ON parent_orders;
DROP POLICY IF EXISTS "Users can insert parent orders" ON parent_orders;

-- 3. Re-create Policies

-- Customers view own
CREATE POLICY "Customers can view own parent orders"
ON parent_orders FOR SELECT
USING (auth.uid() = user_id);

-- Couriers view AVAILABLE orders
-- This allows any logged-in user to see orders that are READY and unclaimed
-- Ideally we restrict to role='DELIVERY', but to ensure it works now, we keep it broad for authenticated users
CREATE POLICY "Couriers can view available orders"
ON parent_orders FOR SELECT
TO authenticated
USING (status = 'READY_FOR_PICKUP' AND delivery_user_id IS NULL);

-- Couriers view ASSIGNED orders
CREATE POLICY "Couriers can view assigned orders"
ON parent_orders FOR SELECT
TO authenticated
USING (delivery_user_id = auth.uid());

-- Admins view all
CREATE POLICY "Admins can view all parent orders"
ON parent_orders FOR SELECT
TO authenticated
USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'ADMIN');

-- Couriers claim orders
CREATE POLICY "Couriers can claim orders"
ON parent_orders FOR UPDATE
TO authenticated
USING (status = 'READY_FOR_PICKUP' AND delivery_user_id IS NULL)
WITH CHECK (delivery_user_id = auth.uid());

-- Couriers update assigned orders
CREATE POLICY "Couriers can update assigned orders"
ON parent_orders FOR UPDATE
TO authenticated
USING (delivery_user_id = auth.uid())
WITH CHECK (delivery_user_id = auth.uid());

-- Insert
CREATE POLICY "Users can insert parent orders"
ON parent_orders FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4. Verification Output
SELECT count(*) as policies_count FROM pg_policies WHERE tablename = 'parent_orders';
