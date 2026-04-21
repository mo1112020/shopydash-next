-- Check if parent_orders is part of the realtime publication
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'parent_orders';

-- If not, we add it (User should run this if the specific command above returns nothing, but running it again is harmless often)
-- ALTER PUBLICATION supabase_realtime ADD TABLE parent_orders;
