import { NextRequest, NextResponse } from 'next/server';
import { uploadProductImage, deleteProductImage } from '@/lib/storage/upload';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';
import { requireAdmin } from '@/lib/auth/require-admin';
import { checkAdminRateLimit, getClientIP } from '@/lib/security/rate-limit';

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const rateLimit = checkAdminRateLimit(getClientIP(request));
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'rate_limit_exceeded' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.resetIn) } }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const productSlug = formData.get('productSlug') as string | null;
    const productId = formData.get('productId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!productSlug) {
      return NextResponse.json(
        { error: 'Product slug is required' },
        { status: 400 }
      );
    }

    const result = await uploadProductImage(file, productSlug);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Update product with image URL if productId is provided
    if (productId && result.url) {
      const supabase = getSupabaseAdmin();
      await supabase
        .from('products')
        .update({ image_url: result.url })
        .eq('id', productId);
    }

    return NextResponse.json({
      success: true,
      url: result.url,
      path: result.path,
    });
  } catch (error) {
    secureLog('error', 'Upload API error', safeErrorLog(error));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const rateLimitDel = checkAdminRateLimit(getClientIP(request));
  if (!rateLimitDel.allowed) {
    return NextResponse.json(
      { error: 'rate_limit_exceeded' },
      { status: 429, headers: { 'Retry-After': String(rateLimitDel.resetIn) } }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        { error: 'Path is required' },
        { status: 400 }
      );
    }

    const success = await deleteProductImage(path);

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to delete image' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    secureLog('error', 'Delete API error', safeErrorLog(error));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
