import { supabase } from '@/lib/supabase';

export interface ImageUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Ensure the project-images bucket exists
 */
export async function ensureStorageBucket(): Promise<boolean> {
  try {
    console.log('[SupabaseStorage] Checking if project-images bucket exists...');

    // List buckets to check if project-images exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('[SupabaseStorage] Error listing buckets:', listError);
      return false;
    }

    const bucketExists = buckets?.find((bucket: { name: string }) => bucket.name === 'project-images');
    
    if (bucketExists) {
      console.log('[SupabaseStorage] project-images bucket already exists');
      return true;
    }

    console.log('[SupabaseStorage] Creating project-images bucket...');
    
    // Create the bucket if it doesn't exist
    const { error: createError } = await supabase.storage.createBucket('project-images', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      fileSizeLimit: 10485760, // 10MB
    });

    if (createError) {
      console.error('[SupabaseStorage] Error creating bucket:', createError);
      return false;
    }

    console.log('[SupabaseStorage] project-images bucket created successfully');
    return true;

  } catch (error) {
    console.error('[SupabaseStorage] Unexpected error ensuring bucket:', error);
    return false;
  }
}

/**
 * Upload an image to Supabase Storage
 */
export async function uploadImageToStorage(
  projectId: string,
  imageFile: File | Blob,
  filename?: string
): Promise<ImageUploadResult> {
  try {
    // Ensure bucket exists first
    const bucketReady = await ensureStorageBucket();
    if (!bucketReady) {
      return {
        success: false,
        error: 'Storage bucket not available',
      };
    }

    // Generate filename if not provided
    const finalFilename = filename || `${projectId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.jpg`;

    console.log('[SupabaseStorage] Uploading image:', {
      projectId,
      filename: finalFilename,
      size: imageFile.size,
      type: imageFile.type,
    });

    // Upload to the 'project-images' bucket
    const { data, error } = await supabase.storage
      .from('project-images')
      .upload(finalFilename, imageFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('[SupabaseStorage] Upload error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('project-images')
      .getPublicUrl(data.path);

    console.log('[SupabaseStorage] Upload successful:', {
      path: data.path,
      url: publicUrl,
    });

    return {
      success: true,
      url: publicUrl,
    };

  } catch (error) {
    console.error('[SupabaseStorage] Unexpected error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Upload image from URL to Supabase Storage
 * Downloads the image and uploads it to the project's storage bucket
 * TODO: Future enhancement - implement image optimization:
 * - Resize images based on maxWidth/maxHeight
 * - Convert to WebP format for better compression  
 * - Generate multiple sizes for responsive loading
 * - Add progressive JPEG support
 */
export async function uploadImageFromUrl(
  projectId: string,
  imageUrl: string,
  filename?: string
): Promise<ImageUploadResult> {
  try {
    console.log('[SupabaseStorage] Downloading image from URL:', imageUrl);

    // Download the image
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.status}`);
    }

    const blob = await response.blob();
    
    // Extract extension from URL or use default
    const urlParts = imageUrl.split('.');
    const extension = urlParts.length > 1 ? urlParts[urlParts.length - 1].split('?')[0] : 'jpg';
    
    const finalFilename = filename || `${projectId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${extension}`;

    return await uploadImageToStorage(projectId, blob, finalFilename);

  } catch (error) {
    console.error('[SupabaseStorage] Error uploading from URL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Delete an image from Supabase Storage
 */
export async function deleteImageFromStorage(imagePath: string): Promise<boolean> {
  try {
    console.log('[SupabaseStorage] Deleting image:', imagePath);

    const { error } = await supabase.storage
      .from('project-images')
      .remove([imagePath]);

    if (error) {
      console.error('[SupabaseStorage] Delete error:', error);
      return false;
    }

    console.log('[SupabaseStorage] Image deleted successfully');
    return true;

  } catch (error) {
    console.error('[SupabaseStorage] Unexpected delete error:', error);
    return false;
  }
}

/**
 * Extract the storage path from a Supabase Storage URL
 */
export function extractStoragePathFromUrl(url: string): string | null {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return null;

    const storagePath = `/storage/v1/object/public/project-images/`;
    const index = url.indexOf(storagePath);
    
    if (index === -1) return null;
    
    return url.substring(index + storagePath.length);
  } catch (error) {
    console.error('[SupabaseStorage] Error extracting path:', error);
    return null;
  }
}

/**
 * Check if a URL is a Supabase Storage URL
 */
export function isSupabaseStorageUrl(url: string): boolean {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return supabaseUrl ? url.includes(`${supabaseUrl}/storage/v1/object/public/`) : false;
} 