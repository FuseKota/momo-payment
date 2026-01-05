import { getSupabaseAdmin } from '@/lib/supabase/admin';

const BUCKET_NAME = 'product-images';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export async function uploadProductImage(
  file: File,
  productSlug: string
): Promise<UploadResult> {
  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      success: false,
      error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`,
    };
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  const supabase = getSupabaseAdmin();

  // Generate unique filename
  const ext = file.name.split('.').pop() || 'jpg';
  const timestamp = Date.now();
  const path = `${productSlug}/${timestamp}.${ext}`;

  // Convert File to ArrayBuffer then to Uint8Array for upload
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, uint8Array, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('Upload error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return {
      success: true,
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: 'Failed to upload image',
    };
  }
}

export async function deleteProductImage(path: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();

  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Delete error:', error);
    return false;
  }
}

export async function listProductImages(productSlug: string): Promise<string[]> {
  const supabase = getSupabaseAdmin();

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(productSlug);

    if (error) {
      console.error('List error:', error);
      return [];
    }

    return data
      .filter((file) => file.name !== '.emptyFolderPlaceholder')
      .map((file) => {
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(`${productSlug}/${file.name}`);
        return urlData.publicUrl;
      });
  } catch (error) {
    console.error('List error:', error);
    return [];
  }
}
