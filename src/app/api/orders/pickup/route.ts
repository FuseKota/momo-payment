import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { stripe, getStripeEnvironmentName } from '@/lib/stripe/client';
import crypto from 'crypto';
import { env } from '@/lib/env';
import { sendOrderConfirmationEmail } from '@/lib/email/resend';
import { pickupOrderSchema, formatValidationErrors } from '@/lib/validation/schemas';
import { checkOrderRateLimit, getClientIP } from '@/lib/security/rate-limit';
import { validateOrigin } from '@/lib/security/csrf';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';
import { toInt } from '@/lib/utils/format';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    // 1. レート制限チェック
    const rateLimit = checkOrderRateLimit(clientIP);
    if (!rateLimit.allowed) {
      secureLog('warn', 'Rate limit exceeded', { ip: clientIP });
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

    // 2. CSRF保護（Origin検証）
    const originCheck = validateOrigin(request);
    if (!originCheck.valid) {
      secureLog('warn', 'CSRF check failed', { ip: clientIP, reason: originCheck.reason });
      return NextResponse.json(
        { ok: false, error: 'invalid_origin' },
        { status: 403 }
      );
    }

    // 3. ログインユーザーの場合、user_idを取得（オプション）
    let userId: string | null = null;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      // ゲスト購入の場合は無視
    }

    // 4. リクエストボディのパース
    const rawBody = await request.json();

    // 5. zodスキーマでバリデーション
    const parseResult = pickupOrderSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errors = formatValidationErrors(parseResult.error);
      return NextResponse.json(
        { ok: false, error: 'validation_error', details: errors },
        { status: 400 }
      );
    }

    const body = parseResult.data;
    const paymentMethod = body.paymentMethod;

    // 1. 商品をDBから取得
    const productIds = body.items.map((i) => i.productId);
    const { data: products, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, name, kind, temp_zone, price_yen, can_pickup, is_active')
      .in('id', productIds);

    if (productError) {
      secureLog('error', 'DB error', safeErrorLog(productError));
      return NextResponse.json(
        { ok: false, error: 'db_error' },
        { status: 500 }
      );
    }

    if (!products || products.length !== productIds.length) {
      return NextResponse.json(
        { ok: false, error: 'product_not_found' },
        { status: 400 }
      );
    }

    // 店頭受け取り可能チェック
    for (const p of products) {
      if (!p.is_active || !p.can_pickup) {
        return NextResponse.json(
          { ok: false, error: 'product_not_available', productId: p.id },
          { status: 400 }
        );
      }
    }

    // 金額計算
    const items = body.items.map((i) => {
      const p = products.find((x) => x.id === i.productId)!;
      const qty = toInt(i.qty);
      if (qty <= 0 || qty > 99) {
        throw new Error('qty out of range');
      }
      const lineTotal = p.price_yen * qty;
      return { product: p, qty, lineTotal };
    });

    const subtotal = items.reduce((sum, x) => sum + x.lineTotal, 0);
    const total = subtotal; // 店頭受け取りは送料なし

    // 初期ステータス
    const initialStatus = paymentMethod === 'PAY_AT_PICKUP' ? 'RESERVED' : 'PENDING_PAYMENT';

    // 2. orders作成
    const { data: orderRow, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        order_type: 'PICKUP',
        status: initialStatus,
        payment_method: paymentMethod,
        temp_zone: null, // PICKUPは温度帯不要
        subtotal_yen: subtotal,
        shipping_fee_yen: 0,
        total_yen: total,
        customer_name: body.customer.name,
        customer_phone: body.customer.phone,
        customer_email: body.customer.email ?? null,
        pickup_date: body.pickupDate ?? null,
        pickup_time: body.pickupTime ?? null,
        agreement_accepted: true,
        user_id: userId,
      })
      .select('id, order_no')
      .single();

    if (orderError || !orderRow) {
      secureLog('error', 'Order create error', safeErrorLog(orderError));
      return NextResponse.json(
        { ok: false, error: 'order_create_failed' },
        { status: 500 }
      );
    }

    // 3. order_items作成
    await supabaseAdmin.from('order_items').insert(
      items.map((x) => ({
        order_id: orderRow.id,
        product_id: x.product.id,
        qty: x.qty,
        unit_price_yen: x.product.price_yen,
        line_total_yen: x.lineTotal,
        product_name: x.product.name,
        product_kind: x.product.kind,
        product_temp_zone: x.product.temp_zone,
      }))
    );

    // 店頭払いの場合はここで完了
    if (paymentMethod === 'PAY_AT_PICKUP') {
      // payments作成（on_site）
      await supabaseAdmin.from('payments').insert({
        order_id: orderRow.id,
        provider: 'on_site',
        status: 'INIT',
        amount_yen: total,
      });

      // 確認メールを送信
      if (body.customer.email) {
        try {
          await sendOrderConfirmationEmail({
            orderNo: orderRow.order_no,
            customerName: body.customer.name,
            customerEmail: body.customer.email,
            orderType: 'PICKUP',
            items: items.map((x) => ({
              name: x.product.name,
              qty: x.qty,
              unitPrice: x.product.price_yen,
              subtotal: x.lineTotal,
            })),
            subtotal,
            shippingFee: 0,
            total,
            pickupDate: body.pickupDate,
            pickupTime: body.pickupTime,
          });
        } catch (emailError) {
          secureLog('error', 'Failed to send confirmation email', safeErrorLog(emailError));
        }
      }

      return NextResponse.json({
        ok: true,
        data: {
          orderId: orderRow.id,
          orderNo: orderRow.order_no,
          orderType: 'PICKUP',
          status: 'RESERVED',
          paymentMethod: 'PAY_AT_PICKUP',
          totalYen: total,
        },
      });
    }

    // Stripe決済の場合
    const idempotencyKey = crypto.randomUUID();
    const { data: paymentRow } = await supabaseAdmin
      .from('payments')
      .insert({
        order_id: orderRow.id,
        provider: 'stripe',
        status: 'INIT',
        amount_yen: total,
        idempotency_key: idempotencyKey,
      })
      .select('id')
      .single();

    // Stripe Checkout Session作成
    const lineItems = items.map((x) => ({
      price_data: {
        currency: 'jpy',
        product_data: {
          name: x.product.name,
        },
        unit_amount: x.product.price_yen,
      },
      quantity: x.qty,
    }));

    const successUrl = `${env.NEXT_PUBLIC_APP_URL}/complete?orderNo=${orderRow.order_no}`;
    const cancelUrl = `${env.NEXT_PUBLIC_APP_URL}/checkout/pickup?canceled=true`;

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: lineItems,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          order_no: orderRow.order_no,
          order_id: orderRow.id,
        },
        locale: 'ja',
        customer_email: body.customer.email || undefined,
      },
      {
        idempotencyKey,
      }
    );

    const checkoutUrl = session.url ?? '';
    const stripeSessionId = session.id;

    // payments更新
    if (paymentRow) {
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'LINK_CREATED',
          stripe_session_id: stripeSessionId,
          stripe_environment: getStripeEnvironmentName(),
        })
        .eq('id', paymentRow.id);
    }

    // TODO: 管理者へメール通知

    return NextResponse.json({
      ok: true,
      data: {
        orderId: orderRow.id,
        orderNo: orderRow.order_no,
        orderType: 'PICKUP',
        status: 'PENDING_PAYMENT',
        paymentMethod: 'STRIPE',
        totalYen: total,
        checkoutUrl,
      },
    });
  } catch (err) {
    secureLog('error', 'Pickup order error', safeErrorLog(err));
    return NextResponse.json(
      { ok: false, error: 'internal_error' },
      { status: 500 }
    );
  }
}
