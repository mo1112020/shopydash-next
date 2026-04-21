-- =====================================================
-- ADMIN USER SETUP SQL SCRIPT
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Option 1: Promote an EXISTING user to ADMIN by email
-- Replace 'your-admin@email.com' with the actual email
UPDATE profiles 
SET role = 'ADMIN' 
WHERE email = 'your-admin@email.com';

-- Option 2: Create a NEW admin user (run after creating account via signup)
-- First: Create account normally via the app signup
-- Then run this SQL to promote to admin:
-- UPDATE profiles SET role = 'ADMIN' WHERE email = 'new-admin@email.com';

-- =====================================================
-- REVIEWS TABLE SETUP
-- =====================================================

-- Create reviews table if it doesn't exist
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id) -- One review per user per product
);

-- Create indexes for reviews
CREATE INDEX IF NOT EXISTS idx_reviews_product_id ON reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- Enable RLS on reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- RLS policies for reviews
DROP POLICY IF EXISTS "Anyone can view reviews" ON reviews;
CREATE POLICY "Anyone can view reviews" ON reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create their own reviews" ON reviews;
CREATE POLICY "Users can create their own reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;
CREATE POLICY "Users can update their own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reviews" ON reviews;
CREATE POLICY "Users can delete their own reviews" ON reviews
  FOR DELETE USING (auth.uid() = user_id);

-- Function to increment helpful count
CREATE OR REPLACE FUNCTION increment_helpful_count(review_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE reviews 
  SET helpful_count = helpful_count + 1 
  WHERE id = review_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- VERIFY ADMIN USER
-- =====================================================
SELECT id, email, full_name, role, created_at 
FROM profiles 
WHERE role = 'ADMIN';

-- =====================================================
-- USEFUL ADMIN QUERIES
-- =====================================================

-- View all users by role
SELECT role, COUNT(*) as count 
FROM profiles 
GROUP BY role;

-- View all shops with their status
SELECT id, name, status, is_open, created_at 
FROM shops 
ORDER BY created_at DESC;

-- View all pending shops (awaiting approval)
SELECT * FROM shops WHERE status = 'PENDING';

-- Approve a shop
-- UPDATE shops SET status = 'APPROVED' WHERE id = 'shop-id-here';

-- Suspend a shop
-- UPDATE shops SET status = 'SUSPENDED' WHERE id = 'shop-id-here';

-- View platform statistics
SELECT 
  (SELECT COUNT(*) FROM profiles) as total_users,
  (SELECT COUNT(*) FROM profiles WHERE role = 'CUSTOMER') as customers,
  (SELECT COUNT(*) FROM profiles WHERE role = 'SHOP_OWNER') as shop_owners,
  (SELECT COUNT(*) FROM profiles WHERE role = 'ADMIN') as admins,
  (SELECT COUNT(*) FROM shops) as total_shops,
  (SELECT COUNT(*) FROM shops WHERE status = 'APPROVED') as approved_shops,
  (SELECT COUNT(*) FROM orders) as total_orders,
  (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status != 'CANCELLED') as total_revenue;
