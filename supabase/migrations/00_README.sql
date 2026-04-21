-- =====================================================
-- ABO-HOMMOS MARKETPLACE - COMPLETE SETUP
-- =====================================================
-- 
-- HOW TO USE THESE MIGRATIONS:
-- 
-- 1. Go to your Supabase project dashboard
-- 2. Navigate to SQL Editor
-- 3. Run each file IN ORDER:
--    - 01_schema.sql (tables and indexes)
--    - 02_functions.sql (functions and triggers)
--    - 03_rls.sql (security policies)
--    - 04_seed.sql (initial data)
-- 
-- 4. Set up Storage buckets:
--    Go to Storage → New Bucket
--    Create these PUBLIC buckets:
--    - avatars
--    - shops  
--    - products
--    - categories
-- 
-- 5. Configure Authentication:
--    Go to Authentication → Providers
--    Enable Email provider
--    Optionally enable Google, Facebook, etc.
-- 
-- 6. Get your API keys:
--    Go to Settings → API
--    Copy:
--    - Project URL (VITE_SUPABASE_URL)
--    - anon public key (VITE_SUPABASE_ANON_KEY)
-- 
-- 7. Create .env file in project root:
--    VITE_SUPABASE_URL=your-project-url
--    VITE_SUPABASE_ANON_KEY=your-anon-key
-- 
-- =====================================================
-- QUICK TEST QUERIES
-- =====================================================

-- Check tables created
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';

-- Check regions
-- SELECT * FROM regions;

-- Check categories
-- SELECT * FROM categories WHERE parent_id IS NULL ORDER BY sort_order;

-- Check RLS policies
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';

-- =====================================================
-- CREATING TEST USERS
-- =====================================================

-- After signup, promote user to admin:
-- UPDATE profiles SET role = 'ADMIN' WHERE email = 'your-admin@email.com';

-- After signup, make user a shop owner:
-- UPDATE profiles SET role = 'SHOP_OWNER' WHERE email = 'your-shop@email.com';

-- =====================================================
-- TROUBLESHOOTING
-- =====================================================

-- If you get "permission denied" errors:
-- 1. Check RLS is enabled on the table
-- 2. Check user is authenticated
-- 3. Check policy conditions match user's role

-- If triggers don't fire:
-- 1. Check trigger is enabled
-- 2. Check function exists
-- 3. Check SECURITY DEFINER is set where needed

-- To reset everything (CAUTION - deletes all data):
-- DROP SCHEMA public CASCADE;
-- CREATE SCHEMA public;
-- GRANT ALL ON SCHEMA public TO postgres;
-- GRANT ALL ON SCHEMA public TO public;
-- Then run all migrations again
