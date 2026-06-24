import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth/require-admin';
import { adminWriteGuard } from '@/lib/api/admin-guards';
import { uuidSchema, adminOrderUpdateSchema, formatValidationErrors } from '@/lib/validation/schemas';
import { writeAuditLog } from '@/lib/logging/audit-log';
import { firstShippingAddress } from '@/lib/api/shipping-address';

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
        ),
        shipping_addresses (
          postal_code,
          pref,
          city,
          address1,
          address2,
          recipient_name,
          recipient_phone
        ),
        shipments (
          carrier,
          tracking_no,
          shipped_at
        )
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // shipping_addresses は UNIQUE FK のため PostgREST が単一オブジェクトで返す。
    // 詳細画面（OrderDetailSummary）はフラットな shipping_* 列を参照するため、ここで展開する。
    const { shipping_addresses, shipments, ...order } = data;
    const addr = firstShippingAddress(shipping_addresses);

    // 決済状況は orders に専用列が無いため、paid_at / payments.status から導出する。
    const isPaid =
      !!order.paid_at ||
      (Array.isArray(order.payments) &&
        order.payments.some((p: { status: string }) => p.status === 'SUCCEEDED'));

    // 発送情報は shipments テーブルに記録されるため、最新の1件を平坦化して返す。
    const latestShipment = (Array.isArray(shipments) ? shipments : [])
      .filter(Boolean)
      .sort((a, b) => (b?.shipped_at ?? '').localeCompare(a?.shipped_at ?? ''))[0];

    return NextResponse.json({
      ...order,
      payment_status: isPaid ? 'PAID' : 'PENDING_PAYMENT',
      tracking_number: latestShipment?.tracking_no ?? null,
      shipped_at: latestShipment?.shipped_at ?? null,
      shipping_postal_code: addr?.postal_code ?? null,
      shipping_prefecture: addr?.pref ?? null,
      shipping_city: addr?.city ?? null,
      shipping_address1: addr?.address1 ?? null,
      shipping_address2: addr?.address2 ?? null,
    });
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

  // 発送（SHIPPED）は shipments への記録・追跡番号・通知メールが必要なため、
  // 専用エンドポイント POST /api/admin/orders/[id]/ship を使う。
  // ここで status だけ SHIPPED にすると発送レコードが欠落するため拒否する。
  if (body.status === 'SHIPPED') {
    return NextResponse.json({ error: 'use_ship_endpoint' }, { status: 400 });
  }

  if (!body.status) {
    return NextResponse.json({ error: 'no_updatable_fields' }, { status: 400 });
  }

  try {
    // orders には status 以外の状態列（shipped_at/fulfilled_at/cancelled_at/tracking_number）が
    // 存在しないため書き込まない。発送日時・追跡番号は shipments テーブルが保持する。
    const { data, error } = await supabase
      .from('orders')
      .update({ status: body.status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // 監査ログ（best-effort）
    await writeAuditLog({
      request,
      actorId: guard.userId,
      action: 'order.status_update',
      targetType: 'order',
      targetId: data?.order_no ?? id,
      metadata: { status: body.status },
    });

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
