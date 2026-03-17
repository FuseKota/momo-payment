import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

/**
 * POST /api/auth/signup
 * サインアップ後のプロフィール・住所保存（service_role 経由）
 *
 * Body: { userId, name, phone, address? }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, name, phone, address } = body;

    if (!userId || !name) {
      return NextResponse.json({ error: 'userId and name are required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // customer_profiles に INSERT
    const { error: profileError } = await supabase
      .from('customer_profiles')
      .insert({
        user_id: userId,
        display_name: name,
        phone: phone || null,
      });

    if (profileError) {
      console.error('Profile insert error:', profileError);
      return NextResponse.json({ error: 'profile_save_failed' }, { status: 500 });
    }

    // 住所が指定されていれば customer_addresses に INSERT
    if (address) {
      const { postalCode, pref, city, address1, address2 } = address;

      if (!postalCode || !pref || !city || !address1) {
        return NextResponse.json({ error: 'address fields incomplete' }, { status: 400 });
      }

      const { error: addressError } = await supabase
        .from('customer_addresses')
        .insert({
          user_id: userId,
          label: '自宅',
          postal_code: postalCode,
          pref,
          city,
          address1,
          address2: address2 || null,
          recipient_name: name,
          recipient_phone: phone || '',
          is_default: true,
        });

      if (addressError) {
        console.error('Address insert error:', addressError);
        return NextResponse.json({ error: 'address_save_failed' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Signup API error:', error);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
