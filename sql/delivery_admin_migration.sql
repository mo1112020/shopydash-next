-- Add missing columns to parent_orders if they don't exist
ALTER TABLE public.parent_orders
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_parent_orders_delivery_user_id_status ON public.parent_orders(delivery_user_id, status);
CREATE INDEX IF NOT EXISTS idx_parent_orders_delivered_at ON public.parent_orders(delivered_at);
CREATE INDEX IF NOT EXISTS idx_parent_orders_status_created_at ON public.parent_orders(status, created_at);

-- RPC: Get Courier Analytics (Daily breakdown for charts)
CREATE OR REPLACE FUNCTION get_courier_analytics(
  p_courier_id UUID,
  p_start_date TIMESTAMP,
  p_end_date TIMESTAMP
)
RETURNS TABLE (
  date DATE,
  earnings NUMERIC,
  delivered_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(po.delivered_at) as date,
    COALESCE(SUM(po.total_delivery_fee), 0) as earnings,
    COUNT(po.id) as delivered_count
  FROM parent_orders po
  WHERE
    po.delivery_user_id = p_courier_id
    AND po.status = 'DELIVERED'
    AND po.delivered_at >= p_start_date
    AND po.delivered_at <= p_end_date
  GROUP BY DATE(po.delivered_at)
  ORDER BY DATE(po.delivered_at);
END;
$$;

-- RPC: Get Couriers Summary (KPIs for table)
CREATE OR REPLACE FUNCTION get_couriers_summary(
  p_start_date TIMESTAMP,
  p_end_date TIMESTAMP
)
RETURNS TABLE (
  courier_id UUID,
  total_earnings NUMERIC,
  earnings_period NUMERIC,
  delivered_count_lifetime BIGINT,
  delivered_count_period BIGINT,
  last_delivery_date TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- We aggregate from parent_orders and join with profiles implied by the ID
  -- But usually we just return the stats and let frontend fetch profiles or join here.
  -- Let's return stats grouped by courier_id.
  RETURN QUERY
  WITH period_stats AS (
    SELECT
      po.delivery_user_id,
      COALESCE(SUM(po.total_delivery_fee), 0) as earnings,
      COUNT(po.id) as count
    FROM parent_orders po
    WHERE
      po.status = 'DELIVERED'
      AND po.delivery_user_id IS NOT NULL
      AND po.delivered_at >= p_start_date
      AND po.delivered_at <= p_end_date
    GROUP BY po.delivery_user_id
  ),
  lifetime_stats AS (
    SELECT
      po.delivery_user_id,
      COALESCE(SUM(po.total_delivery_fee), 0) as earnings,
      COUNT(po.id) as count,
      MAX(po.delivered_at) as last_date
    FROM parent_orders po
    WHERE
      po.status = 'DELIVERED'
      AND po.delivery_user_id IS NOT NULL
    GROUP BY po.delivery_user_id
  )
  SELECT
    ls.delivery_user_id as courier_id,
    ls.earnings as total_earnings,
    COALESCE(ps.earnings, 0) as earnings_period,
    ls.count as delivered_count_lifetime,
    COALESCE(ps.count, 0) as delivered_count_period,
    ls.last_date as last_delivery_date
  FROM lifetime_stats ls
  LEFT JOIN period_stats ps ON ls.delivery_user_id = ps.delivery_user_id;
END;
$$;
