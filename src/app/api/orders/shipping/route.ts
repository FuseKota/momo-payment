import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { squareClient, SQUARE_LOCATION_ID, getSquareEnvironmentName } from '@/lib/square/client';
import crypto from 'crypto';

export const runtime = 'nodejs';

interface ShippingOrderRequest {
  customer: {
    name: string;
    phone: string;
    email?: string;
  };
  address: {
    postalCode: string;
    pref: string;
    city: string;
    address1: string;
    address2?: string;
  };
  items: Array<{
    productId: string;
    qty: number;
  }>;
  agreementAccepted: boolean;
}

function toInt(n: unknown): number {
  const x = Number(n);
  if (!Number.isFinite(x)) throw new Error('invalid number');
  return Math.trunc(x);
}

export async function POST(request: NextRequest) {
  try {
    const body: ShippingOrderRequest = await request.json();

    // バリデーション
    if (!body.customer?.name || !body.customer?.phone) {
      return NextResponse.json(
        { ok: false, error: 'customer_info_required' },
        { status: 400 }
      );
    }

    if (!body.address?.postalCode || !body.address?.pref || !body.address?.city || !body.address?.address1) {
      return NextResponse.json(
        { ok: false, error: 'address_required' },
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

    const shippingFeeYen = toInt(process.env.SHIPPING_FEE_YEN ?? '1200');

    // 1. 商品をDBから取得（改ざん防止）
    const productIds = body.items.map((i) => i.productId);
    const { data: products, error: productError } = await supabaseAdmin
      .from('products')
      .select('id, name, kind, temp_zone, price_yen, can_ship, is_active')
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

    // 配送可能チェック
    for (const p of products) {
      if (!p.is_active || !p.can_ship) {
        return NextResponse.json(
          { ok: false, error: 'product_not_shippable', productId: p.id },
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
      const qty = toInt(i.qty);
      if (qty <= 0 || qty > 99) {
        throw new Error('qty out of range');
      }
      const lineTotal = p.price_yen * qty;
      return { product: p, qty, lineTotal };
    });

    const subtotal = items.reduce((sum, x) => sum + x.lineTotal, 0);
    const total = subtotal + shippingFeeYen;

    // 2. orders作成
    const { data: orderRow, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        order_type: 'SHIPPING',
        status: 'PENDING_PAYMENT',
        payment_method: 'SQUARE',
        temp_zone: tempZone,
        subtotal_yen: subtotal,
        shipping_fee_yen: shippingFeeYen,
        total_yen: total,
        customer_name: body.customer.name,
        customer_phone: body.customer.phone,
        customer_email: body.customer.email ?? null,
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
    const { error: itemsError } = await supabaseAdmin.from('order_items').insert(
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

    if (itemsError) {
      console.error('Order items create error:', itemsError);
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
      console.error('Address create error:', addressError);
    }

    // 5. payments作成
    const idempotencyKey = crypto.randomUUID();
    const { data: paymentRow, error: paymentError } = await supabaseAdmin
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

    if (paymentError) {
      console.error('Payment create error:', paymentError);
    }

    // 6. Square Payment Link作成
    const lineItems = items.map((x) => ({
      name: x.product.name,
      quantity: String(x.qty),
      basePriceMoney: {
        amount: BigInt(x.product.price_yen),
        currency: 'JPY' as const,
      },
    }));

    // 送料を1行として追加
    lineItems.push({
      name: '送料',
      quantity: '1',
      basePriceMoney: {
        amount: BigInt(shippingFeeYen),
        currency: 'JPY' as const,
      },
    });

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

    // 7. paymentsを更新
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
    console.error('Shipping order error:', err);
    return NextResponse.json(
      { ok: false, error: 'internal_error' },
      { status: 500 }
    );
  }
}
