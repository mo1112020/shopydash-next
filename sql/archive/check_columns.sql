
SELECT 
    table_name, 
    column_name, 
    data_type, 
    udt_name
FROM information_schema.columns
WHERE table_name = 'orders' AND column_name = 'cancelled_by';
