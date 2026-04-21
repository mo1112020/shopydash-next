-- Fix ambiguity in get_shop_30d_sales function
CREATE OR REPLACE FUNCTION get_shop_30d_sales()
RETURNS TABLE (shop_id uuid, sales_count bigint) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT o.shop_id, count(*) as sales_count
  FROM orders o
  WHERE o.status = 'DELIVERED'
  AND o.created_at > (now() - interval '30 days')
  GROUP BY o.shop_id;
END;
$$;
