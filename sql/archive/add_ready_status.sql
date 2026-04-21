-- Add READY_FOR_PICKUP to order_status enum
-- Run this in Supabase SQL Editor

ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'READY_FOR_PICKUP' AFTER 'PREPARING';
