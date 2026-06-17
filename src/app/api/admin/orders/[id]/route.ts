import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { sendShippingNotificationEmail } from '@/lib/email/resend';
import { requireAdmin } from '@/lib/auth/require-admin';
import { adminWriteGuard } from '@/lib/api/admin-guards';
import { uuidSchema, adminOrderUpdateSchema, formatValidationErrors } from '@/lib/validation/schemas';
import { writeAuditLog } from '@/lib/logging/audit-log';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const idParse = uuidSchema.safeParse(id);
  if (!idParse.success) {
    return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  try {
    const { data, error } = await supabase
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
        customer_phone,
        customer_email,
        pickup_date,
        pickup_time,
        delivery_date,
        delivery_time_slot,
        agreement_accepted,
        admin_note,
        user_id,
        locale,
        paid_at,
        refunded_at,
        created_at,
        updated_at,
        order_items (
          id,
          product_id,
          product_name,
          qty,
          unit_price_yen,
          line_total_yen
        ),
        payments (
          id,
          provider,
          status,
          amount_yen,
          stripe_payment_intent_id,
          refunded_at,
          stripe_refund_id
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const guard = await adminWriteGuard(request);
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const idParse = uuidSchema.safeParse(id);
  if (!idParse.success) {
    return NextResponse.json({ error: 'Invalid order ID' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  let rawBody;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parseResult = adminOrderUpdateSchema.safeParse(rawBody);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'validation_error', details: formatValidationErrors(parseResult.error) },
      { status: 400 }
    );
  }

  const body = parseResult.data;

  try {
    // Get current order data for email notification
    const { data: currentOrder } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single();

    const updateData: Record<string, unknown> = {};

    if (body.status) {
      updateData.status = body.status;
    }

    if (body.tracking_number !== undefined) {
      updateData.tracking_number = body.tracking_number;
    }

    if (body.status === 'SHIPPED') {
      updateData.shipped_at = new Date().toISOString();
    }

    if (body.status === 'FULFILLED') {
      updateData.fulfilled_at = new Date().toISOString();
    }

    if (body.status === 'CANCELED') {
      updateData.cancelled_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // 監査ログ（status 更新時のみ・best-effort）
    if (body.status) {
      await writeAuditLog({
        request,
        actorId: guard.userId,
        action: 'order.status_update',
        targetType: 'order',
        targetId: data?.order_no ?? id,
        metadata: { status: body.status },
      });
    }

    // Send shipping notification email when status changes to SHIPPED
    if (body.status === 'SHIPPED' && currentOrder) {
      await sendShippingNotificationEmail({
        orderNo: currentOrder.order_no,
        customerName: currentOrder.customer_name,
        customerEmail: currentOrder.customer_email,
        trackingNumber: body.tracking_number || data.tracking_number,
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
