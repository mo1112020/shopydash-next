-- =====================================================
-- ABO-HOMMOS MARKETPLACE - SEED DATA
-- =====================================================

-- =====================================================
-- REGIONS
-- =====================================================

INSERT INTO regions (name, name_en, slug) VALUES
  ('أبو حمص', 'Abu Hommos', 'abu-hommos'),
  ('دمنهور', 'Damanhur', 'damanhur'),
  ('كفر الدوار', 'Kafr El-Dawar', 'kafr-el-dawar');

-- =====================================================
-- DISTRICTS (for Abu Hommos)
-- =====================================================

INSERT INTO districts (region_id, name, name_en, slug, delivery_fee)
SELECT 
  r.id,
  d.name,
  d.name_en,
  d.slug,
  d.delivery_fee
FROM regions r
CROSS JOIN (VALUES
  ('وسط البلد', 'Downtown', 'downtown', 5.00),
  ('الحي الشرقي', 'Eastern District', 'eastern', 7.00),
  ('الحي الغربي', 'Western District', 'western', 7.00),
  ('المنطقة الصناعية', 'Industrial Area', 'industrial', 10.00),
  ('الأراضي الزراعية', 'Agricultural Lands', 'agricultural', 15.00)
) AS d(name, name_en, slug, delivery_fee)
WHERE r.slug = 'abu-hommos';

-- =====================================================
-- CATEGORIES
-- =====================================================

INSERT INTO categories (name, name_en, slug, description, icon, sort_order) VALUES
  ('خضروات وفواكه', 'Vegetables & Fruits', 'vegetables', 'خضروات وفواكه طازجة من المزارع المحلية', '🥬', 1),
  ('لحوم ودواجن', 'Meat & Poultry', 'meat', 'لحوم طازجة ودواجن عالية الجودة', '🍗', 2),
  ('ألبان ومنتجات ألبان', 'Dairy Products', 'dairy', 'حليب وأجبان وزبادي طازج', '🥛', 3),
  ('مخبوزات', 'Bakery', 'bakery', 'خبز طازج ومعجنات لذيذة', '🍞', 4),
  ('مشروبات', 'Beverages', 'beverages', 'مياه وعصائر ومشروبات غازية', '🥤', 5),
  ('منظفات', 'Cleaning', 'cleaning', 'منظفات ومستلزمات تنظيف', '🧹', 6),
  ('مستلزمات منزلية', 'Household', 'household', 'مستلزمات منزلية متنوعة', '🏠', 7),
  ('إلكترونيات', 'Electronics', 'electronics', 'أجهزة إلكترونية ومستلزماتها', '📱', 8),
  ('ملابس', 'Clothing', 'clothing', 'ملابس رجالية ونسائية وأطفال', '👕', 9),
  ('صحة وجمال', 'Health & Beauty', 'health-beauty', 'مستحضرات تجميل ومنتجات صحية', '💄', 10);

-- =====================================================
-- SUBCATEGORIES
-- =====================================================

-- Vegetables subcategories
INSERT INTO categories (parent_id, name, name_en, slug, sort_order)
SELECT c.id, sub.name, sub.name_en, sub.slug, sub.sort_order
FROM categories c
CROSS JOIN (VALUES
  ('خضروات ورقية', 'Leafy Vegetables', 'leafy-vegetables', 1),
  ('خضروات جذرية', 'Root Vegetables', 'root-vegetables', 2),
  ('فواكه موسمية', 'Seasonal Fruits', 'seasonal-fruits', 3),
  ('فواكه استوائية', 'Tropical Fruits', 'tropical-fruits', 4)
) AS sub(name, name_en, slug, sort_order)
WHERE c.slug = 'vegetables';

-- Meat subcategories
INSERT INTO categories (parent_id, name, name_en, slug, sort_order)
SELECT c.id, sub.name, sub.name_en, sub.slug, sub.sort_order
FROM categories c
CROSS JOIN (VALUES
  ('لحم بقري', 'Beef', 'beef', 1),
  ('لحم ضأن', 'Lamb', 'lamb', 2),
  ('دجاج', 'Chicken', 'chicken', 3),
  ('أسماك', 'Fish', 'fish', 4)
) AS sub(name, name_en, slug, sort_order)
WHERE c.slug = 'meat';

-- Dairy subcategories
INSERT INTO categories (parent_id, name, name_en, slug, sort_order)
SELECT c.id, sub.name, sub.name_en, sub.slug, sub.sort_order
FROM categories c
CROSS JOIN (VALUES
  ('حليب', 'Milk', 'milk', 1),
  ('أجبان', 'Cheese', 'cheese', 2),
  ('زبادي', 'Yogurt', 'yogurt', 3),
  ('زبدة وقشطة', 'Butter & Cream', 'butter-cream', 4)
) AS sub(name, name_en, slug, sort_order)
WHERE c.slug = 'dairy';

-- =====================================================
-- STORAGE BUCKETS (Run in Supabase Storage settings)
-- =====================================================
-- Note: Create these buckets manually in Supabase Dashboard:
-- 1. 'avatars' - For user profile images (public)
-- 2. 'shops' - For shop logos and covers (public)
-- 3. 'products' - For product images (public)
-- 4. 'categories' - For category images (public)

-- =====================================================
-- SAMPLE ADMIN USER (for testing)
-- =====================================================
-- Note: After creating a user via signup, run this to make them admin:
-- UPDATE profiles SET role = 'ADMIN' WHERE email = 'admin@abo-hommos.com';

-- =====================================================
-- REALTIME PUBLICATION
-- =====================================================

-- Enable realtime for orders and order_status_history
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_status_history;
