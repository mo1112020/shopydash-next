SELECT schemaname, tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('orders', 'parent_orders', 'shops', 'order_items');
