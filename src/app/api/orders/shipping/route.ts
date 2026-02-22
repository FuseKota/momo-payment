import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { stripe, getStripeEnvironmentName } from '@/lib/stripe/client';
import crypto from 'crypto';
import { env } from '@/lib/env';
import { shippingOrderSchema, formatValidationErrors } from '@/lib/validation/schemas';
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
    const parseResult = shippingOrderSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errors = formatValidationErrors(parseResult.error);
      return NextResponse.json(
        { ok: false, error: 'validation_error', details: errors },
        { status: 400 }
      );
    }

    const body = parseResult.data;
    const locale = (rawBody.locale === 'zh-tw' ? 'zh-tw' : 'ja') as string;
    const shippingFeeYen = env.SHIPPING_FEE_YEN;

    // 1. 商品をDBから取得（改ざん防止）
    const productIds = body.items.map((i) => i.productId);
    const { data: products, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, name, kind, temp_zone, price_yen, can_ship, is_active')
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

    // 配送可能チェック
    for (const p of products) {
      if (!p.is_active || !p.can_ship) {
        return NextResponse.json(
          { ok: false, error: 'product_not_shippable', productId: p.id },
          { status: 400 }
        );
      }
    }

    // バリエーション取得（variantIdがある場合）
    const variantIds = body.items
      .map((i) => i.variantId)
      .filter((id): id is string => !!id);

    let variants: Array<{ id: string; product_id: string; size: string | null; price_yen: number | null }> = [];
    if (variantIds.length > 0) {
      const { data: variantData, error: variantError } = await supabaseAdmin
        .from('product_variants')
        .select('id, product_id, size, price_yen')
        .in('id', variantIds);

      if (variantError) {
        secureLog('error', 'Variant fetch error', safeErrorLog(variantError));
        return NextResponse.json(
          { ok: false, error: 'variant_fetch_failed' },
          { status: 500 }
        );
      }

      variants = variantData || [];

      // Validate all requested variants exist
      if (variants.length !== variantIds.length) {
        return NextResponse.json(
          { ok: false, error: 'variant_not_found' },
          { status: 400 }
        );
      }
    }

    // 温度帯混在チェック（MVP: 混在不可）
    const tempZone = products[0].temp_zone;
    if (products.some((p) => p.temp_zone !== tempZone)) {
      return NextResponse.json(
        { ok: false, error: 'temp_zone_mixed' },
        { status: 400 }
      );
    }

    // 金額計算
    const items = body.items.map((i) => {
      const p = products.find((x) => x.id === i.productId)!;
      const v = i.variantId ? variants.find((x) => x.id === i.variantId) : undefined;
      const qty = toInt(i.qty);
      if (qty <= 0 || qty > 99) {
        throw new Error('qty out of range');
      }
      // Use variant price if available, otherwise use product price
      const unitPrice = v?.price_yen ?? p.price_yen;
      const lineTotal = unitPrice * qty;
      return {
        product: p,
        variant: v,
        qty,
        unitPrice,
        lineTotal,
      };
    });

    const subtotal = items.reduce((sum, x) => sum + x.lineTotal, 0);
    const total = subtotal + shippingFeeYen;

    // 2. orders作成
    const { data: orderRow, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        order_type: 'SHIPPING',
        status: 'PENDING_PAYMENT',
        payment_method: 'STRIPE',
        temp_zone: tempZone,
        subtotal_yen: subtotal,
        shipping_fee_yen: shippingFeeYen,
        total_yen: total,
        customer_name: body.customer.name,
        customer_phone: body.customer.phone,
        customer_email: body.customer.email ?? null,
        agreement_accepted: true,
        user_id: userId,
        locale,
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
    const { error: itemsError } = await supabaseAdmin.from('order_items').insert(
      items.map((x) => ({
        order_id: orderRow.id,
        product_id: x.product.id,
        variant_id: x.variant?.id ?? null,
        qty: x.qty,
        unit_price_yen: x.unitPrice,
        line_total_yen: x.lineTotal,
        product_name: x.product.name,
        product_kind: x.product.kind,
        product_temp_zone: x.product.temp_zone,
        product_size: x.variant?.size ?? null,
      }))
    );

    if (itemsError) {
      secureLog('error', 'Order items create error', safeErrorLog(itemsError));
    }

    // 4. shipping_addresses作成
    const { error: addressError } = await supabaseAdmin.from('shipping_addresses').insert({
      order_id: orderRow.id,
      postal_code: body.address.postalCode,
      pref: body.address.pref,
      city: body.address.city,
      address1: body.address.address1,
      address2: body.address.address2 ?? null,
      recipient_name: body.customer.name,
      recipient_phone: body.customer.phone,
    });

    if (addressError) {
      secureLog('error', 'Address create error', safeErrorLog(addressError));
    }

    // 5. payments作成
    const idempotencyKey = crypto.randomUUID();
    const { data: paymentRow, error: paymentError } = await supabaseAdmin
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

    if (paymentError) {
      secureLog('error', 'Payment create error', safeErrorLog(paymentError));
    }

    // 6. Stripe Checkout Session作成
    const lineItems = items.map((x) => ({
      price_data: {
        currency: 'jpy',
        product_data: {
          name: x.variant?.size
            ? `${x.product.name} (${x.variant.size})`
            : x.product.name,
        },
        unit_amount: x.unitPrice,
      },
      quantity: x.qty,
    }));

    // 送料を1行として追加
    lineItems.push({
      price_data: {
        currency: 'jpy',
        product_data: {
          name: '送料',
        },
        unit_amount: shippingFeeYen,
      },
      quantity: 1,
    });

    const successUrl = `${env.NEXT_PUBLIC_APP_URL}/${locale}/complete?orderNo=${orderRow.order_no}`;
    const cancelUrl = `${env.NEXT_PUBLIC_APP_URL}/${locale}/checkout/shipping?canceled=true`;

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
        locale: locale === 'zh-tw' ? 'zh' : 'ja',
        customer_email: body.customer.email || undefined,
      },
      {
        idempotencyKey,
      }
    );

    const checkoutUrl = session.url ?? '';
    const stripeSessionId = session.id;

    // 7. paymentsを更新
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
        orderType: 'SHIPPING',
        status: 'PENDING_PAYMENT',
        tempZone,
        subtotalYen: subtotal,
        shippingFeeYen,
        totalYen: total,
        checkoutUrl,
      },
    });
  } catch (err) {
    secureLog('error', 'Shipping order error', safeErrorLog(err));
    return NextResponse.json(
      { ok: false, error: 'internal_error' },
      { status: 500 }
    );
  }
}
