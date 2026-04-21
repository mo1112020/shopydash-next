-- =====================================================
-- DIAGNOSTIC: Run this first to see all current policies
-- on orders-related tables in YOUR live database
-- =====================================================

SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('orders', 'parent_orders', 'order_items', 'order_status_history')
ORDER BY tablename, policyname;

-- Also check which tables have RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('orders', 'parent_orders', 'order_items', 'order_status_history');
