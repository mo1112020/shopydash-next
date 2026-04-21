-- DIAGNOSTIC: Check recent orders and their sync status
-- Run this in Supabase SQL Editor

SELECT 
    po.id as parent_id,
    po.status as parent_status,
    po.delivery_user_id as parent_driver,
    o.id as sub_id,
    o.order_number,
    o.status as sub_status,
    s.name as shop_name
FROM parent_orders po
JOIN orders o ON o.parent_order_id = po.id
JOIN shops s ON o.shop_id = s.id
ORDER BY po.created_at DESC
LIMIT 10;
