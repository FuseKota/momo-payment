import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';
import { checkRateLimit, getClientIP } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNo: string }> }
) {
  try {
    // レート制限チェック
    const clientIP = getClientIP(request);
    const rateLimit = checkRateLimit(`order-lookup:${clientIP}`, 10, 60000);
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

    // 認証済みユーザーのIDを取得（省略可 - ゲスト注文に対応するため）
    let currentUserId: string | null = null;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      currentUserId = user?.id ?? null;
    } catch {
      // 認証エラーは無視（ゲスト注文に対応するため）
    }

    // 注文を取得
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

    // 認証済みユーザーの場合: user_idが一致することを確認（他人の注文閲覧防止）
    if (order.user_id && currentUserId && order.user_id !== currentUserId) {
      secureLog('warn', 'Order access denied: user_id mismatch', { ip: clientIP });
      return NextResponse.json(
        { ok: false, error: 'order_not_found' },
        { status: 404 }
      );
    }

    // レスポンスから内部フィールド(user_id)を除外
    const { user_id: _uid, ...orderData } = order;

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
