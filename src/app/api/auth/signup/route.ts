import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';
import { nameSchema, phoneSchema, addressSchema } from '@/lib/validation/schemas';
import { validateOrigin } from '@/lib/security/csrf';
import { checkAuthRateLimit, getClientIP } from '@/lib/security/rate-limit';

/**
 * POST /api/auth/signup
 * 認証済みユーザーの customer_profiles / customer_addresses を冪等に初期化する。
 *
 * 新規登録時の住所はクライアントが supabase.auth.signUp() の user_metadata に格納する。
 * メール確認が有効な場合、サインアップ直後はセッションが無く本人を特定できないため、
 * ここで「初回セッション確立時（SIGNED_IN）」に metadata から
 * プロフィール＋デフォルト住所を作成する。冪等なので複数回呼ばれても安全。
 *
 * userId はセッションから取得（クライアントから受け取らない）。住所メタデータが無い
 * ユーザー（管理者・本機能以前の旧ユーザー等）は初期化対象外としてスキップする。
 */
export async function POST(request: Request) {
  try {
    // CSRF: Origin 検証
    const originCheck = validateOrigin(request);
    if (!originCheck.valid) {
      return NextResponse.json({ error: 'invalid_origin' }, { status: 403 });
    }

    // レート制限（認証系は厳しめ: 5 req/min/IP）
    const ip = getClientIP(request);
    const rateLimit = await checkAuthRateLimit(ip);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'rate_limit_exceeded', retryAfter: rateLimit.resetIn },
        { status: 429, headers: { 'Retry-After': String(rateLimit.resetIn) } }
      );
    }

    // セッションから userId を取得（ボディの userId は信頼しない）
    const supabaseClient = await createClient();
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    // サインアップ時に格納した metadata を取得。住所が無ければ初期化対象外。
    const metadata = (user.user_metadata ?? {}) as {
      display_name?: unknown;
      phone?: unknown;
      address?: unknown;
    };

    if (!metadata.address) {
      // 住所メタデータが無いユーザー（管理者・旧ユーザー等）はスキップ
      return NextResponse.json({ success: true, skipped: true });
    }

    const nameResult = nameSchema.safeParse(metadata.display_name);
    const name = nameResult.success ? nameResult.data : (user.email ?? '');

    const phoneResult = metadata.phone ? phoneSchema.safeParse(metadata.phone) : null;
    const phone = phoneResult?.success ? phoneResult.data : null;

    const addressResult = addressSchema.safeParse(metadata.address);
    if (!addressResult.success) {
      secureLog('warn', 'Signup ensure: invalid address metadata', { userId: user.id });
      return NextResponse.json({ error: 'invalid_address_metadata' }, { status: 400 });
    }
    const { postalCode, pref, city, address1, address2 } = addressResult.data;

    const supabase = getSupabaseAdmin();

    // customer_profiles を冪等に作成。
    // UNIQUE(user_id) 制約の重複(23505)＝過去に初期化済みとして扱い、住所の再作成も行わない
    // （ユーザーが意図的に住所を全削除したケースで復活させないため）。
    const { error: profileError } = await supabase
      .from('customer_profiles')
      .insert({
        user_id: user.id,
        display_name: name,
        phone,
      });

    if (profileError) {
      if (profileError.code === '23505') {
        return NextResponse.json({ success: true, alreadyInitialized: true });
      }
      secureLog('error', 'Profile insert error', safeErrorLog(profileError));
      return NextResponse.json({ error: 'profile_save_failed' }, { status: 500 });
    }

    // プロフィールを新規作成できた初回のみ、デフォルト住所を作成
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
      // プロフィールは作成済み。住所作成失敗はログのみ（致命的でない）
      secureLog('error', 'Address insert error', safeErrorLog(addressError));
      return NextResponse.json({ success: true, addressFailed: true });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    secureLog('error', 'Signup ensure API error', safeErrorLog(error));
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
