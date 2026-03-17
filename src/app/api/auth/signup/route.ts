import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';

/**
 * POST /api/auth/signup
 * サインアップ後のプロフィール・住所保存（service_role 経由）
 *
 * Body: { name, phone, address? }
 * userId はセッションから取得（クライアントから受け取らない）
 */
export async function POST(request: Request) {
  try {
    // セッションから userId を取得（ボディの userId は信頼しない）
    const supabaseClient = await createClient();
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, phone, address } = body;

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // customer_profiles に INSERT
    const { error: profileError } = await supabase
      .from('customer_profiles')
      .insert({
        user_id: user.id,
        display_name: name,
        phone: phone || null,
      });

    if (profileError) {
      secureLog('error', 'Profile insert error', safeErrorLog(profileError));
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
          user_id: user.id,
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
        secureLog('error', 'Address insert error', safeErrorLog(addressError));
        return NextResponse.json({ error: 'address_save_failed' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    secureLog('error', 'Signup API error', safeErrorLog(error));
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
