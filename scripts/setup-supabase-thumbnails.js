// =====================================================
// SUPABASE THUMBNAIL SETUP SCRIPT (JavaScript)
// =====================================================
// Alternative to SQL script - run this with Node.js
// Usage: node scripts/setup-supabase-thumbnails.js
// =====================================================

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Need service role key for admin operations
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is required');
  process.exit(1);
}

// Use service role key if available, otherwise anon key
const supabaseKey = supabaseServiceKey || supabaseAnonKey;
if (!supabaseKey) {
  console.error('❌ Either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupThumbnailStorage() {
  console.log('🚀 Setting up Supabase thumbnail functionality...\n');

  try {
    // 1. Create storage bucket
    console.log('📦 Creating storage bucket...');
    const { data: bucket, error: bucketError } = await supabase.storage
      .createBucket('project-thumbnails', {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/jpg'],
        fileSizeLimit: 200 * 1024, // 200KB
      });

    if (bucketError) {
      if (bucketError.message.includes('already exists')) {
        console.log('✅ Bucket already exists');
      } else {
        console.error('❌ Error creating bucket:', bucketError.message);
        return false;
      }
    } else {
      console.log('✅ Bucket created successfully');
    }

    // 2. Test bucket access
    console.log('\n🧪 Testing bucket access...');
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ Error listing buckets:', listError.message);
      return false;
    }

    const thumbnailBucket = buckets.find(b => b.id === 'project-thumbnails');
    if (thumbnailBucket) {
      console.log('✅ Bucket is accessible');
      console.log(`   - Public: ${thumbnailBucket.public}`);
      console.log(`   - File size limit: ${thumbnailBucket.file_size_limit} bytes`);
    } else {
      console.error('❌ Bucket not found in list');
      return false;
    }

    // 3. Test upload/download
    console.log('\n📤 Testing upload/download...');
    
    // Create a minimal test image (1x1 pixel JPEG)
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

    const testFileName = `test-${Date.now()}.jpg`;
    
    // Upload test file
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project-thumbnails')
      .upload(testFileName, testImageData, {
        contentType: 'image/jpeg',
      });

    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError.message);
      return false;
    }

    console.log('✅ Upload test successful');

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('project-thumbnails')
      .getPublicUrl(testFileName);

    console.log('✅ Public URL generated:', urlData.publicUrl);

    // Clean up test file
    const { error: deleteError } = await supabase.storage
      .from('project-thumbnails')
      .remove([testFileName]);

    if (deleteError) {
      console.warn('⚠️ Failed to clean up test file:', deleteError.message);
    } else {
      console.log('✅ Test file cleaned up');
    }

    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

async function verifyDatabaseSchema() {
  console.log('\n🔍 Verifying database schema...');

  try {
    // Check if projects table has thumbnail columns
    const { data, error } = await supabase
      .from('projects')
      .select('thumbnail_url, thumbnail_updated_at')
      .limit(1);

    if (error) {
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.error('❌ Thumbnail columns missing from projects table');
        console.log('📝 Please run the SQL migration script first:');
        console.log('   scripts/supabase-thumbnail-setup.sql');
        return false;
      } else {
        console.error('❌ Database error:', error.message);
        return false;
      }
    }

    console.log('✅ Database schema is ready');
    return true;

  } catch (error) {
    console.error('❌ Error checking database schema:', error.message);
    return false;
  }
}

async function main() {
  console.log('🎯 SUPABASE THUMBNAIL SETUP');
  console.log('============================\n');

  // Check database schema first
  const schemaReady = await verifyDatabaseSchema();
  if (!schemaReady) {
    console.log('\n❌ Setup incomplete - database schema needs to be updated');
    process.exit(1);
  }

  // Set up storage
  const storageReady = await setupThumbnailStorage();
  if (!storageReady) {
    console.log('\n❌ Setup incomplete - storage setup failed');
    process.exit(1);
  }

  console.log('\n🎉 SUCCESS: Thumbnail functionality is ready!');
  console.log('\n📋 NEXT STEPS:');
  console.log('1. Test at: http://localhost:3000/test-thumbnails');
  console.log('2. Create a project and add canvas objects');
  console.log('3. Verify thumbnails appear on project cards');
  console.log('4. Check browser console for any errors');
  
  console.log('\n🔗 THUMBNAIL URL PATTERN:');
  console.log(`${supabaseUrl}/storage/v1/object/public/project-thumbnails/{project-id}.jpg`);
}

// Run the setup
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  });
}

module.exports = { setupThumbnailStorage, verifyDatabaseSchema };
