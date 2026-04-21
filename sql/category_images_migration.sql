-- Add image_url column to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS image_url TEXT NULL;

-- Create category-icons storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('category-icons', 'category-icons', true)
ON CONFLICT (id) DO NOTHING;

-- Public read access for category icons
DROP POLICY IF EXISTS "Public read category icons" ON storage.objects;
CREATE POLICY "Public read category icons"
ON storage.objects FOR SELECT
USING (bucket_id = 'category-icons');

-- Admin upload access for category icons
DROP POLICY IF EXISTS "Admin upload category icons" ON storage.objects;
CREATE POLICY "Admin upload category icons"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'category-icons'
  AND auth.uid() IS NOT NULL
);

-- Admin delete access for category icons
DROP POLICY IF EXISTS "Admin delete category icons" ON storage.objects;
CREATE POLICY "Admin delete category icons"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'category-icons'
  AND auth.uid() IS NOT NULL
);

-- Admin update access for category icons
DROP POLICY IF EXISTS "Admin update category icons" ON storage.objects;
CREATE POLICY "Admin update category icons"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'category-icons'
  AND auth.uid() IS NOT NULL
);
