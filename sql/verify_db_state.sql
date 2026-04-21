-- Run this in Supabase SQL Editor to verify the state of your database
-- It will output 'True' or 'False' for various checks

SELECT 
  -- Check 1: Did the Enum get updated?
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'READY_FOR_PICKUP'
  ) THEN '✅ Enum READY_FOR_PICKUP exists' ELSE '❌ Enum READY_FOR_PICKUP MISSING' END as check_1_enum,

  -- Check 2: Is the trigger function updated?
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'validate_order_status_transition' 
    AND prosrc LIKE '%READY_FOR_PICKUP%'
  ) THEN '✅ Function code contains READY_FOR_PICKUP' ELSE '❌ Function code MISSING READY_FOR_PICKUP logic' END as check_2_function,

  -- Check 3: Is Parent Order RLS enabled?
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'parent_orders'
    AND c.relrowsecurity = true
  ) THEN '✅ Parent Order RLS Enabled' ELSE '❌ Parent Order RLS Disabled' END as check_3_rls;

-- If you see ❌, it means the previous SQL scripts did not run successfully.
