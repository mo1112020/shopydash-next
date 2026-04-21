-- =====================================================
-- MULTI-STORE DELIVERY SYSTEM - DATABASE SETUP
-- =====================================================

-- Add coordinates to shops
ALTER TABLE shops 
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

CREATE INDEX IF NOT EXISTS idx_shops_coords ON shops(latitude, longitude);

COMMENT ON COLUMN shops.latitude IS 'Shop location latitude (-90 to 90)';
COMMENT ON COLUMN shops.longitude IS 'Shop location longitude (-180 to 180)';

-- Add coordinates to addresses
ALTER TABLE addresses
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

CREATE INDEX IF NOT EXISTS idx_addresses_coords ON addresses(latitude, longitude);

-- Create parent_orders table
CREATE TABLE IF NOT EXISTS parent_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id),
  
  -- Overall status
  status VARCHAR(20) NOT NULL DEFAULT 'PLACED',
  
  -- Totals
  subtotal DECIMAL(10,2) NOT NULL,
  total_delivery_fee DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  
  -- Route data
  route_km DECIMAL(10,2),
  route_minutes INTEGER,
  pickup_sequence JSONB,
  delivery_fee_breakdown JSONB,
  delivery_settings_snapshot JSONB,
  
  -- Delivery info
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_latitude DECIMAL(10, 8),
  delivery_longitude DECIMAL(11, 8),
  delivery_notes TEXT,
  
  -- Payment
  payment_method VARCHAR(50) DEFAULT 'COD',
  payment_status VARCHAR(20) DEFAULT 'PENDING',
  delivery_user_id UUID REFERENCES profiles(id),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_parent_status CHECK (
    status IN ('PLACED', 'PROCESSING', 'PARTIALLY_READY', 
               'READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 
               'DELIVERED', 'PARTIALLY_CANCELLED', 'CANCELLED')
  )
);

CREATE INDEX IF NOT EXISTS idx_parent_orders_user ON parent_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_parent_orders_status ON parent_orders(status);
CREATE INDEX IF NOT EXISTS idx_parent_orders_delivery_user ON parent_orders(delivery_user_id);
CREATE INDEX IF NOT EXISTS idx_parent_orders_settings ON parent_orders USING GIN (delivery_settings_snapshot);

-- Modify orders table for suborders
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS parent_order_id UUID REFERENCES parent_orders(id),
  ADD COLUMN IF NOT EXISTS is_critical BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS pickup_sequence_index INTEGER,
  ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_orders_parent ON orders(parent_order_id);

-- Multi-shop cart: make shop_id nullable
ALTER TABLE carts ALTER COLUMN shop_id DROP NOT NULL;

-- Create delivery_settings table
CREATE TABLE IF NOT EXISTS delivery_settings (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE,
  
  -- Pricing (distance-based only)
  base_fee DECIMAL(10, 2) NOT NULL DEFAULT 20.00,
  km_rate DECIMAL(10, 2) NOT NULL DEFAULT 3.00,
  pickup_stop_fee DECIMAL(10, 2) NOT NULL DEFAULT 10.00,
  min_fee DECIMAL(10, 2) NOT NULL DEFAULT 20.00,
  max_fee DECIMAL(10, 2) NOT NULL DEFAULT 200.00,
  rounding_rule VARCHAR(20) NOT NULL DEFAULT 'nearest_int',
  
  -- Fallback
  fallback_mode VARCHAR(20) NOT NULL DEFAULT 'fixed_fee',
  fixed_fallback_fee DECIMAL(10, 2) NOT NULL DEFAULT 50.00,
  
  -- Routing
  routing_algorithm VARCHAR(30) NOT NULL DEFAULT 'nearest_neighbor',
  return_to_customer BOOLEAN NOT NULL DEFAULT TRUE,
  mapbox_profile VARCHAR(30) NOT NULL DEFAULT 'driving',
  max_shops_per_order INTEGER NOT NULL DEFAULT 10,
  
  -- Metadata
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  
  CONSTRAINT single_row CHECK (id = TRUE),
  CONSTRAINT valid_rounding CHECK (rounding_rule IN ('nearest_int', 'nearest_0_5', 'ceil_int')),
  CONSTRAINT valid_fallback CHECK (fallback_mode IN ('block_checkout', 'fixed_fee')),
  CONSTRAINT valid_algorithm CHECK (routing_algorithm IN ('nearest_neighbor'))
);

-- Insert default values
INSERT INTO delivery_settings (id) 
VALUES (TRUE)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for delivery_settings
ALTER TABLE delivery_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "delivery_settings_read" ON delivery_settings;
CREATE POLICY "delivery_settings_read" ON delivery_settings
  FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "delivery_settings_update" ON delivery_settings;
CREATE POLICY "delivery_settings_update" ON delivery_settings
  FOR UPDATE 
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'ADMIN')
  )
  WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'ADMIN')
  );

-- RLS Policies for parent_orders
ALTER TABLE parent_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "parent_orders_select" ON parent_orders;
CREATE POLICY "parent_orders_select" ON parent_orders
  FOR SELECT
  USING (
    auth.uid() = user_id OR
    auth.uid() = delivery_user_id OR
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'ADMIN')
  );

DROP POLICY IF EXISTS "parent_orders_insert" ON parent_orders;
CREATE POLICY "parent_orders_insert" ON parent_orders
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "parent_orders_update" ON parent_orders;
CREATE POLICY "parent_orders_update" ON parent_orders
  FOR UPDATE
  USING (
    auth.uid() = delivery_user_id OR
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'ADMIN')
  );

COMMENT ON TABLE parent_orders IS 'Parent orders for multi-store checkout';
COMMENT ON TABLE delivery_settings IS 'Global delivery pricing and routing configuration';
