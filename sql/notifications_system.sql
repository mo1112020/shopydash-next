-- =====================================================
-- NOTIFICATION SYSTEM MIGRATION
-- =====================================================

-- 1. Create Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role user_role NOT NULL, -- 'SHOP_OWNER' | 'DELIVERY' | 'CUSTOMER' etc
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
ON notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read 
ON notifications(is_read);

-- 3. RLS Policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true); -- Triggers allow simple inserts, but usually bypass RLS. 
  -- If inserting from client (not recommended for this flow), we'd need restriction.
  -- Since we use triggers (Server-Side), RLS applies to API access.

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- 4. Add Telegram Chat ID to Profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT;

-- =====================================================
-- TRIGGER 1: NOTIFY SHOP OWNER (ORDER_CREATED)
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_order_notification()
RETURNS TRIGGER AS $$
DECLARE
  shop_owner_id UUID;
  shop_name TEXT;
BEGIN
  -- Get shop owner info
  SELECT owner_id, name INTO shop_owner_id, shop_name
  FROM shops
  WHERE id = NEW.shop_id;

  IF shop_owner_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, role, type, message, order_id)
    VALUES (
      shop_owner_id, 
      'SHOP_OWNER', 
      'ORDER_CREATED', 
      'طلب جديد وصل من ' || COALESCE(NEW.customer_name, 'زبون'), 
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_created_notify ON orders;
CREATE TRIGGER on_order_created_notify
AFTER INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_order_notification();


-- =====================================================
-- TRIGGER 2: NOTIFY DRIVERS (READY_FOR_PICKUP)
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_ready_for_pickup_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if status changed to READY_FOR_PICKUP
  IF (OLD.status IS DISTINCT FROM NEW.status) AND (NEW.status = 'READY_FOR_PICKUP') THEN
    
    -- Insert notification for ALL Delivery Drivers
    -- Note: In a real large app, we would filter by location/region. 
    -- For now (small driver base), broadcast is requested.
    INSERT INTO notifications (user_id, role, type, message, order_id)
    SELECT 
      id as user_id, 
      'DELIVERY' as role, 
      'READY_FOR_PICKUP' as type, 
      'طلب جاهز للاستلام #' || split_part(NEW.order_number, '-', 2) as message, 
      NEW.id as order_id
    FROM profiles
    WHERE role = 'DELIVERY';

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_order_ready_notify ON orders;
CREATE TRIGGER on_order_ready_notify
AFTER UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_ready_for_pickup_notification();

-- =====================================================
-- PERMISSIONS (Ensuring triggers work)
-- =====================================================

