// Script to set up Supabase Storage bucket for thumbnails
// Run this script to create the necessary storage bucket and policies

import { supabase } from '@/lib/supabase';

async function setupThumbnailStorage() {
  console.log('Setting up thumbnail storage bucket...');

  try {
    // Create the project-thumbnails bucket
    const { data: bucket, error: bucketError } = await supabase.storage
      .createBucket('project-thumbnails', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/jpg'],
        fileSizeLimit: 200 * 1024, // 200KB limit
      });

    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('✅ Bucket already exists');
      } else {
        console.error('❌ Error creating bucket:', bucketError);
        return false;
      }
    } else {
      console.log('✅ Bucket created successfully:', bucket);
    }

    // Set up bucket policies for public read access
    console.log('Setting up bucket policies...');

    // Note: Bucket policies are typically set up through the Supabase dashboard
    // or through SQL commands. The following is for reference:
    
    /*
    -- Allow public read access to thumbnails
    CREATE POLICY "Public read access for thumbnails" ON storage.objects
      FOR SELECT USING (bucket_id = 'project-thumbnails');

    -- Allow authenticated users to upload thumbnails
    CREATE POLICY "Allow upload for authenticated users" ON storage.objects
      FOR INSERT WITH CHECK (
        bucket_id = 'project-thumbnails' AND
        auth.role() = 'authenticated'
      );

    -- Allow users to update their own thumbnails
    CREATE POLICY "Allow update for own thumbnails" ON storage.objects
      FOR UPDATE USING (
        bucket_id = 'project-thumbnails' AND
        auth.role() = 'authenticated'
      );

    -- Allow users to delete their own thumbnails
    CREATE POLICY "Allow delete for own thumbnails" ON storage.objects
      FOR DELETE USING (
        bucket_id = 'project-thumbnails' AND
        auth.role() = 'authenticated'
      );
    */

    console.log('✅ Thumbnail storage setup complete!');
    console.log('📝 Note: You may need to set up additional bucket policies through the Supabase dashboard');
    console.log('📝 Bucket URL pattern: https://your-project.supabase.co/storage/v1/object/public/project-thumbnails/{projectId}.jpg');

    return true;

  } catch (error) {
    console.error('❌ Error setting up thumbnail storage:', error);
    return false;
  }
}

// Test thumbnail upload/download
async function testThumbnailStorage() {
  console.log('Testing thumbnail storage...');

  try {
    // Create a test image blob (1x1 pixel JPEG)
    const testImageData = new Uint8Array([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
      0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
      0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
      0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
      0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
      0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x8A, 0x00,
      0xFF, 0xD9
    ]);

    const testFileName = 'test-thumbnail.jpg';
    const testFilePath = `project-thumbnails/${testFileName}`;

    // Upload test file
    console.log('Uploading test thumbnail...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project-thumbnails')
      .upload(testFilePath, testImageData, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError);
      return false;
    }

    console.log('✅ Upload test successful:', uploadData);

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('project-thumbnails')
      .getPublicUrl(testFilePath);

    console.log('✅ Public URL generated:', urlData.publicUrl);

    // Clean up test file
    console.log('Cleaning up test file...');
    const { error: deleteError } = await supabase.storage
      .from('project-thumbnails')
      .remove([testFilePath]);

    if (deleteError) {
      console.warn('⚠️ Failed to clean up test file:', deleteError);
    } else {
      console.log('✅ Test file cleaned up');
    }

    return true;

  } catch (error) {
    console.error('❌ Error testing thumbnail storage:', error);
    return false;
  }
}

// Main function
async function main() {
  console.log('🚀 Starting thumbnail storage setup...\n');

  const setupSuccess = await setupThumbnailStorage();
  if (!setupSuccess) {
    console.log('❌ Setup failed');
    process.exit(1);
  }

  console.log('\n🧪 Running storage tests...\n');

  const testSuccess = await testThumbnailStorage();
  if (!testSuccess) {
    console.log('❌ Tests failed');
    process.exit(1);
  }

  console.log('\n🎉 Thumbnail storage setup and testing complete!');
  console.log('\n📋 Next steps:');
  console.log('1. Verify bucket policies in Supabase dashboard');
  console.log('2. Test thumbnail generation in the playground');
  console.log('3. Check project cards display thumbnails correctly');
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { setupThumbnailStorage, testThumbnailStorage };
