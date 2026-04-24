import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';
import { checkRateLimit, getClientIP } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

/**
 * タイミング攻撃耐性のある文字列比較
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  try {
    const clientIP = getClientIP(request);
    const rateLimit = await checkRateLimit(`order-lookup:${clientIP}`, 10, 60000);
    if (!rateLimit.allowed) {
      secureLog('warn', 'Order lookup rate limit exceeded', { ip: clientIP });
      return NextResponse.json(
        { ok: false, error: 'rate_limit_exceeded', retryAfter: rateLimit.resetIn },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.resetIn),
            'X-RateLimit-Remaining': '0',
          },
        }
      );
    }

    const { orderNo } = await params;

    if (!orderNo) {
      return NextResponse.json(
        { ok: false, error: 'order_no_required' },
        { status: 400 }
      );
    }

    // クエリ文字列から lookup_token を取得（ゲスト注文の閲覧認可用）
    const { searchParams } = new URL(request.url);
    const providedToken = searchParams.get('token');

    let currentUserId: string | null = null;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id ?? null;
    } catch {
      // ゲストアクセスは許容
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        order_no,
        order_type,
        status,
        payment_method,
        temp_zone,
        subtotal_yen,
        shipping_fee_yen,
        total_yen,
        customer_name,
        pickup_date,
        pickup_time,
        created_at,
        user_id,
        lookup_token,
        order_items (
          id,
          product_name,
          qty,
          unit_price_yen,
          line_total_yen
        )
      `)
      .eq('order_no', orderNo)
      .single();

    if (orderError || !order) {
      return NextResponse.json(
        { ok: false, error: 'order_not_found' },
        { status: 404 }
      );
    }

    // アクセス制御:
    // - ユーザー紐付き注文: ログイン済み本人のみ、または有効な lookup_token を提示
    // - ゲスト注文 (user_id=null): 有効な lookup_token が必須
    const tokenValid = !!(
      providedToken &&
      order.lookup_token &&
      timingSafeEqual(providedToken, order.lookup_token)
    );

    if (order.user_id !== null) {
      const isOwner = currentUserId && order.user_id === currentUserId;
      if (!isOwner && !tokenValid) {
        secureLog('warn', 'Order access denied: user mismatch and invalid token', { ip: clientIP });
        return NextResponse.json(
          { ok: false, error: 'order_not_found' },
          { status: 404 }
        );
      }
    } else {
      // ゲスト注文
      if (!tokenValid) {
        secureLog('warn', 'Guest order access denied: invalid token', { ip: clientIP });
        return NextResponse.json(
          { ok: false, error: 'order_not_found' },
          { status: 404 }
        );
      }
    }

    // 内部フィールドを除去してレスポンス
    const { user_id: _uid, lookup_token: _tok, ...orderData } = order;

    return NextResponse.json({
      ok: true,
      data: orderData,
    });
  } catch (err) {
    secureLog('error', 'Get order error', safeErrorLog(err));
    return NextResponse.json(
      { ok: false, error: 'internal_error' },
      { status: 500 }
    );
  }
}
