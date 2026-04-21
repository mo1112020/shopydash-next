-- Add Global Offer fields to the shops table
ALTER TABLE "shops" 
ADD COLUMN IF NOT EXISTS "global_offer_enabled" BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS "global_offer_type" TEXT CHECK (global_offer_type IN ('percentage', 'fixed')),
ADD COLUMN IF NOT EXISTS "global_offer_value" NUMERIC,
ADD COLUMN IF NOT EXISTS "global_offer_start_time" TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS "global_offer_end_time" TIMESTAMPTZ;

-- min_order_amount already exists in the shops table currently, but we'll ensure it has a proper default if null
UPDATE "shops" SET "min_order_amount" = 0 WHERE "min_order_amount" IS NULL;

-- Make sure we notify the client schema cache updates
NOTIFY pgrst, 'reload schema';
