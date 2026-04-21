-- =====================================================
-- CLEAR PENDING TEST SUBSCRIPTIONS
-- Run this in Supabase SQL Editor if you want to wipe
-- out the 1,450 ج.م or any unpaid subscriptions generated
-- during the auto-billing testing.
-- =====================================================

DELETE FROM public.subscription_payments 
WHERE status = 'PENDING';

-- Optional: If you also want to clear premium test subscriptions that haven't been paid:
-- DELETE FROM public.premium_subscription_payments WHERE payment_date IS NULL;
