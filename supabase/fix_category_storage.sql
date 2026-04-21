-- =====================================================
-- FIX STORAGE RLS FOR CATEGORIES BUCKET
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. Ensure the 'categories' bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('categories', 'categories', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Drop existing policies to avoid conflicts (optional/safe)
DROP POLICY IF EXISTS "Public Access Categories" ON storage.objects;
DROP POLICY IF EXISTS "Admin Manage Categories" ON storage.objects;

-- 3. Allow Public Read Access (so everyone can see the images)
CREATE POLICY "Public Access Categories"
ON storage.objects FOR SELECT
USING ( bucket_id = 'categories' );

-- 4. Allow Admins to Insert/Update/Delete images
CREATE POLICY "Admin Manage Categories"
ON storage.objects FOR ALL
USING (
  bucket_id = 'categories'
  AND (
    -- Allow if user is an ADMIN in the public.profiles table
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'ADMIN'
    )
  )
)
WITH CHECK (
  bucket_id = 'categories'
  AND (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'ADMIN'
    )
  )
);
