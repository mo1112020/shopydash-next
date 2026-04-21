SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'parent_orders'::regclass
AND conname = 'valid_parent_status';
