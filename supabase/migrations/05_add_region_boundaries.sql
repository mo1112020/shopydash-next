-- =====================================================
-- MIGRATION: ADD BOUNDARY COORDINATES TO REGIONS
-- Run this in your Supabase SQL Editor
-- =====================================================

ALTER TABLE regions 
ADD COLUMN IF NOT EXISTS boundary_coordinates jsonb;

COMMENT ON COLUMN regions.boundary_coordinates IS 'Array of {lat, lng} objects defining the polygon boundary of the region';
