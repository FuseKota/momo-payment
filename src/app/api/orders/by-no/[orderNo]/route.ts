import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
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

    return NextResponse.json({
      ok: true,
      data: order,
    });
  } catch (err) {
    secureLog('error', 'Get order error', safeErrorLog(err));
    return NextResponse.json(
      { ok: false, error: 'internal_error' },
      { status: 500 }
    );
  }
}
