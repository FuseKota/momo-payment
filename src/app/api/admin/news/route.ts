import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';
import { adminWriteGuard } from '@/lib/api/admin-guards';
import { adminNewsCreateSchema, formatValidationErrors } from '@/lib/validation/schemas';
import { writeAuditLog } from '@/lib/logging/audit-log';

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const supabase = getSupabaseAdmin();

  try {
    const { data, error } = await supabase
      .from('news')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const guard = await adminWriteGuard(request);
  if (!guard.ok) return guard.response;

  const supabase = getSupabaseAdmin();

  let rawBody;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parseResult = adminNewsCreateSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'validation_error', details: formatValidationErrors(parseResult.error) },
      { status: 400 }
    );
  }

  const {
    title,
    content,
    excerpt,
    category,
    slug,
    image_url,
    is_published,
    published_at,
    title_zh_tw,
    excerpt_zh_tw,
    content_zh_tw,
    title_en,
    excerpt_en,
    content_en,
  } = parseResult.data;

  try {
    const { data, error } = await supabase
      .from('news')
      .insert({
        title,
        content: content || null,
        excerpt: excerpt || null,
        category: category || '福島もも娘',
        slug,
        image_url: image_url || null,
        title_zh_tw: title_zh_tw || null,
        excerpt_zh_tw: excerpt_zh_tw || null,
        content_zh_tw: content_zh_tw || null,
        title_en: title_en || null,
        excerpt_en: excerpt_en || null,
        content_en: content_en || null,
        is_published: is_published ?? false,
        published_at: is_published ? (published_at || new Date().toISOString()) : null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'このスラッグはすでに使われています' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    await writeAuditLog({
      request,
      actorId: guard.userId,
      action: 'news.create',
      targetType: 'news',
      targetId: data.id,
      metadata: { slug: data.slug, category: data.category },
    });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
