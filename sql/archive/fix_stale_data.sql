-- Fix stale parent_order statuses
-- Run this in Supabase SQL Editor

-- 1. Update Parent Orders to READY_FOR_PICKUP if they have any ready sub-orders
UPDATE parent_orders po
SET status = 'READY_FOR_PICKUP'
WHERE po.id IN (
    SELECT o.parent_order_id 
    FROM orders o 
    WHERE o.status = 'READY_FOR_PICKUP'
)
AND po.status = 'PLACED' 
OR po.status = 'CONFIRMED'
OR po.status = 'PREPARING';

-- 2. Verify the update
SELECT id, order_number, status, delivery_user_id 
FROM parent_orders 
WHERE status = 'READY_FOR_PICKUP';
