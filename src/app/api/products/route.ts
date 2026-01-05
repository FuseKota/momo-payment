import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get('kind');
  const slug = searchParams.get('slug');

  const supabase = getSupabaseAdmin();

  try {
    if (slug) {
      // Get single product by slug
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (error) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      return NextResponse.json(data);
    }

    // Get products list
    let query = supabase
      .from('products')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (kind) {
      query = query.eq('kind', kind);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
