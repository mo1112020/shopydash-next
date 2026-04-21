SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'parent_orders' 
AND column_name IN ('latitude', 'longitude', 'gps_location');
