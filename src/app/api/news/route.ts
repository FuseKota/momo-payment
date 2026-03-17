import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get('limit') ?? '20', 10);
  const slug = searchParams.get('slug');

  const supabase = getSupabaseAdmin();

  try {
    if (slug) {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();

      if (error) {
        return NextResponse.json({ error: 'News not found' }, { status: 404 });
      }

      return NextResponse.json(data);
    }

    const { data, error } = await supabase
      .from('news')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
