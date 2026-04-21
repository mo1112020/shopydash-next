-- Function to get shop sales count for the last 30 days (DELIVERED only)
CREATE OR REPLACE FUNCTION get_shop_30d_sales()
RETURNS TABLE (shop_id uuid, sales_count bigint) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT shop_id, count(*) as sales_count
  FROM orders
  WHERE status = 'DELIVERED'
  AND created_at > (now() - interval '30 days')
  GROUP BY shop_id;
END;
$$;
