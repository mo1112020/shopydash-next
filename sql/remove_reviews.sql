-- Migration to remove reviews and ratings
-- Safe migration: checks if tables/columns exist before dropping

BEGIN;

-- 1. Drop Reviews Table
DROP TABLE IF EXISTS "reviews" CASCADE;

-- 2. Remove Rating Columns from Shops
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shops' AND column_name = 'rating') THEN
        ALTER TABLE "shops" DROP COLUMN "rating";
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shops' AND column_name = 'total_ratings') THEN
        ALTER TABLE "shops" DROP COLUMN "total_ratings";
    END IF;
END $$;

-- 3. Remove Rating Columns from Products (if any - though schema didn't explicitly show them in last view, being safe)
-- Based on previous view, products table didn't have rating columns, but good to double check or skip.

COMMIT;
