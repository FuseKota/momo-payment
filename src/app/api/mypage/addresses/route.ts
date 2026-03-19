import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireCustomer } from '@/lib/auth/require-customer';

export async function GET() {
  const auth = await requireCustomer();
  if (!auth.authorized) return auth.response;

  const supabase = getSupabaseAdmin();

  try {
    const { data, error } = await supabase
      .from('customer_addresses')
      .select('*')
      .eq('user_id', auth.userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireCustomer();
  if (!auth.authorized) return auth.response;

  const supabase = getSupabaseAdmin();

  try {
    const body = await request.json();

    // isDefault が true なら、既存のデフォルトを解除
    if (body.isDefault) {
      await supabase
        .from('customer_addresses')
        .update({ is_default: false })
        .eq('user_id', auth.userId)
        .eq('is_default', true);
    }

    const { data, error } = await supabase
      .from('customer_addresses')
      .insert({
        user_id: auth.userId,
        label: body.label || '',
        postal_code: body.postalCode,
        pref: body.pref,
        city: body.city,
        address1: body.address1,
        address2: body.address2 || null,
        recipient_name: body.recipientName,
        recipient_phone: body.recipientPhone,
        is_default: body.isDefault || false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
