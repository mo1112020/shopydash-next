-- =====================================================
-- ABO-HOMMOS MARKETPLACE - ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is shop owner
CREATE OR REPLACE FUNCTION is_shop_owner()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'SHOP_OWNER'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user owns the shop
CREATE OR REPLACE FUNCTION owns_shop(shop_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM shops 
    WHERE id = shop_id AND owner_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user's shop ID
CREATE OR REPLACE FUNCTION get_user_shop_id()
RETURNS UUID AS $$
  SELECT id FROM shops WHERE owner_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- =====================================================
-- PROFILES POLICIES
-- =====================================================

-- Anyone can view basic profile info
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  USING (is_admin());

-- Profile creation is handled by trigger
CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- REGIONS & DISTRICTS POLICIES
-- =====================================================

-- Everyone can view active regions
CREATE POLICY "Anyone can view active regions"
  ON regions FOR SELECT
  USING (is_active = true OR is_admin());

-- Only admins can manage regions
CREATE POLICY "Admins can insert regions"
  ON regions FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update regions"
  ON regions FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete regions"
  ON regions FOR DELETE
  USING (is_admin());

-- Everyone can view active districts
CREATE POLICY "Anyone can view active districts"
  ON districts FOR SELECT
  USING (is_active = true OR is_admin());

-- Only admins can manage districts
CREATE POLICY "Admins can insert districts"
  ON districts FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update districts"
  ON districts FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete districts"
  ON districts FOR DELETE
  USING (is_admin());

-- =====================================================
-- CATEGORIES POLICIES
-- =====================================================

-- Everyone can view active categories
CREATE POLICY "Anyone can view active categories"
  ON categories FOR SELECT
  USING (is_active = true OR is_admin());

-- Only admins can manage categories
CREATE POLICY "Admins can insert categories"
  ON categories FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update categories"
  ON categories FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete categories"
  ON categories FOR DELETE
  USING (is_admin());

-- =====================================================
-- SHOPS POLICIES
-- =====================================================

-- Everyone can view approved shops
CREATE POLICY "Anyone can view approved shops"
  ON shops FOR SELECT
  USING (status = 'APPROVED' OR owner_id = auth.uid() OR is_admin());

-- Shop owners can create their shop
CREATE POLICY "Shop owners can create shop"
  ON shops FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id 
    AND is_shop_owner()
    AND NOT EXISTS (SELECT 1 FROM shops WHERE owner_id = auth.uid())
  );

-- Shop owners can update their own shop
CREATE POLICY "Shop owners can update own shop"
  ON shops FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Admins can update any shop (including status changes)
CREATE POLICY "Admins can update any shop"
  ON shops FOR UPDATE
  USING (is_admin());

-- Only admins can delete shops
CREATE POLICY "Admins can delete shops"
  ON shops FOR DELETE
  USING (is_admin());

-- =====================================================
-- PRODUCTS POLICIES
-- =====================================================

-- Everyone can view active products from approved shops
CREATE POLICY "Anyone can view active products"
  ON products FOR SELECT
  USING (
    is_active = true 
    AND EXISTS (
      SELECT 1 FROM shops 
      WHERE shops.id = products.shop_id AND shops.status = 'APPROVED'
    )
    OR owns_shop(shop_id)
    OR is_admin()
  );

-- Shop owners can create products for their shop
CREATE POLICY "Shop owners can create products"
  ON products FOR INSERT
  WITH CHECK (owns_shop(shop_id));

-- Shop owners can update their own products
CREATE POLICY "Shop owners can update own products"
  ON products FOR UPDATE
  USING (owns_shop(shop_id))
  WITH CHECK (owns_shop(shop_id));

-- Shop owners can delete their own products
CREATE POLICY "Shop owners can delete own products"
  ON products FOR DELETE
  USING (owns_shop(shop_id));

-- Admins can manage all products
CREATE POLICY "Admins can manage all products"
  ON products FOR ALL
  USING (is_admin());

-- =====================================================
-- CARTS POLICIES
-- =====================================================

-- Users can view their own cart
CREATE POLICY "Users can view own cart"
  ON carts FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own cart
CREATE POLICY "Users can create own cart"
  ON carts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own cart
CREATE POLICY "Users can update own cart"
  ON carts FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own cart
CREATE POLICY "Users can delete own cart"
  ON carts FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- CART ITEMS POLICIES
-- =====================================================

-- Users can view their own cart items
CREATE POLICY "Users can view own cart items"
  ON cart_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM carts 
      WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()
    )
  );

-- Users can add items to their cart
CREATE POLICY "Users can add cart items"
  ON cart_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM carts 
      WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()
    )
  );

-- Users can update their cart items
CREATE POLICY "Users can update cart items"
  ON cart_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM carts 
      WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()
    )
  );

-- Users can remove items from their cart
CREATE POLICY "Users can delete cart items"
  ON cart_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM carts 
      WHERE carts.id = cart_items.cart_id AND carts.user_id = auth.uid()
    )
  );

-- =====================================================
-- ORDERS POLICIES
-- =====================================================

-- Users can view their own orders
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (user_id = auth.uid());

-- Shop owners can view orders for their shop
CREATE POLICY "Shop owners can view shop orders"
  ON orders FOR SELECT
  USING (owns_shop(shop_id));

-- Admins can view all orders
CREATE POLICY "Admins can view all orders"
  ON orders FOR SELECT
  USING (is_admin());

-- Authenticated users can create orders
CREATE POLICY "Users can create orders"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Shop owners can update orders for their shop (status changes)
CREATE POLICY "Shop owners can update shop orders"
  ON orders FOR UPDATE
  USING (owns_shop(shop_id));

-- Users can cancel their own orders (status update)
CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  USING (user_id = auth.uid());

-- Admins can update any order
CREATE POLICY "Admins can update any order"
  ON orders FOR UPDATE
  USING (is_admin());

-- =====================================================
-- ORDER ITEMS POLICIES
-- =====================================================

-- Users can view their own order items
CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    )
  );

-- Shop owners can view order items for their shop
CREATE POLICY "Shop owners can view shop order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id AND owns_shop(orders.shop_id)
    )
  );

-- Admins can view all order items
CREATE POLICY "Admins can view all order items"
  ON order_items FOR SELECT
  USING (is_admin());

-- Order items are created with orders
CREATE POLICY "Users can create order items"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()
    )
  );

-- =====================================================
-- ORDER STATUS HISTORY POLICIES
-- =====================================================

-- Users can view status history for their orders
CREATE POLICY "Users can view own order history"
  ON order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_status_history.order_id AND orders.user_id = auth.uid()
    )
  );

-- Shop owners can view status history for their shop orders
CREATE POLICY "Shop owners can view shop order history"
  ON order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders 
      WHERE orders.id = order_status_history.order_id AND owns_shop(orders.shop_id)
    )
  );

-- Admins can view all status history
CREATE POLICY "Admins can view all order history"
  ON order_status_history FOR SELECT
  USING (is_admin());

-- Status history is created by triggers
CREATE POLICY "System can insert order history"
  ON order_status_history FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- ADDRESSES POLICIES
-- =====================================================

-- Users can view their own addresses
CREATE POLICY "Users can view own addresses"
  ON addresses FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own addresses
CREATE POLICY "Users can create addresses"
  ON addresses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own addresses
CREATE POLICY "Users can update own addresses"
  ON addresses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own addresses
CREATE POLICY "Users can delete own addresses"
  ON addresses FOR DELETE
  USING (auth.uid() = user_id);
