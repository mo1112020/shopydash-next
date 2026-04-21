-- =====================================================
-- FORCE CLEAR ALL SUBSCRIPTION DEBTS
-- Run this in Supabase SQL Editor
-- This will delete all generated test subscriptions so that
-- the outstanding debt returns exactly to 0
-- =====================================================

TRUNCATE TABLE public.subscription_payments;
TRUNCATE TABLE public.premium_subscription_payments;
