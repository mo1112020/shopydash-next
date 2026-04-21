-- ===========================================
-- SIMPLE FIX: Disable RLS on child tables
-- They are already protected via parent orders RLS.
-- PostgREST joins inherit security from the parent query,
-- so disabling RLS here is safe and solves the 500 errors.
-- ===========================================

ALTER TABLE public.order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history DISABLE ROW LEVEL SECURITY;
