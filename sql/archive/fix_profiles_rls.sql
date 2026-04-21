-- =====================================================
-- FIX PROFILES ORDER RLS
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Ensure ADMINs can update ANY profile
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;

CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'ADMIN'
    )
  );

-- 2. Ensure Users can update their OWN profile (for Account Page)
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (
    auth.uid() = id
  );

-- 3. Ensure Delivery users can VIEW all orders assigned to them (and shop/customer data)
-- (Already handled by previous script, but good to double check)
