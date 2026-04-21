-- Migration to support Split Shifts and Overnight Hours

-- 1. Add new columns
ALTER TABLE shop_working_hours 
ADD COLUMN period_index SMALLINT DEFAULT 1 NOT NULL,
ADD COLUMN is_enabled BOOLEAN DEFAULT true,
ADD COLUMN crosses_midnight BOOLEAN DEFAULT false;

-- 2. Rename existing time columns to be more generic (start/end)
ALTER TABLE shop_working_hours 
RENAME COLUMN open_time TO start_time;

ALTER TABLE shop_working_hours 
RENAME COLUMN close_time TO end_time;

-- 3. Migrate data: Convert old 'is_day_off' to new 'is_enabled'
-- If it was a day off, is_enabled should be false.
UPDATE shop_working_hours 
SET is_enabled = (NOT is_day_off);

-- 4. Drop the old column
ALTER TABLE shop_working_hours 
DROP COLUMN is_day_off;

-- 5. Update Constraints
-- First, drop the old constraint that allowed only one record per day per shop.
-- Note: Replaced strict name with a DO block to be safer, or just assuming standard naming.
-- Standard naming for unique(shop_id, day_of_week) is shop_working_hours_shop_id_day_of_week_key
ALTER TABLE shop_working_hours 
DROP CONSTRAINT IF EXISTS shop_working_hours_shop_id_day_of_week_key;

-- Now add the new constraint allowing 1st and 2nd period for the same day
ALTER TABLE shop_working_hours 
ADD CONSTRAINT shop_hours_period_unique UNIQUE (shop_id, day_of_week, period_index);

-- 6. Add validation check
-- Ensure period_index is either 1 or 2
ALTER TABLE shop_working_hours 
ADD CONSTRAINT check_period_index CHECK (period_index IN (1, 2));

-- Comments
COMMENT ON COLUMN shop_working_hours.period_index IS '1 for first shift, 2 for second shift';
COMMENT ON COLUMN shop_working_hours.crosses_midnight IS 'True if the shift ends on the next day (e.g. 20:00 to 02:00)';
