-- Backfill delivered_at for existing DELIVERED orders
UPDATE public.parent_orders
SET delivered_at = updated_at
WHERE status = 'DELIVERED' AND delivered_at IS NULL;

-- Also update regular orders just in case we need it there too
UPDATE public.orders
SET delivered_at = updated_at
WHERE status = 'DELIVERED' AND delivered_at IS NULL;
