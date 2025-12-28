-- Fix groups table: Add avatar_url column if it doesn't exist
-- This SQL can be run directly on the database to fix the issue

-- Check if column exists and add it if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'groups' 
        AND column_name = 'avatar_url'
    ) THEN
        ALTER TABLE groups ADD COLUMN avatar_url VARCHAR(500);
    END IF;
END $$;

