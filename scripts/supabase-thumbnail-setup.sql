-- =====================================================
-- SUPABASE THUMBNAIL SETUP SCRIPT
-- =====================================================
-- Run this script in your Supabase SQL Editor to set up
-- everything needed for canvas thumbnail functionality
-- =====================================================

-- 1. ADD THUMBNAIL COLUMNS TO PROJECTS TABLE
-- =====================================================

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
        
        RAISE NOTICE '✅ Added thumbnail_updated_at column to projects table';
    ELSE
        RAISE NOTICE '✅ thumbnail_updated_at column already exists in projects table';
    END IF;
END $$;

-- Ensure thumbnail_url column exists (should already be there)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' 
        AND column_name = 'thumbnail_url'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.projects 
        ADD COLUMN thumbnail_url TEXT;
        
        RAISE NOTICE '✅ Added thumbnail_url column to projects table';
    ELSE
        RAISE NOTICE '✅ thumbnail_url column already exists in projects table';
    END IF;
END $$;

-- Create index on thumbnail_updated_at for performance
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'projects' 
        AND indexname = 'idx_projects_thumb_updated'
        AND schemaname = 'public'
    ) THEN
        CREATE INDEX idx_projects_thumb_updated ON public.projects(thumbnail_updated_at DESC);
        
        RAISE NOTICE '✅ Created index idx_projects_thumb_updated on projects table';
    ELSE
        RAISE NOTICE '✅ Index idx_projects_thumb_updated already exists on projects table';
    END IF;
END $$;

-- 2. CREATE STORAGE BUCKET FOR THUMBNAILS
-- =====================================================

-- Insert bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'project-thumbnails',
    'project-thumbnails', 
    true,
    204800, -- 200KB limit
    ARRAY['image/jpeg', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 204800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/jpg'];

-- 3. SET UP STORAGE POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for thumbnails" ON storage.objects;
DROP POLICY IF EXISTS "Allow upload for default user" ON storage.objects;
DROP POLICY IF EXISTS "Allow update for default user" ON storage.objects;
DROP POLICY IF EXISTS "Allow delete for default user" ON storage.objects;

-- Policy 1: Public read access to thumbnails
CREATE POLICY "Public read access for thumbnails" ON storage.objects
    FOR SELECT 
    USING (bucket_id = 'project-thumbnails');

-- Policy 2: Allow upload for default user (no auth system)
CREATE POLICY "Allow upload for default user" ON storage.objects
    FOR INSERT 
    WITH CHECK (bucket_id = 'project-thumbnails');

-- Policy 3: Allow update for default user
CREATE POLICY "Allow update for default user" ON storage.objects
    FOR UPDATE 
    USING (bucket_id = 'project-thumbnails');

-- Policy 4: Allow delete for default user
CREATE POLICY "Allow delete for default user" ON storage.objects
    FOR DELETE 
    USING (bucket_id = 'project-thumbnails');

-- 4. VERIFICATION AND STATUS CHECK
-- =====================================================

DO $$
DECLARE
    thumbnail_url_exists BOOLEAN;
    thumbnail_updated_at_exists BOOLEAN;
    index_exists BOOLEAN;
    bucket_exists BOOLEAN;
    policy_count INTEGER;
BEGIN
    -- Check columns
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' 
        AND column_name = 'thumbnail_url'
        AND table_schema = 'public'
    ) INTO thumbnail_url_exists;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' 
        AND column_name = 'thumbnail_updated_at'
        AND table_schema = 'public'
    ) INTO thumbnail_updated_at_exists;
    
    -- Check index
    SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'projects' 
        AND indexname = 'idx_projects_thumb_updated'
        AND schemaname = 'public'
    ) INTO index_exists;
    
    -- Check bucket
    SELECT EXISTS (
        SELECT 1 FROM storage.buckets 
        WHERE id = 'project-thumbnails'
    ) INTO bucket_exists;
    
    -- Check policies
    SELECT COUNT(*) FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname LIKE '%thumbnails%' OR policyname LIKE '%default user%'
    INTO policy_count;
    
    -- Report status
    RAISE NOTICE '';
    RAISE NOTICE '🔍 THUMBNAIL SETUP VERIFICATION:';
    RAISE NOTICE '================================';
    RAISE NOTICE '📊 Database Schema:';
    RAISE NOTICE '  ✓ thumbnail_url column: %', CASE WHEN thumbnail_url_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE '  ✓ thumbnail_updated_at column: %', CASE WHEN thumbnail_updated_at_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE '  ✓ Performance index: %', CASE WHEN index_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE '';
    RAISE NOTICE '🗄️ Storage Setup:';
    RAISE NOTICE '  ✓ project-thumbnails bucket: %', CASE WHEN bucket_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
    RAISE NOTICE '  ✓ Storage policies: % policies configured', policy_count;
    RAISE NOTICE '';
    
    IF thumbnail_url_exists AND thumbnail_updated_at_exists AND index_exists AND bucket_exists AND policy_count >= 4 THEN
        RAISE NOTICE '🎉 SUCCESS: All thumbnail functionality is properly configured!';
        RAISE NOTICE '';
        RAISE NOTICE '📋 NEXT STEPS:';
        RAISE NOTICE '1. Test thumbnail generation at: /test-thumbnails';
        RAISE NOTICE '2. Create a project and add canvas objects';
        RAISE NOTICE '3. Verify thumbnails appear on project cards';
        RAISE NOTICE '4. Check browser console for any errors';
    ELSE
        RAISE WARNING '⚠️ INCOMPLETE: Some components are missing. Please review the setup.';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔗 THUMBNAIL URL PATTERN:';
    RAISE NOTICE 'https://your-project.supabase.co/storage/v1/object/public/project-thumbnails/{project-id}.jpg';
    RAISE NOTICE '';
END $$;

-- 5. SAMPLE DATA FOR TESTING (OPTIONAL)
-- =====================================================

-- Uncomment the following section if you want to add sample data for testing

/*
-- Create a test project with thumbnail
INSERT INTO public.projects (
    id,
    name,
    description,
    thumbnail_url,
    thumbnail_updated_at,
    user_id,
    session_id
) VALUES (
    gen_random_uuid(),
    'Sample Project with Thumbnail',
    'This is a test project to verify thumbnail functionality',
    'https://via.placeholder.com/300x200/4F46E5/FFFFFF?text=Sample+Thumbnail',
    now(),
    'default-user',
    'sample-session-' || extract(epoch from now())
) ON CONFLICT DO NOTHING;

RAISE NOTICE '📝 Added sample project for testing (if it did not already exist)';
*/

-- 6. CLEANUP FUNCTION (FOR DEVELOPMENT)
-- =====================================================

-- Uncomment and run this function if you need to clean up test data
/*
CREATE OR REPLACE FUNCTION cleanup_thumbnail_test_data()
RETURNS void AS $$
BEGIN
    -- Delete test thumbnails from storage
    DELETE FROM storage.objects 
    WHERE bucket_id = 'project-thumbnails' 
    AND name LIKE 'test-%';
    
    -- Delete test projects
    DELETE FROM public.projects 
    WHERE name LIKE '%test%' OR name LIKE '%sample%';
    
    RAISE NOTICE '🧹 Cleaned up test data';
END;
$$ LANGUAGE plpgsql;

-- To run cleanup: SELECT cleanup_thumbnail_test_data();
*/
