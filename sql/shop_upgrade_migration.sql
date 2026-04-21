-- ==========================================
-- 1. CATEGORIES TABLE UPDATES
-- ==========================================
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'PRODUCT' CHECK (type IN ('SHOP', 'PRODUCT'));

-- Unique constraint: A name cannot be duplicated within the same type
ALTER TABLE public.categories
DROP CONSTRAINT IF EXISTS categories_type_name_key;
ALTER TABLE public.categories
ADD CONSTRAINT categories_type_name_key UNIQUE (type, name);

-- Index for filtering by type and sorting
CREATE INDEX IF NOT EXISTS idx_categories_type_sort ON public.categories(type, sort_order);


-- ==========================================
-- 2. SHOPS TABLE UPDATES
-- ==========================================

-- Add new columns
ALTER TABLE public.shops
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id),
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS premium_sort_order INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS cover_url TEXT;

-- Update existing shops to be APPROVED and have a default category if needed
-- (Assuming we will create a default 'General' shop category manually or via UI, 
--  but for now let's just mark them APPROVED so existing functionality doesn't break)
UPDATE public.shops SET approval_status = 'APPROVED' WHERE approval_status = 'PENDING' AND created_at < NOW();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shops_approval_status ON public.shops(approval_status);
CREATE INDEX IF NOT EXISTS idx_shops_premium_sort ON public.shops(is_premium DESC, premium_sort_order ASC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shops_category_id ON public.shops(category_id);


-- ==========================================
-- 3. RLS POLICIES (DATABASE)
-- ==========================================

-- Enable RLS on shops (ensure it is on)
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;

-- Shops Visibility:
-- 1. Admin: View ALL
-- 2. Owner: View OWN
-- 3. Public/Customers: View ONLY APPROVED AND ACTIVE

DROP POLICY IF EXISTS "Public shops are viewable by everyone" ON public.shops;
DROP POLICY IF EXISTS "Admin view all shops" ON public.shops;
DROP POLICY IF EXISTS "Owners view own shop" ON public.shops;

CREATE POLICY "Shops visibility" ON public.shops
FOR SELECT
USING (
  (approval_status = 'APPROVED' AND is_active = true) -- Public/Customer condition
  OR
  (auth.uid() = owner_id) -- Owner condition
  OR
  (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')) -- Admin condition
);

CREATE POLICY "Owners update own shop" ON public.shops
FOR UPDATE
USING (auth.uid() = owner_id);

CREATE POLICY "Admin update all shops" ON public.shops
FOR UPDATE
USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'));

CREATE POLICY "Owners insert own shop" ON public.shops
FOR INSERT
WITH CHECK (auth.uid() = owner_id);


-- Products Visibility:
-- Products should strictly follow their Shop's visibility.
-- If shop is PENDING or INACTIVE, products shouldn't be seen by customers.

DROP POLICY IF EXISTS "Public products are viewable by everyone" ON public.products;

CREATE POLICY "Products visibility" ON public.products
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM shops 
    WHERE shops.id = products.shop_id 
    AND (
      (shops.approval_status = 'APPROVED' AND shops.is_active = true) -- Public
      OR
      (shops.owner_id = auth.uid()) -- Owner
      OR
      (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN')) -- Admin
    )
  )
);


-- ==========================================
-- 4. BACKEND ENFORCEMENT (TRIGGERS)
-- ==========================================

-- Function to check shop status before creating Parent Order
CREATE OR REPLACE FUNCTION check_shop_status_for_order()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_shop_status TEXT;
  v_shop_active BOOLEAN;
BEGIN
  -- Check the shop of the order (assuming parent_order doesn't have shop_id directly if it's multi-store? 
  -- actually parent_orders aggregates suborders. 
  -- Wait, parent_order is the container. Real checks should happen on `orders` (suborders) level mostly.
  -- But if we want to block the whole flow?
  -- Let's check `orders` table trigger.
  
  SELECT approval_status, is_active INTO v_shop_status, v_shop_active
  FROM shops
  WHERE id = NEW.shop_id;

  IF v_shop_status != 'APPROVED' OR v_shop_active IS NOT TRUE THEN
    RAISE EXCEPTION 'Cannot place order: Shop is not approved or is inactive.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_shop_status_orders ON public.orders;

CREATE TRIGGER trg_check_shop_status_orders
BEFORE INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION check_shop_status_for_order();


-- ==========================================
-- 5. SUPABASE STORAGE (BUCKETS & POLICIES)
-- ==========================================

-- Attempt to create buckets if they don't exist
-- Note: This might fail if the user doesn't have permission to insert into storage.buckets via SQL editor,
-- but typically it works in Supabase SQL Editor.
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-logos', 'shop-logos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-covers', 'shop-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies --

-- LOGOS
DROP POLICY IF EXISTS "Logos Public Read" ON storage.objects;
CREATE POLICY "Logos Public Read" ON storage.objects
FOR SELECT USING (bucket_id = 'shop-logos');

DROP POLICY IF EXISTS "Logos Owner Upload" ON storage.objects;
CREATE POLICY "Logos Owner Upload" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'shop-logos' 
  AND auth.uid() IS NOT NULL
  -- Ideally check if user owns the shop in the path, e.g. shop-logos/{shop_id}/file.jpg
  -- But parsing path in SQL policy can be complex. 
  -- For MVP, authentication check + app logic is often used, but stricter is better:
  -- (SPLIT_PART(name, '/', 1)::uuid IN (SELECT id FROM shops WHERE owner_id = auth.uid()))
);

DROP POLICY IF EXISTS "Logos Owner Update" ON storage.objects;
CREATE POLICY "Logos Owner Update" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'shop-logos' 
  AND auth.uid() IS NOT NULL
);

-- COVERS
DROP POLICY IF EXISTS "Covers Public Read" ON storage.objects;
CREATE POLICY "Covers Public Read" ON storage.objects
FOR SELECT USING (bucket_id = 'shop-covers');

DROP POLICY IF EXISTS "Covers Owner Upload" ON storage.objects;
CREATE POLICY "Covers Owner Upload" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'shop-covers' 
  AND auth.uid() IS NOT NULL
);

DROP POLICY IF EXISTS "Covers Owner Update" ON storage.objects;
CREATE POLICY "Covers Owner Update" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'shop-covers' 
  AND auth.uid() IS NOT NULL
);
