-- Migration to add thumbnail fields to existing projects table
-- This is a separate migration in case the main migration was already applied

-- Add thumbnail_updated_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' 
        AND column_name = 'thumbnail_updated_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.projects 
        ADD COLUMN thumbnail_updated_at TIMESTAMP WITH TIME ZONE;
        
        RAISE NOTICE 'Added thumbnail_updated_at column to projects table';
    ELSE
        RAISE NOTICE 'thumbnail_updated_at column already exists in projects table';
    END IF;
END $$;

-- Create index on thumbnail_updated_at if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'projects' 
        AND indexname = 'idx_projects_thumb_updated'
        AND schemaname = 'public'
    ) THEN
        CREATE INDEX idx_projects_thumb_updated ON public.projects(thumbnail_updated_at DESC);
        
        RAISE NOTICE 'Created index idx_projects_thumb_updated on projects table';
    ELSE
        RAISE NOTICE 'Index idx_projects_thumb_updated already exists on projects table';
    END IF;
END $$;

-- Verify the changes
DO $$
DECLARE
    thumbnail_url_exists BOOLEAN;
    thumbnail_updated_at_exists BOOLEAN;
    index_exists BOOLEAN;
BEGIN
    -- Check if thumbnail_url column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' 
        AND column_name = 'thumbnail_url'
        AND table_schema = 'public'
    ) INTO thumbnail_url_exists;
    
    -- Check if thumbnail_updated_at column exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' 
        AND column_name = 'thumbnail_updated_at'
        AND table_schema = 'public'
    ) INTO thumbnail_updated_at_exists;
    
    -- Check if index exists
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'projects' 
        AND indexname = 'idx_projects_thumb_updated'
        AND schemaname = 'public'
    ) INTO index_exists;
    
    -- Report status
    RAISE NOTICE 'Migration verification:';
    RAISE NOTICE '  thumbnail_url column exists: %', thumbnail_url_exists;
    RAISE NOTICE '  thumbnail_updated_at column exists: %', thumbnail_updated_at_exists;
    RAISE NOTICE '  idx_projects_thumb_updated index exists: %', index_exists;
    
    IF thumbnail_url_exists AND thumbnail_updated_at_exists AND index_exists THEN
        RAISE NOTICE 'All thumbnail-related database changes are in place!';
    ELSE
        RAISE WARNING 'Some thumbnail-related database changes are missing. Please check the main migration file.';
    END IF;
END $$;
