-- =====================================================
-- BLOCK GOOGLE SIGNUPS
-- Run this in Supabase SQL Editor
-- This prevents new users from signing up via Google.
-- Existing users or standard email signups will work fine.
-- =====================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Block Google sign-ups for completely new accounts
  IF NEW.raw_app_meta_data->>'provider' = 'google' THEN
    RAISE EXCEPTION 'التسجيل باستخدام جوجل غير مسموح. يرجى التوجه لإنشاء حساب جديد أولاً.';
  END IF;

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
