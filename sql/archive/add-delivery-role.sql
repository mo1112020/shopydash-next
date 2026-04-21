-- =====================================================
-- DELIVERY ROLE SETUP SQL SCRIPT
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. Add delivery_user_id to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS delivery_user_id UUID REFERENCES profiles(id);

-- 2. Add policies for delivery users
-- Delivery users can see orders assigned to them
CREATE POLICY "Delivery users can view assigned orders" ON orders
  FOR SELECT USING (auth.uid() = delivery_user_id);

-- Delivery users can update status of assigned orders
CREATE POLICY "Delivery users can update assigned orders" ON orders
  FOR UPDATE USING (auth.uid() = delivery_user_id);

-- Delivery users can view order items of assigned orders
CREATE POLICY "Delivery users can view assigned order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id 
      AND orders.delivery_user_id = auth.uid()
    )
  );

-- Helper query to promote a user to DELIVERY role
-- UPDATE profiles SET role = 'DELIVERY' WHERE email = 'YOUR_DRIVER_EMAIL';
