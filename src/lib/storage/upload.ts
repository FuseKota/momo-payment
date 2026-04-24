import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';
import crypto from 'crypto';

const BUCKET_NAME = 'product-images';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'gif'] as const;

type AllowedMime = (typeof ALLOWED_TYPES)[number];

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

/**
 * ファイル先頭の magic byte を確認して MIME を検証
 * file.type はクライアント申告値で偽装可能なため、これを補完する
 */
function detectImageMime(buffer: Uint8Array): AllowedMime | null {
  // JPEG: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  // GIF: 47 49 46 38 (37 or 39) 61
  if (
    buffer.length >= 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return 'image/gif';
  }
  // WEBP: 52 49 46 46 .. .. .. .. 57 45 42 50
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

function mimeToExt(mime: AllowedMime): string {
  switch (mime) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
  }
}

export async function uploadProductImage(
  file: File,
  productSlug: string
): Promise<UploadResult> {
  // 申告 MIME チェック（第1段）
  if (!ALLOWED_TYPES.includes(file.type as AllowedMime)) {
    return {
      success: false,
      error: `Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`,
    };
  }

  // サイズチェック
  if (file.size > MAX_FILE_SIZE) {
    return {
      success: false,
      error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }

  // productSlug 形式検証（パストラバーサル防止の多層防御）
  if (!/^[a-z0-9-]+$/.test(productSlug)) {
    return {
      success: false,
      error: 'Invalid product slug',
    };
  }

  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  // magic byte による第2段検証（申告値と実体の一致を確認）
  const detectedMime = detectImageMime(uint8Array);
  if (!detectedMime) {
    return {
      success: false,
      error: 'File content does not match any allowed image format',
    };
  }
  if (detectedMime !== file.type) {
    return {
      success: false,
      error: `MIME type mismatch: declared ${file.type}, detected ${detectedMime}`,
    };
  }

  const supabase = getSupabaseAdmin();

  // 推測不能なファイル名を生成（衝突回避 + 情報非開示）
  const ext = mimeToExt(detectedMime);
  const filename = `${crypto.randomUUID()}.${ext}`;
  const path = `${productSlug}/${filename}`;

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(path, uint8Array, {
        contentType: detectedMime,
        upsert: false,
      });

    if (error) {
      secureLog('error', 'Storage upload error', safeErrorLog(error));
      return {
        success: false,
        error: 'Upload failed',
      };
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    return {
      success: true,
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (error) {
    secureLog('error', 'Storage upload exception', safeErrorLog(error));
    return {
      success: false,
      error: 'Failed to upload image',
    };
  }
}

export async function deleteProductImage(path: string): Promise<boolean> {
  // パス検証（トラバーサル防止）
  if (path.includes('..') || path.startsWith('/') || !path.includes('/')) {
    secureLog('warn', 'Invalid delete path', { path });
    return false;
  }

  const supabase = getSupabaseAdmin();

  try {
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (error) {
      secureLog('error', 'Storage delete error', safeErrorLog(error));
      return false;
    }

    return true;
  } catch (error) {
    secureLog('error', 'Storage delete exception', safeErrorLog(error));
    return false;
  }
}

export async function listProductImages(productSlug: string): Promise<string[]> {
  if (!/^[a-z0-9-]+$/.test(productSlug)) {
    return [];
  }

  const supabase = getSupabaseAdmin();

  try {
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .list(productSlug);

    if (error) {
      secureLog('error', 'Storage list error', safeErrorLog(error));
      return [];
    }

    const ALLOWED_EXT_SET: readonly string[] = ALLOWED_EXTENSIONS;
    return data
      .filter((file) => file.name !== '.emptyFolderPlaceholder')
      .filter((file) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        return ext ? ALLOWED_EXT_SET.includes(ext) : false;
      })
      .map((file) => {
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(`${productSlug}/${file.name}`);
        return urlData.publicUrl;
      });
  } catch (error) {
    secureLog('error', 'Storage list exception', safeErrorLog(error));
    return [];
  }
}
