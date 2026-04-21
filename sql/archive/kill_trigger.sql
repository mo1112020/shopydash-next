-- CRITICAL FIX: DROP THE TRIGGER
-- The trigger is trying to update Parent Orders to "PREPARING" or "CONFIRMED", 
-- which violates the database rules (Constraint).
-- Since we are using the new "Atomic RPC" function, we should REMOVE the trigger 
-- to prevent it from crashing the system.

DROP TRIGGER IF EXISTS update_parent_status_trigger ON orders;
DROP FUNCTION IF EXISTS update_parent_order_status();
