-- =====================================================
-- DATABASE VERIFICATION TESTS
-- Run these queries to verify the migration succeeded
-- =====================================================

-- Test 1: Check shops table has coordinate columns
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'shops' 
  AND column_name IN ('latitude', 'longitude')
ORDER BY column_name;
-- Expected: 2 rows with DECIMAL type, nullable = YES

-- Test 2: Check addresses table has coordinate columns
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'addresses' 
  AND column_name IN ('latitude', 'longitude')
ORDER BY column_name;
-- Expected: 2 rows with DECIMAL type, nullable = YES

-- Test 3: Verify parent_orders table exists
SELECT 
  table_name, 
  table_type
FROM information_schema.tables
WHERE table_name = 'parent_orders';
-- Expected: 1 row with table_type = BASE TABLE

-- Test 4: Check parent_orders columns
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'parent_orders'
ORDER BY ordinal_position;
-- Expected: ~25 columns including route_km, pickup_sequence, etc.

-- Test 5: Verify delivery_settings table exists with default row
SELECT * FROM delivery_settings;
-- Expected: 1 row with id=true, base_fee=20, km_rate=3, etc.

-- Test 6: Check orders table has new suborder columns
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'orders' 
  AND column_name IN ('parent_order_id', 'is_critical', 'pickup_sequence_index', 'cancelled_by', 'refund_amount')
ORDER BY column_name;
-- Expected: 5 rows

-- Test 7: Verify carts.shop_id is now nullable
SELECT 
  column_name, 
  is_nullable
FROM information_schema.columns
WHERE table_name = 'carts' 
  AND column_name = 'shop_id';
-- Expected: is_nullable = YES

-- Test 8: Check indexes created
SELECT 
  indexname, 
  tablename
FROM pg_indexes
WHERE tablename IN ('parent_orders', 'shops', 'addresses', 'orders')
  AND indexname LIKE '%coords%' OR indexname LIKE '%parent%'
ORDER BY tablename, indexname;
-- Expected: Multiple indexes including idx_shops_coords, idx_parent_orders_user, etc.

-- Test 9: Verify RLS policies on parent_orders
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'parent_orders'
ORDER BY policyname;
-- Expected: 3 policies (select, insert, update)

-- Test 10: Verify RLS policies on delivery_settings
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'delivery_settings'
ORDER BY policyname;
-- Expected: 2 policies (read, update)

-- =====================================================
-- SAMPLE DATA INSERTION TEST (Optional)
-- =====================================================

-- Test 11: Try updating a shop with coordinates (if you have shops)
/*
UPDATE shops 
SET latitude = 30.5234, longitude = 30.3456
WHERE id = (SELECT id FROM shops LIMIT 1)
RETURNING id, name, latitude, longitude;
*/

-- Test 12: Check delivery_settings is editable
/*
UPDATE delivery_settings
SET base_fee = 25.00
WHERE id = TRUE
RETURNING *;
*/

-- =====================================================
-- CLEANUP (Run if needed to reset values)
-- =====================================================

/*
UPDATE delivery_settings
SET base_fee = 20.00
WHERE id = TRUE;
*/
