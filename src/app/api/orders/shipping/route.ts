import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { stripe, getStripeEnvironmentName } from '@/lib/stripe/client';
import crypto from 'crypto';
import { env } from '@/lib/env';
import { shippingOrderSchema, formatValidationErrors } from '@/lib/validation/schemas';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';
import { orderGuard } from '@/lib/api/order-guards';
import { fetchAndValidateProducts } from '@/lib/api/product-helpers';
import { calculateOrderItems, calculateSubtotal } from '@/lib/api/price-calc';
import { localizedProductName } from '@/lib/api/localize';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // 1. セキュリティガード（レート制限 + CSRF + ユーザーID取得）
    const guard = await orderGuard(request);
    if (!guard.ok) return guard.response;

    // 2. リクエストボディのパース + バリデーション
    const rawBody = await request.json();
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

    // 3. 商品取得 + 検証
    const productIds = body.items.map((i) => i.productId);
    const productResult = await fetchAndValidateProducts(productIds, 'shipping');
    if (!productResult.ok) return productResult.response;
    const products = productResult.products;

    // 4. バリエーション取得（variantIdがある場合）
    const variantIds = body.items
      .map((i) => i.variantId)
      .filter((id): id is string => !!id);

    let variants: Array<{ id: string; product_id: string; size: string | null; price_yen: number | null; stock_qty: number | null }> = [];
    if (variantIds.length > 0) {
      const { data: variantData, error: variantError } = await supabaseAdmin
        .from('product_variants')
        .select('id, product_id, size, price_yen, stock_qty')
        .in('id', variantIds);

      if (variantError) {
        secureLog('error', 'Variant fetch error', safeErrorLog(variantError));
        return NextResponse.json(
          { ok: false, error: 'variant_fetch_failed' },
          { status: 500 }
        );
      }

      variants = variantData || [];

      if (variants.length !== variantIds.length) {
        return NextResponse.json(
          { ok: false, error: 'variant_not_found' },
          { status: 400 }
        );
      }

      // バリアント-商品紐付け検証（価格操作攻撃の防止）+ 在庫チェック
      for (const item of body.items) {
        if (item.variantId) {
          const variant = variants.find((v) => v.id === item.variantId);
          if (variant && variant.product_id !== item.productId) {
            return NextResponse.json(
              { ok: false, error: 'variant_product_mismatch' },
              { status: 400 }
            );
          }
          // 在庫管理あり（stock_qtyが設定済み）の場合は在庫数を確認
          if (variant && variant.stock_qty !== null && variant.stock_qty < item.qty) {
            secureLog('warn', 'Variant out of stock', { variantId: item.variantId, stock: variant.stock_qty, requested: item.qty });
            return NextResponse.json(
              { ok: false, error: 'variant_out_of_stock' },
              { status: 400 }
            );
          }
        }
      }
    }

    // 5. 温度帯混在チェック（MVP: 混在不可）
    const tempZone = products[0].temp_zone;
    if (products.some((p) => p.temp_zone !== tempZone)) {
      return NextResponse.json(
        { ok: false, error: 'temp_zone_mixed' },
        { status: 400 }
      );
    }

    // 6. 金額計算
    const items = calculateOrderItems(body.items, products, variants);
    const subtotal = calculateSubtotal(items);
    const total = subtotal + shippingFeeYen;

    // 7. orders作成
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
        user_id: guard.userId,
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

    // 8. order_items作成
    const { error: itemsError } = await supabaseAdmin.from('order_items').insert(
      items.map((x) => ({
        order_id: orderRow.id,
        product_id: x.product.id,
        variant_id: x.variant?.id ?? null,
        qty: x.qty,
        unit_price_yen: x.unitPrice,
        line_total_yen: x.lineTotal,
        product_name: localizedProductName(x.product, locale),
        product_kind: x.product.kind,
        product_temp_zone: x.product.temp_zone,
        product_size: x.variant?.size ?? null,
      }))
    );

    if (itemsError) {
      secureLog('error', 'Order items create error', safeErrorLog(itemsError));
      await supabaseAdmin.from('orders').update({ status: 'CANCELED' }).eq('id', orderRow.id);
      return NextResponse.json(
        { ok: false, error: 'order_items_create_failed' },
        { status: 500 }
      );
    }

    // 9. shipping_addresses作成
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
      await supabaseAdmin.from('orders').update({ status: 'CANCELED' }).eq('id', orderRow.id);
      return NextResponse.json(
        { ok: false, error: 'address_create_failed' },
        { status: 500 }
      );
    }

    // 10. payments作成
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
      await supabaseAdmin.from('orders').update({ status: 'CANCELED' }).eq('id', orderRow.id);
      return NextResponse.json(
        { ok: false, error: 'payment_create_failed' },
        { status: 500 }
      );
    }

    // 11. Stripe Checkout Session作成
    const lineItems = items.map((x) => ({
      price_data: {
        currency: 'jpy',
        product_data: {
          name: x.variant?.size
            ? `${localizedProductName(x.product, locale)} (${x.variant.size})`
            : localizedProductName(x.product, locale),
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
          name: locale === 'zh-tw' ? '運費' : '送料',
        },
        unit_amount: shippingFeeYen,
      },
      quantity: 1,
    });

    const successUrl = `${env.NEXT_PUBLIC_APP_URL}/${locale}/complete?orderNo=${orderRow.order_no}`;
    const cancelUrl = `${env.NEXT_PUBLIC_APP_URL}/${locale}/checkout/shipping?canceled=true`;

    let session;
    try {
      session = await stripe.checkout.sessions.create(
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
    } catch (stripeErr) {
      secureLog('error', 'Stripe session creation failed', safeErrorLog(stripeErr));
      // 作成済みのpaymentsとordersをクリーンアップ
      if (paymentRow) {
        await supabaseAdmin.from('payments').delete().eq('id', paymentRow.id);
      }
      await supabaseAdmin.from('orders').update({ status: 'CANCELED' }).eq('id', orderRow.id);
      return NextResponse.json(
        { ok: false, error: 'payment_session_failed' },
        { status: 500 }
      );
    }

    const checkoutUrl = session.url ?? '';
    const stripeSessionId = session.id;

    // 12. paymentsを更新
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
