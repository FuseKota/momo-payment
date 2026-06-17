import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { adminWriteGuard } from '@/lib/api/admin-guards';
import { uuidSchema, adminNewsUpdateSchema, formatValidationErrors } from '@/lib/validation/schemas';
import { writeAuditLog } from '@/lib/logging/audit-log';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await adminWriteGuard(request);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const idParse = uuidSchema.safeParse(id);
  if (!idParse.success) {
    return NextResponse.json({ error: 'Invalid news ID' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  let rawBody;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parseResult = adminNewsUpdateSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'validation_error', details: formatValidationErrors(parseResult.error) },
      { status: 400 }
    );
  }

  const body = parseResult.data;
  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.content !== undefined) updates.content = body.content;
  if (body.excerpt !== undefined) updates.excerpt = body.excerpt;
  if (body.category !== undefined) updates.category = body.category;
  if (body.slug !== undefined) updates.slug = body.slug;
  if (body.title_zh_tw !== undefined) updates.title_zh_tw = body.title_zh_tw;
  if (body.excerpt_zh_tw !== undefined) updates.excerpt_zh_tw = body.excerpt_zh_tw;
  if (body.content_zh_tw !== undefined) updates.content_zh_tw = body.content_zh_tw;
  if (body.title_en !== undefined) updates.title_en = body.title_en;
  if (body.excerpt_en !== undefined) updates.excerpt_en = body.excerpt_en;
  if (body.content_en !== undefined) updates.content_en = body.content_en;
  if (body.is_published !== undefined) {
    updates.is_published = body.is_published;
    if (body.is_published && !body.published_at) {
      updates.published_at = new Date().toISOString();
    } else {
      updates.published_at = body.published_at || null;
    }
  }

  try {
    const { data, error } = await supabase
      .from('news')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    await writeAuditLog({
      request,
      actorId: guard.userId,
      action: 'news.update',
      targetType: 'news',
      targetId: id,
      metadata: { changedKeys: Object.keys(body) },
    });

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = await adminWriteGuard(request);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const idParse = uuidSchema.safeParse(id);
  if (!idParse.success) {
    return NextResponse.json({ error: 'Invalid news ID' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  try {
    const { error } = await supabase.from('news').delete().eq('id', id);

    if (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    await writeAuditLog({
      request,
      actorId: guard.userId,
      action: 'news.delete',
      targetType: 'news',
      targetId: id,
      metadata: {},
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
