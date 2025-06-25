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
 * 
 * Enhanced to handle ML-generated image URLs and ensure persistence
 */
export async function uploadImageFromUrl(
  projectId: string,
  imageUrl: string,
  filename?: string
): Promise<ImageUploadResult> {
  try {
    console.log('[SupabaseStorage] 🔍 Preparing to download image from URL:', imageUrl);

    // Handle proxied URLs before downloading
    let finalImageUrl = imageUrl;
    if (imageUrl.startsWith('/api/proxy-image')) {
      const originalUrl = decodeURIComponent(imageUrl.split('?url=')[1] || '');
      if (originalUrl) {
        console.log('[SupabaseStorage] 🔄 Converting proxied URL back to original:', originalUrl);
        finalImageUrl = originalUrl;
      }
    }

    console.log('[SupabaseStorage] 📥 Downloading image from URL:', finalImageUrl);

    // Add fetch options to handle CORS and referrer policies
    const fetchOptions: RequestInit = {
      method: 'GET',
      headers: {
        'Accept': 'image/*',
      },
      mode: 'cors',
      referrerPolicy: 'no-referrer',
    };

    // Download the image with retry logic
    let response;
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        response = await fetch(finalImageUrl, fetchOptions);
        if (response.ok) break;
        
        // If response is not ok, wait and retry
        retries++;
        console.log(`[SupabaseStorage] ⚠️ Retry ${retries}/${maxRetries}: Failed to download image (status ${response.status})`);
        await new Promise(resolve => setTimeout(resolve, 1000 * retries)); // Exponential backoff
      } catch (fetchError) {
        // If fetch throws an error, retry
        retries++;
        console.log(`[SupabaseStorage] ⚠️ Retry ${retries}/${maxRetries}: Fetch error:`, fetchError);
        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
      }
    }

    // Final check if we have a valid response
    if (!response || !response.ok) {
      throw new Error(`Failed to download image after ${maxRetries} attempts: ${response?.status || 'Network error'}`);
    }

    const blob = await response.blob();
    if (blob.size === 0) {
      throw new Error('Downloaded image has zero size');
    }
    
    console.log(`[SupabaseStorage] ✅ Image downloaded successfully: ${(blob.size / 1024).toFixed(2)} KB`);
    
    // Extract extension from content-type or URL
    let extension = 'jpg';
    const contentType = response.headers.get('content-type');
    if (contentType) {
      if (contentType.includes('png')) extension = 'png';
      else if (contentType.includes('gif')) extension = 'gif';
      else if (contentType.includes('webp')) extension = 'webp';
      else if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = 'jpg';
    } else {
      // Try to extract from URL
      const urlParts = finalImageUrl.split('.');
      const urlExtension = urlParts.length > 1 ? urlParts[urlParts.length - 1].split('?')[0].toLowerCase() : '';
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(urlExtension)) {
        extension = urlExtension === 'jpeg' ? 'jpg' : urlExtension;
      }
    }
    
    const finalFilename = filename || `${projectId}/${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${extension}`;
    console.log('[SupabaseStorage] 📂 Using filename:', finalFilename);

    return await uploadImageToStorage(projectId, blob, finalFilename);

  } catch (error) {
    console.error('[SupabaseStorage] 💥 Error uploading from URL:', error);
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