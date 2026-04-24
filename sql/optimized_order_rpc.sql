-- =====================================================
-- OPTIMIZED ORDER CREATION — RPC FUNCTION
-- File: sql/optimized_order_rpc.sql
--
-- HOW TO USE:
--   1. Open Supabase Dashboard → SQL Editor → New Query
--   2. Paste this entire file and run it
--   3. Verify: SELECT proname FROM pg_proc WHERE proname = 'create_multi_store_order_v2';
--   4. Enable on frontend by setting USE_RPC_CHECKOUT = true in order.service.ts
--
-- SAFETY: This does NOT modify any existing tables, triggers, or policies.
--         It only ADDS a new function and indexes.
-- =====================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 1: Safe indexes (IF NOT EXISTS — completely harmless to run multiple times)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_parent_order_id         ON orders(parent_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id                 ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_shop_id                 ON orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_orders_status                  ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id           ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id         ON order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id  ON order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart_id             ON cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_carts_user_id                  ON carts(user_id);
CREATE INDEX IF NOT EXISTS idx_products_shop_id               ON products(shop_id);
CREATE INDEX IF NOT EXISTS idx_products_is_active             ON products(is_active);

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 2: The optimized RPC function
-- Named v2 to NOT conflict with any existing function
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION create_multi_store_order_v2(
  p_user_id                    UUID,
  p_customer_name              TEXT,
  p_customer_phone             TEXT,
  p_delivery_address           TEXT,
  p_delivery_latitude          DOUBLE PRECISION,
  p_delivery_longitude         DOUBLE PRECISION,
  p_delivery_notes             TEXT,
  p_payment_method             TEXT,
  p_total_subtotal             NUMERIC,
  p_delivery_fee               NUMERIC,
  p_platform_fee               NUMERIC,
  p_route_km                   NUMERIC,
  p_route_minutes              NUMERIC,
  p_pickup_sequence            JSONB,
  p_delivery_fee_breakdown     JSONB,
  p_delivery_settings_snapshot JSONB,
  p_suborders                  JSONB   -- array of suborder objects
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER  -- Runs as the function owner, bypassing RLS safely
AS $$
DECLARE
  v_parent_order_id   UUID;
  v_order_number      TEXT;
  v_suborder_record   JSONB;
  v_suborder_id       UUID;
  v_suborder_number   TEXT;
  v_item_record       JSONB;
  v_total             NUMERIC;
  v_address_with_gps  TEXT;
  v_available_stock   INT;
  v_requested_qty     INT;
  v_product_name      TEXT;
BEGIN
  -- ── Guard: caller must be authenticated ────────────────────────────────────
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'AUTH_ERROR: يجب تسجيل الدخول لإنشاء طلب';
  END IF;

  -- ── Guard: user_id must match the authenticated user ───────────────────────
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'AUTH_ERROR: غير مصرح بهذه العملية';
  END IF;

  -- ── Guard: must have at least one suborder ─────────────────────────────────
  IF jsonb_array_length(p_suborders) = 0 THEN
    RAISE EXCEPTION 'VALIDATION_ERROR: لا توجد منتجات في الطلب';
  END IF;

  -- ── Build GPS-enriched address ─────────────────────────────────────────────
  IF p_delivery_latitude IS NOT NULL AND p_delivery_longitude IS NOT NULL
     AND p_delivery_latitude != 0 AND p_delivery_longitude != 0 THEN
    v_address_with_gps := p_delivery_address
      || E'\nموقع GPS: ' || p_delivery_latitude || ',' || p_delivery_longitude;
  ELSE
    v_address_with_gps := p_delivery_address;
  END IF;

  -- ── Calculate authoritative total ─────────────────────────────────────────
  v_total := p_total_subtotal + p_delivery_fee + p_platform_fee;

  -- ── Generate unique, human-readable order number ──────────────────────────
  v_order_number := 'PO-'
    || EXTRACT(EPOCH FROM NOW())::BIGINT
    || '-'
    || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 6));

  -- ── STOCK VALIDATION PASS (validate ALL items before writing ANYTHING) ─────
  -- This prevents partial writes if any product is out of stock
  FOR v_suborder_record IN SELECT * FROM jsonb_array_elements(p_suborders)
  LOOP
    FOR v_item_record IN SELECT * FROM jsonb_array_elements(v_suborder_record->'items')
    LOOP
      v_requested_qty := (v_item_record->>'quantity')::INT;
      v_product_name  := v_item_record->>'product_name';

      SELECT stock_quantity INTO v_available_stock
        FROM products
        WHERE id = (v_item_record->>'product_id')::UUID
          AND is_active = true;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'STOCK_ERROR: المنتج "%" غير موجود أو غير متاح', v_product_name;
      END IF;

      IF v_available_stock < v_requested_qty THEN
        RAISE EXCEPTION 'STOCK_ERROR: المنتج "%" غير متوفر بالكمية المطلوبة. المتاح: %، المطلوب: %',
          v_product_name, v_available_stock, v_requested_qty;
      END IF;
    END LOOP;
  END LOOP;

  -- ── CREATE PARENT ORDER ────────────────────────────────────────────────────
  INSERT INTO parent_orders (
    user_id,
    order_number,
    status,
    subtotal,
    total_delivery_fee,
    platform_fee,
    total,
    customer_name,
    customer_phone,
    delivery_address,
    delivery_latitude,
    delivery_longitude,
    delivery_notes,
    payment_method,
    payment_status,
    route_km,
    route_minutes,
    pickup_sequence,
    delivery_fee_breakdown,
    delivery_settings_snapshot
  )
  VALUES (
    p_user_id,
    v_order_number,
    'PLACED',
    p_total_subtotal,
    p_delivery_fee,
    p_platform_fee,
    v_total,
    p_customer_name,
    p_customer_phone,
    v_address_with_gps,
    p_delivery_latitude,
    p_delivery_longitude,
    p_delivery_notes,
    p_payment_method,
    'PENDING',
    p_route_km,
    p_route_minutes,
    p_pickup_sequence,
    p_delivery_fee_breakdown,
    p_delivery_settings_snapshot
  )
  RETURNING id INTO v_parent_order_id;

  -- ── CREATE SUBORDERS + ITEMS + HISTORY + STOCK UPDATE ─────────────────────
  FOR v_suborder_record IN SELECT * FROM jsonb_array_elements(p_suborders)
  LOOP
    v_suborder_number := v_order_number
      || '-'
      || UPPER(SUBSTRING((v_suborder_record->>'shop_id'), 1, 4));

    -- Create suborder (with parent linked immediately — no extra UPDATE needed)
    INSERT INTO orders (
      parent_order_id,
      order_number,
      user_id,
      shop_id,
      status,
      subtotal,
      delivery_fee,
      platform_fee,
      total,
      customer_name,
      customer_phone,
      delivery_address,
      delivery_notes,
      payment_method,
      payment_status,
      pickup_sequence_index
    )
    VALUES (
      v_parent_order_id,
      v_suborder_number,
      p_user_id,
      (v_suborder_record->>'shop_id')::UUID,
      'PLACED',
      (v_suborder_record->>'subtotal')::NUMERIC,
      0,
      0,
      (v_suborder_record->>'subtotal')::NUMERIC,
      p_customer_name,
      p_customer_phone,
      v_address_with_gps,
      p_delivery_notes,
      p_payment_method,
      'PENDING',
      (v_suborder_record->>'pickup_sequence_index')::INT
    )
    RETURNING id INTO v_suborder_id;

    -- Bulk insert all items for this suborder in ONE statement
    INSERT INTO order_items (
      order_id,
      product_id,
      product_name,
      product_image,
      quantity,
      unit_price,
      total_price
    )
    SELECT
      v_suborder_id,
      (item->>'product_id')::UUID,
      item->>'product_name',
      item->>'product_image',
      (item->>'quantity')::INT,
      (item->>'unit_price')::NUMERIC,
      (item->>'total_price')::NUMERIC
    FROM jsonb_array_elements(v_suborder_record->'items') AS item;

    -- Insert initial status history
    INSERT INTO order_status_history (order_id, status, created_by)
    VALUES (v_suborder_id, 'PLACED', p_user_id);

    -- Reduce stock atomically for all items in this suborder
    UPDATE products p
    SET
      stock_quantity = p.stock_quantity - (item->>'quantity')::INT,
      updated_at     = NOW()
    FROM jsonb_array_elements(v_suborder_record->'items') AS item
    WHERE p.id = (item->>'product_id')::UUID;

  END LOOP;

  -- ── RETURN SUCCESS ─────────────────────────────────────────────────────────
  RETURN jsonb_build_object(
    'success',          true,
    'parent_order_id',  v_parent_order_id,
    'order_number',     v_order_number
  );

EXCEPTION
  -- Any unhandled error causes a full automatic rollback
  WHEN OTHERS THEN
    RAISE EXCEPTION '%', SQLERRM;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- STEP 3: Grant execute permission to authenticated users only
-- ─────────────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION create_multi_store_order_v2 TO authenticated;
REVOKE EXECUTE ON FUNCTION create_multi_store_order_v2 FROM anon;
