import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { squareClient, SQUARE_LOCATION_ID, getSquareEnvironmentName } from '@/lib/square/client';
import crypto from 'crypto';
import type { PaymentMethod } from '@/types/database';

export const runtime = 'nodejs';

interface PickupOrderRequest {
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  items: Array<{
    productId: string;
    qty: number;
  }>;
  paymentMethod: PaymentMethod;
  pickupDate?: string;
  pickupTime?: string;
  agreementAccepted: boolean;
}

function toInt(n: unknown): number {
  const x = Number(n);
  if (!Number.isFinite(x)) throw new Error('invalid number');
  return Math.trunc(x);
}

export async function POST(request: NextRequest) {
  try {
    const body: PickupOrderRequest = await request.json();

    // バリデーション
    if (!body.customer?.name || !body.customer?.phone) {
      return NextResponse.json(
        { ok: false, error: 'customer_info_required' },
        { status: 400 }
      );
    }

    if (!body.items || body.items.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'items_required' },
        { status: 400 }
      );
    }

    if (!body.agreementAccepted) {
      return NextResponse.json(
        { ok: false, error: 'agreement_required' },
        { status: 400 }
      );
    }

    const paymentMethod = body.paymentMethod === 'SQUARE' ? 'SQUARE' : 'PAY_AT_PICKUP';

    // 1. 商品をDBから取得
    const productIds = body.items.map((i) => i.productId);
    const { data: products, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, name, kind, temp_zone, price_yen, can_pickup, is_active')
      .in('id', productIds);

    if (productError) {
      console.error('DB error:', productError);
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
      })
      .select('id, order_no')
      .single();

    if (orderError || !orderRow) {
      console.error('Order create error:', orderError);
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

      // TODO: 管理者へメール通知

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

    // Square決済の場合
    const idempotencyKey = crypto.randomUUID();
    const { data: paymentRow } = await supabaseAdmin
      .from('payments')
      .insert({
        order_id: orderRow.id,
        provider: 'square',
        status: 'INIT',
        amount_yen: total,
        idempotency_key: idempotencyKey,
      })
      .select('id')
      .single();

    // Square Payment Link作成
    const lineItems = items.map((x) => ({
      name: x.product.name,
      quantity: String(x.qty),
      basePriceMoney: {
        amount: BigInt(x.product.price_yen),
        currency: 'JPY' as const,
      },
    }));

    const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/complete?orderNo=${orderRow.order_no}`;

    const response = await squareClient.checkout.paymentLinks.create({
      idempotencyKey,
      order: {
        locationId: SQUARE_LOCATION_ID,
        referenceId: orderRow.order_no,
        lineItems,
      },
      checkoutOptions: {
        redirectUrl,
      },
    });

    const paymentLink = response.paymentLink;
    const checkoutUrl = paymentLink?.url ?? paymentLink?.longUrl ?? '';
    const squareOrderId = paymentLink?.orderId;

    // payments更新
    if (paymentRow) {
      await supabaseAdmin
        .from('payments')
        .update({
          status: 'LINK_CREATED',
          square_payment_link_id: paymentLink?.id ?? null,
          square_order_id: squareOrderId ?? null,
          square_environment: getSquareEnvironmentName(),
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
        paymentMethod: 'SQUARE',
        totalYen: total,
        checkoutUrl,
      },
    });
  } catch (err) {
    console.error('Pickup order error:', err);
    return NextResponse.json(
      { ok: false, error: 'internal_error' },
      { status: 500 }
    );
  }
}
