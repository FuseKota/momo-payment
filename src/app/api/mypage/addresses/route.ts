import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireCustomer } from '@/lib/auth/require-customer';
import { savedAddressSchema, formatValidationErrors } from '@/lib/validation/schemas';
import { validateOrigin } from '@/lib/security/csrf';

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

  const originCheck = validateOrigin(request);
  if (!originCheck.valid) {
    return NextResponse.json({ error: 'invalid_origin' }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();

  try {
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
