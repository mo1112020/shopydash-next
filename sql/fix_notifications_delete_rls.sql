-- =====================================================
-- FIX: Add missing DELETE RLS policy for notifications
-- =====================================================
-- The notifications table had SELECT, INSERT, UPDATE policies
-- but was missing a DELETE policy, causing clearAll to silently fail.

DROP POLICY IF EXISTS "Users can delete their own notifications" ON notifications;
CREATE POLICY "Users can delete their own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);
