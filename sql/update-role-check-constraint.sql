-- =====================================================
-- FIX PROFILE ROLE CONSTRAINT
-- Run this in Supabase SQL Editor to allow 'DELIVERY' role
-- =====================================================

-- 1. Drop the existing check constraint (name usually varies, so we try multiple common approaches or just logical update)
-- Since we can't easily know the exact name without inspecting, we will try to drop common names. 
-- But a safer way is to just alter the column type if it WAS an enum, or drop the constraint if found.

-- Assuming 'profiles_role_check' is the constraint name:
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Add the updated constraint including 'DELIVERY'
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('CUSTOMER', 'SHOP_OWNER', 'ADMIN', 'DELIVERY'));

-- 3. Just in case it's a DOMAIN or TYPE (if you used CREATE TYPE user_role AS ENUM...)
-- Uncomment the following line if you initially used an ENUM type in Postgres:
-- ALTER TYPE "user_role" ADD VALUE IF NOT EXISTS 'DELIVERY';
