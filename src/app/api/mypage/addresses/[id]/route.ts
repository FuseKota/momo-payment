import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireCustomer } from '@/lib/auth/require-customer';
import { uuidSchema, savedAddressSchema, formatValidationErrors } from '@/lib/validation/schemas';
import { validateOrigin } from '@/lib/security/csrf';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await requireCustomer();
  if (!auth.authorized) return auth.response;

  const originCheck = validateOrigin(request);
  if (!originCheck.valid) {
    return NextResponse.json({ error: 'invalid_origin' }, { status: 403 });
  }

  const { id } = await params;
  const idParse = uuidSchema.safeParse(id);
  if (!idParse.success) {
    return NextResponse.json({ error: 'Invalid address ID' }, { status: 400 });
  }

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

    let rawBody;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parseResult = savedAddressSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'validation_error', details: formatValidationErrors(parseResult.error) },
        { status: 400 }
      );
    }

    const body = parseResult.data;

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

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireCustomer();
  if (!auth.authorized) return auth.response;

  const originCheck = validateOrigin(_request);
  if (!originCheck.valid) {
    return NextResponse.json({ error: 'invalid_origin' }, { status: 403 });
  }

  const { id } = await params;
  const idParse = uuidSchema.safeParse(id);
  if (!idParse.success) {
    return NextResponse.json({ error: 'Invalid address ID' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  try {
    const { error } = await supabase
      .from('customer_addresses')
      .delete()
      .eq('id', id)
      .eq('user_id', auth.userId);

    if (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
