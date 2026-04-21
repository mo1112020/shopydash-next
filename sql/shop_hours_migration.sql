-- Add override_mode to shops
ALTER TABLE shops 
ADD COLUMN IF NOT EXISTS override_mode text DEFAULT 'AUTO' CHECK (override_mode IN ('AUTO', 'FORCE_OPEN', 'FORCE_CLOSED'));

-- Create shop_working_hours table
CREATE TABLE IF NOT EXISTS shop_working_hours (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  shop_id uuid REFERENCES shops(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  is_day_off boolean DEFAULT false,
  open_time time DEFAULT '09:00',
  close_time time DEFAULT '22:00',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(shop_id, day_of_week)
);

-- RLS
ALTER TABLE shop_working_hours ENABLE ROW LEVEL SECURITY;

-- Policy: Public read
CREATE POLICY "Public shops hours are viewable by everyone" 
ON shop_working_hours FOR SELECT 
USING (true);

-- Policy: Owners update
CREATE POLICY "Owners can update their shop hours" 
ON shop_working_hours FOR ALL 
USING (
  auth.uid() IN (SELECT owner_id FROM shops WHERE id = shop_working_hours.shop_id)
);

-- Helper to seed hours for a shop
CREATE OR REPLACE FUNCTION seed_default_shop_hours(target_shop_id uuid)
RETURNS void AS $$
BEGIN
  INSERT INTO shop_working_hours (shop_id, day_of_week, open_time, close_time)
  SELECT 
    target_shop_id, 
    day_num,
    '09:00',
    '23:00'
  FROM generate_series(0, 6) AS day_num
  ON CONFLICT (shop_id, day_of_week) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Seed for existing shops
DO $$
DECLARE
  shop_rec RECORD;
BEGIN
  FOR shop_rec IN SELECT id FROM shops LOOP
    PERFORM seed_default_shop_hours(shop_rec.id);
  END LOOP;
END;
$$;
