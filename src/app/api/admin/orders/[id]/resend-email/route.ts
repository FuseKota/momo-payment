import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';
import { adminWriteGuard } from '@/lib/api/admin-guards';
import { uuidSchema, adminResendEmailSchema, formatValidationErrors } from '@/lib/validation/schemas';
import {
  sendOrderConfirmationEmail,
  sendPaymentConfirmationEmail,
  sendPickupPaymentReceivedEmail,
  sendShippingNotificationEmail,
} from '@/lib/email/resend';
import { writeAuditLog } from '@/lib/logging/audit-log';

// 支払い確認メールを送れるステータス（入金済み以降）
const PAID_OR_LATER = ['PAID', 'PACKING', 'SHIPPED', 'FULFILLED'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const guard = await adminWriteGuard(request);
  if (!guard.ok) return guard.response;

  try {
    const { id: orderId } = await params;
    const idParse = uuidSchema.safeParse(orderId);
    if (!idParse.success) {
      return NextResponse.json({ ok: false, error: 'Invalid order ID' }, { status: 400 });
    }

    let rawBody;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
    }

    const parseResult = adminResendEmailSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { ok: false, error: 'validation_error', details: formatValidationErrors(parseResult.error) },
        { status: 400 }
      );
    }

    const { type } = parseResult.data;

    // 注文を order_items 付きで取得
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(
        `
        id,
        order_no,
        order_type,
        status,
        payment_method,
        customer_name,
        customer_email,
        subtotal_yen,
        shipping_fee_yen,
        total_yen,
        pickup_date,
        pickup_time,
        delivery_date,
        delivery_time_slot,
        locale,
        order_items (
          product_name,
          qty,
          unit_price_yen,
          line_total_yen
        )
      `
      )
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ ok: false, error: 'order_not_found' }, { status: 404 });
    }

    if (!order.customer_email) {
      return NextResponse.json({ ok: false, error: 'no_customer_email' }, { status: 400 });
    }

    const locale = order.locale || 'ja';
    let result: { success: boolean } = { success: false };

    if (type === 'PAYMENT_CONFIRMATION') {
      if (!PAID_OR_LATER.includes(order.status)) {
        return NextResponse.json({ ok: false, error: 'invalid_status_for_email' }, { status: 400 });
      }
      if (order.payment_method === 'PAY_AT_PICKUP') {
        result = await sendPickupPaymentReceivedEmail({
          orderNo: order.order_no,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          total: order.total_yen,
          locale,
        });
      } else {
        result = await sendPaymentConfirmationEmail({
          orderNo: order.order_no,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          total: order.total_yen,
          locale,
        });
      }
    } else if (type === 'SHIPPING_NOTIFICATION') {
      if (order.order_type !== 'SHIPPING' || !['SHIPPED', 'FULFILLED'].includes(order.status)) {
        return NextResponse.json({ ok: false, error: 'invalid_status_for_email' }, { status: 400 });
      }
      // 最新の追跡番号を取得
      const { data: shipment } = await supabaseAdmin
        .from('shipments')
        .select('tracking_no')
        .eq('order_id', orderId)
        .order('shipped_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      result = await sendShippingNotificationEmail({
        orderNo: order.order_no,
        customerName: order.customer_name,
        customerEmail: order.customer_email,
        trackingNumber: shipment?.tracking_no ?? undefined,
        locale,
      });
    } else if (type === 'ORDER_CONFIRMATION') {
      const items = (order.order_items ?? []).map(
        (item: {
          product_name: string;
          qty: number;
          unit_price_yen: number;
          line_total_yen: number;
        }) => ({
          name: item.product_name,
          qty: item.qty,
          unitPrice: item.unit_price_yen,
          subtotal: item.line_total_yen,
        })
      );

      if (order.order_type === 'SHIPPING') {
        // 配送先住所を取得
        const { data: address } = await supabaseAdmin
          .from('shipping_addresses')
          .select('postal_code, pref, city, address1, address2')
          .eq('order_id', orderId)
          .maybeSingle();

        result = await sendOrderConfirmationEmail({
          orderNo: order.order_no,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          orderType: 'SHIPPING',
          items,
          subtotal: order.subtotal_yen,
          shippingFee: order.shipping_fee_yen,
          total: order.total_yen,
          shippingAddress: address
            ? {
                postalCode: address.postal_code,
                prefecture: address.pref,
                city: address.city,
                address1: address.address1,
                address2: address.address2 ?? undefined,
              }
            : undefined,
          deliveryDate: order.delivery_date ?? undefined,
          deliveryTimeSlot: order.delivery_time_slot ?? undefined,
          locale,
        });
      } else {
        result = await sendOrderConfirmationEmail({
          orderNo: order.order_no,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          orderType: 'PICKUP',
          items,
          subtotal: order.subtotal_yen,
          shippingFee: order.shipping_fee_yen,
          total: order.total_yen,
          pickupDate: order.pickup_date ?? undefined,
          pickupTime: order.pickup_time ?? undefined,
          locale,
        });
      }
    } else {
      return NextResponse.json({ ok: false, error: 'invalid_status_for_email' }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ ok: false, error: 'email_send_failed' }, { status: 502 });
    }

    // 監査ログ（best-effort）
    await writeAuditLog({
      request,
      actorId: guard.userId,
      action: 'order.email_resend',
      targetType: 'order',
      targetId: order.order_no ?? orderId,
      metadata: { type },
    });

    return NextResponse.json({
      ok: true,
      data: { orderId, type },
    });
  } catch (err) {
    secureLog('error', 'Resend email error', safeErrorLog(err));
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}
