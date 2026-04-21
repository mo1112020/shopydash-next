-- =====================================================
-- ABO-HOMMOS MARKETPLACE - FUNCTIONS & TRIGGERS
-- =====================================================

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Generate order number function
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
  today_date TEXT;
  sequence_num INTEGER;
BEGIN
  today_date := TO_CHAR(NOW(), 'YYYYMMDD');
  
  SELECT COALESCE(MAX(
    CAST(SUBSTRING(order_number FROM 10) AS INTEGER)
  ), 0) + 1
  INTO sequence_num
  FROM orders
  WHERE order_number LIKE 'AH' || today_date || '%';
  
  new_number := 'AH' || today_date || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Set order number before insert
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- PROFILE MANAGEMENT
-- =====================================================

-- Create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'CUSTOMER')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ORDER STATUS MANAGEMENT
-- =====================================================

-- Record status change in history
CREATE OR REPLACE FUNCTION record_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_status_history (order_id, status, created_by)
    VALUES (NEW.id, NEW.status, auth.uid());
    
    -- Update delivered_at timestamp
    IF NEW.status = 'DELIVERED' THEN
      NEW.delivered_at := NOW();
    END IF;
    
    -- Update cancelled_at timestamp
    IF NEW.status = 'CANCELLED' THEN
      NEW.cancelled_at := NOW();
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Initial order status history entry
CREATE OR REPLACE FUNCTION create_initial_order_status()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO order_status_history (order_id, status, created_by)
  VALUES (NEW.id, NEW.status, auth.uid());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate order status transition
CREATE OR REPLACE FUNCTION validate_order_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow any transition for new orders
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- Validate status transitions
  IF OLD.status = 'PLACED' AND NEW.status NOT IN ('CONFIRMED', 'CANCELLED') THEN
    RAISE EXCEPTION 'Invalid status transition from PLACED to %', NEW.status;
  END IF;
  
  IF OLD.status = 'CONFIRMED' AND NEW.status NOT IN ('PREPARING', 'CANCELLED') THEN
    RAISE EXCEPTION 'Invalid status transition from CONFIRMED to %', NEW.status;
  END IF;
  
  IF OLD.status = 'PREPARING' AND NEW.status NOT IN ('OUT_FOR_DELIVERY', 'CANCELLED') THEN
    RAISE EXCEPTION 'Invalid status transition from PREPARING to %', NEW.status;
  END IF;
  
  IF OLD.status = 'OUT_FOR_DELIVERY' AND NEW.status NOT IN ('DELIVERED', 'CANCELLED') THEN
    RAISE EXCEPTION 'Invalid status transition from OUT_FOR_DELIVERY to %', NEW.status;
  END IF;
  
  IF OLD.status IN ('DELIVERED', 'CANCELLED') THEN
    RAISE EXCEPTION 'Cannot change status of % order', OLD.status;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INVENTORY MANAGEMENT
-- =====================================================

-- Update stock on order creation
CREATE OR REPLACE FUNCTION update_stock_on_order()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET stock_quantity = stock_quantity - NEW.quantity
  WHERE id = NEW.product_id AND track_inventory = TRUE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Restore stock on order cancellation
CREATE OR REPLACE FUNCTION restore_stock_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != 'CANCELLED' AND NEW.status = 'CANCELLED' THEN
    UPDATE products p
    SET stock_quantity = stock_quantity + oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id 
      AND p.id = oi.product_id 
      AND p.track_inventory = TRUE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SHOP STATISTICS
-- =====================================================

-- Update shop order count
CREATE OR REPLACE FUNCTION update_shop_order_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE shops
    SET total_orders = total_orders + 1
    WHERE id = NEW.shop_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- CART MANAGEMENT
-- =====================================================

-- Clear cart when switching shops
CREATE OR REPLACE FUNCTION handle_cart_shop_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If the shop is changing (and not null -> something), clear existing items
  IF OLD.shop_id IS NOT NULL AND OLD.shop_id IS DISTINCT FROM NEW.shop_id THEN
    DELETE FROM cart_items WHERE cart_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_regions_updated_at
  BEFORE UPDATE ON regions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_districts_updated_at
  BEFORE UPDATE ON districts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_shops_updated_at
  BEFORE UPDATE ON shops
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_carts_updated_at
  BEFORE UPDATE ON carts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_addresses_updated_at
  BEFORE UPDATE ON addresses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Order number generation
CREATE TRIGGER set_order_number_trigger
  BEFORE INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION set_order_number();

-- Order status validation
CREATE TRIGGER validate_order_status_trigger
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION validate_order_status_transition();

-- Order status history
CREATE TRIGGER record_order_status_trigger
  BEFORE UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION record_order_status_change();

CREATE TRIGGER create_initial_status_trigger
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION create_initial_order_status();

-- Inventory management
CREATE TRIGGER update_stock_trigger
  AFTER INSERT ON order_items
  FOR EACH ROW EXECUTE FUNCTION update_stock_on_order();

CREATE TRIGGER restore_stock_trigger
  AFTER UPDATE OF status ON orders
  FOR EACH ROW EXECUTE FUNCTION restore_stock_on_cancel();

-- Shop statistics
CREATE TRIGGER update_shop_orders_trigger
  AFTER INSERT ON orders
  FOR EACH ROW EXECUTE FUNCTION update_shop_order_count();

-- Cart management
CREATE TRIGGER handle_cart_shop_change_trigger
  BEFORE UPDATE OF shop_id ON carts
  FOR EACH ROW EXECUTE FUNCTION handle_cart_shop_change();

-- Auth trigger (create profile on signup)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
