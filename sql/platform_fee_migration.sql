-- Add Platform Fee columns to delivery_settings
ALTER TABLE "public"."delivery_settings" 
ADD COLUMN "platform_fee_fixed" numeric(10, 2) DEFAULT 0 NOT NULL,
ADD COLUMN "platform_fee_percent" numeric(5, 2) DEFAULT 0 NOT NULL;

-- Add Platform Fee column to parent_orders (Multi-Store)
ALTER TABLE "public"."parent_orders"
ADD COLUMN "platform_fee" numeric(10, 2) DEFAULT 0 NOT NULL;

-- Add Platform Fee column to orders (Single-Store / Sub-orders)
-- Note: For sub-orders, this might be 0 if fee is on parent, but good to have for consistency in single-store legacy flow.
ALTER TABLE "public"."orders"
ADD COLUMN "platform_fee" numeric(10, 2) DEFAULT 0 NOT NULL;

-- Comment on columns for clarity
COMMENT ON COLUMN "public"."delivery_settings"."platform_fee_fixed" IS 'Fixed fee amount (EGP) added to order total';
COMMENT ON COLUMN "public"."delivery_settings"."platform_fee_percent" IS 'Percentage fee (0-100) calculated from subtotal';
COMMENT ON COLUMN "public"."parent_orders"."platform_fee" IS 'Platform service fee snapshot at time of order';
COMMENT ON COLUMN "public"."orders"."platform_fee" IS 'Platform service fee snapshot at time of order (mostly used for single-store checkout)';
