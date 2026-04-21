-- =====================================================
-- AUTO-BILLING SUBSCRIPTION SYSTEM
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Add auto_bill_subscription column to shop_financial_settings
ALTER TABLE public.shop_financial_settings
  ADD COLUMN IF NOT EXISTS auto_bill_subscription BOOLEAN DEFAULT false;

-- 2. Function: Auto-bill all eligible shops for the current month
-- Can be called via pg_cron or manually via RPC
CREATE OR REPLACE FUNCTION auto_bill_monthly_subscriptions()
RETURNS JSONB AS $$
DECLARE
  v_current_month DATE := date_trunc('month', NOW())::DATE;
  v_billed_count INT := 0;
  v_skipped_count INT := 0;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT sfs.shop_id, sfs.subscription_fee
    FROM public.shop_financial_settings sfs
    WHERE sfs.auto_bill_subscription = true
      AND sfs.subscription_fee > 0
  LOOP
    -- Check if already billed for this month (prevent duplicates)
    IF NOT EXISTS (
      SELECT 1 FROM public.subscription_payments
      WHERE shop_id = rec.shop_id
        AND billing_month = v_current_month
    ) THEN
      -- Insert the charge
      INSERT INTO public.subscription_payments (shop_id, billing_month, amount, status, notes, created_by_admin)
      VALUES (
        rec.shop_id,
        v_current_month,
        rec.subscription_fee,
        'PENDING',
        'فوترة تلقائية - ' || to_char(v_current_month, 'YYYY-MM'),
        (SELECT id FROM profiles WHERE role = 'ADMIN' LIMIT 1) -- Use first admin as creator
      );
      v_billed_count := v_billed_count + 1;
    ELSE
      v_skipped_count := v_skipped_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'billed', v_billed_count,
    'skipped_already_billed', v_skipped_count,
    'billing_month', v_current_month
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (admin-only check is inside the function)
GRANT EXECUTE ON FUNCTION public.auto_bill_monthly_subscriptions TO authenticated;

-- 3. Optional: Schedule via pg_cron (runs 1st of each month at 00:05)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Remove existing job if any
        PERFORM cron.unschedule('auto-bill-subscriptions-monthly');
        -- Schedule: minute 5, hour 0, day 1, every month
        PERFORM cron.schedule(
          'auto-bill-subscriptions-monthly',
          '5 0 1 * *',
          'SELECT auto_bill_monthly_subscriptions();'
        );
    ELSE
        RAISE NOTICE 'pg_cron not enabled. You can call auto_bill_monthly_subscriptions() manually via RPC or enable pg_cron in Supabase dashboard.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Failed to schedule cron job for auto-billing. Enable pg_cron or call the function manually.';
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
