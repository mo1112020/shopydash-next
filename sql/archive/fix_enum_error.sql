-- =====================================================
-- FIX ENUM ERROR
-- Run this in Supabase SQL Editor
-- =====================================================

-- The error "invalid input value for enum user_role" means you are using a Postgres ENUM.
-- We must explicitly add the new value to the ENUM definition.

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'DELIVERY';
