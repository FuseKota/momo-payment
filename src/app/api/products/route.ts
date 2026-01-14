import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get('kind');
  const slug = searchParams.get('slug');
  const mode = searchParams.get('mode'); // 'pickup' | 'shipping'

  const supabase = getSupabaseAdmin();

  try {
    if (slug) {
      // Get single product by slug with variants
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          variants:product_variants(
            id,
            product_id,
            size,
            price_yen,
            stock_qty,
            is_active,
            sort_order,
            created_at,
            updated_at
          )
        `)
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (error) {
        return NextResponse.json({ error: 'Product not found' }, { status: 404 });
      }

      // Filter and sort active variants
      if (data.variants) {
        data.variants = data.variants
          .filter((v: { is_active: boolean }) => v.is_active)
          .sort((a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order);
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

    // Filter by delivery mode
    if (mode === 'pickup') {
      query = query.eq('can_pickup', true);
    } else if (mode === 'shipping') {
      query = query.eq('can_ship', true);
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
