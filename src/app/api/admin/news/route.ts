import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';
import { adminWriteGuard } from '@/lib/api/admin-guards';

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
      return NextResponse.json({ error: error.message }, { status: 500 });
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
  const body = await request.json();

  const { title, content, excerpt, category, slug, is_published, published_at } = body;

  if (!title || !slug) {
    return NextResponse.json({ error: 'title と slug は必須です' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('news')
      .insert({
        title,
        content: content || null,
        excerpt: excerpt || null,
        category: category || '福島もも娘',
        slug,
        is_published: is_published ?? false,
        published_at: is_published ? (published_at || new Date().toISOString()) : null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'このスラッグはすでに使われています' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
