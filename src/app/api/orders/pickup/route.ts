import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { stripe, getStripeEnvironmentName } from '@/lib/stripe/client';
import crypto from 'crypto';
import { env } from '@/lib/env';
import { sendOrderConfirmationEmail } from '@/lib/email/resend';
import { pickupOrderSchema, formatValidationErrors } from '@/lib/validation/schemas';
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
    const locale = (rawBody.locale === 'zh-tw' ? 'zh-tw' : 'ja') as string;

    // 3. 商品取得 + 検証
    const productIds = body.items.map((i) => i.productId);
    const productResult = await fetchAndValidateProducts(productIds, 'pickup');
    if (!productResult.ok) return productResult.response;

    // 4. 金額計算
    const items = calculateOrderItems(body.items, productResult.products);
    const subtotal = calculateSubtotal(items);
    const total = subtotal; // 店頭受け取りは送料なし

    // 5. 初期ステータス
    const initialStatus = paymentMethod === 'PAY_AT_PICKUP' ? 'RESERVED' : 'PENDING_PAYMENT';

    // 6. orders作成
    const { data: orderRow, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        order_type: 'PICKUP',
        status: initialStatus,
        payment_method: paymentMethod,
        temp_zone: null,
        subtotal_yen: subtotal,
        shipping_fee_yen: 0,
        total_yen: total,
        customer_name: body.customer.name,
        customer_phone: body.customer.phone,
        customer_email: body.customer.email ?? null,
        pickup_date: body.pickupDate ?? null,
        pickup_time: body.pickupTime ?? null,
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

    // 7. order_items作成
    const { error: itemsError } = await supabaseAdmin.from('order_items').insert(
      items.map((x) => ({
        order_id: orderRow.id,
        product_id: x.product.id,
        qty: x.qty,
        unit_price_yen: x.unitPrice,
        line_total_yen: x.lineTotal,
        product_name: localizedProductName(x.product, locale),
        product_kind: x.product.kind,
        product_temp_zone: x.product.temp_zone,
      }))
    );

    if (itemsError) {
      secureLog('error', 'Order items create error', safeErrorLog(itemsError));
      await supabaseAdmin.from('orders').update({ status: 'CANCELLED' }).eq('id', orderRow.id);
      return NextResponse.json(
        { ok: false, error: 'order_items_create_failed' },
        { status: 500 }
      );
    }

    // 店頭払いの場合はここで完了
    if (paymentMethod === 'PAY_AT_PICKUP') {
      await supabaseAdmin.from('payments').insert({
        order_id: orderRow.id,
        provider: 'on_site',
        status: 'INIT',
        amount_yen: total,
      });

      if (body.customer.email) {
        try {
          await sendOrderConfirmationEmail({
            orderNo: orderRow.order_no,
            customerName: body.customer.name,
            customerEmail: body.customer.email,
            orderType: 'PICKUP',
            items: items.map((x) => ({
              name: localizedProductName(x.product, locale),
              qty: x.qty,
              unitPrice: x.unitPrice,
              subtotal: x.lineTotal,
            })),
            subtotal,
            shippingFee: 0,
            total,
            pickupDate: body.pickupDate,
            pickupTime: body.pickupTime,
            locale,
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

    const lineItems = items.map((x) => ({
      price_data: {
        currency: 'jpy',
        product_data: {
          name: localizedProductName(x.product, locale),
        },
        unit_amount: x.unitPrice,
      },
      quantity: x.qty,
    }));

    const successUrl = `${env.NEXT_PUBLIC_APP_URL}/${locale}/complete?orderNo=${orderRow.order_no}`;
    const cancelUrl = `${env.NEXT_PUBLIC_APP_URL}/${locale}/checkout/pickup?canceled=true`;

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
      await supabaseAdmin.from('orders').update({ status: 'CANCELLED' }).eq('id', orderRow.id);
      return NextResponse.json(
        { ok: false, error: 'payment_session_failed' },
        { status: 500 }
      );
    }

    const checkoutUrl = session.url ?? '';
    const stripeSessionId = session.id;

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
