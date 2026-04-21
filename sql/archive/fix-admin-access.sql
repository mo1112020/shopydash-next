-- =====================================================
-- ADMIN ACCESS RECOVERY HELP SCRIPT
-- =====================================================

-- PROBLEM: You forgot your password for 'ahmedtkmd1@gmail.com'

-- SOLUTION 1: Reset Password via Supabase Dashboard (Recommended)
-- 1. Go to your Supabase Project Dashboard.
-- 2. Click on "Authentication" in the sidebar.
-- 3. Find 'ahmedtkmd1@gmail.com' in the list of users.
-- 4. Click the three dots (...) and select "Send password reset" (if you have email configured).
--    OR: Update the password directly if your Supabase version allows it.

-- SOLUTION 2: Delete and Re-create Account (Fastest for Dev)
-- 1. In Supabase Dashboard > Authentication, delete the user 'ahmedtkmd1@gmail.com'.
-- 2. Go to your app's login page and Sign Up again with the same email and a NEW password.
-- 3. After signing up, RUN THE FOLLOWING QUERY to make yourself an ADMIN again:

UPDATE profiles 
SET role = 'ADMIN' 
WHERE email = 'ahmedtkmd1@gmail.com';

-- VERIFICATION
-- Check your user status:
SELECT id, email, role, full_name 
FROM profiles 
WHERE email = 'ahmedtkmd1@gmail.com';
