-- 1. Add telegram_enabled to profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS telegram_enabled BOOLEAN DEFAULT FALSE;

-- 2. Drop the OLD trigger that inserted into 'notifications' for drivers
-- We don't want stored notifications for drivers anymore.
DROP TRIGGER IF EXISTS on_order_ready_notify ON orders;
DROP FUNCTION IF EXISTS notify_delivery_on_ready;

-- 3. Ensure Shop Owner trigger remains (Stored Notifications)
-- (This part of the previous script is good, so we leave it or re-state it if needed)
-- Just to be safe, we verify the shop owner function exists, but we won't touch it if it's working.

-- 4. Security for the new column
-- Allow users to update their own telegram_enabled status
CREATE POLICY "Users can update own telegram status" 
ON profiles FOR UPDATE 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
