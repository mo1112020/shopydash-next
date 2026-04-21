-- Update the status transition validation function to allow READY_FOR_PICKUP

CREATE OR REPLACE FUNCTION validate_order_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow any transition for new orders
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- Validate status transitions
  IF OLD.status = 'PLACED' AND NEW.status NOT IN ('CONFIRMED', 'CANCELLED') THEN
    RAISE EXCEPTION 'Invalid status transition from PLACED to %', NEW.status;
  END IF;
  
  IF OLD.status = 'CONFIRMED' AND NEW.status NOT IN ('PREPARING', 'CANCELLED') THEN
    RAISE EXCEPTION 'Invalid status transition from CONFIRMED to %', NEW.status;
  END IF;
  
  -- Updated: PREPARING can now go to READY_FOR_PICKUP
  IF OLD.status = 'PREPARING' AND NEW.status NOT IN ('READY_FOR_PICKUP', 'OUT_FOR_DELIVERY', 'CANCELLED') THEN
    RAISE EXCEPTION 'Invalid status transition from PREPARING to %', NEW.status;
  END IF;
  
  -- New: READY_FOR_PICKUP can go to OUT_FOR_DELIVERY
  IF OLD.status = 'READY_FOR_PICKUP' AND NEW.status NOT IN ('OUT_FOR_DELIVERY', 'CANCELLED') THEN
     RAISE EXCEPTION 'Invalid status transition from READY_FOR_PICKUP to %', NEW.status;
  END IF;
  
  IF OLD.status = 'OUT_FOR_DELIVERY' AND NEW.status NOT IN ('DELIVERED', 'CANCELLED') THEN
    RAISE EXCEPTION 'Invalid status transition from OUT_FOR_DELIVERY to %', NEW.status;
  END IF;
  
  IF OLD.status IN ('DELIVERED', 'CANCELLED') THEN
    RAISE EXCEPTION 'Cannot change status of % order', OLD.status;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
