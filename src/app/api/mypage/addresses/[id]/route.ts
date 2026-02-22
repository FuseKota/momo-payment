import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireCustomer } from '@/lib/auth/require-customer';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await requireCustomer();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  try {
    // 所有者チェック
    const { data: existing } = await supabase
      .from('customer_addresses')
      .select('id')
      .eq('id', id)
      .eq('user_id', auth.userId)
      .single();

    if (!existing) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

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
      .update({
        label: body.label,
        postal_code: body.postalCode,
        pref: body.pref,
        city: body.city,
        address1: body.address1,
        address2: body.address2 || null,
        recipient_name: body.recipientName,
        recipient_phone: body.recipientPhone,
        is_default: body.isDefault || false,
      })
      .eq('id', id)
      .eq('user_id', auth.userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireCustomer();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const supabase = getSupabaseAdmin();

  try {
    const { error } = await supabase
      .from('customer_addresses')
      .delete()
      .eq('id', id)
      .eq('user_id', auth.userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
