import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  verifySquareWebhookSignature,
  SquareWebhookPayload,
  isPaymentCompleted,
  extractPaymentInfo,
} from '@/lib/square/webhook';
import { squareClient, getSquareEnvironmentName } from '@/lib/square/client';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // 1. Raw bodyを取得（署名検証に必要）
  const rawBody = await request.text();
  const signature = request.headers.get('x-square-hmacsha256-signature');

  // 2. 署名検証
  const isValid = verifySquareWebhookSignature({
    signatureHeader: signature,
    rawBody,
  });

  if (!isValid) {
    console.error('Square webhook: invalid signature');
    return new NextResponse('Invalid signature', { status: 403 });
  }

  // 3. イベントをパース
  let event: SquareWebhookPayload;
  try {
    event = JSON.parse(rawBody);
  } catch {
    console.error('Square webhook: invalid JSON');
    return new NextResponse('Invalid JSON', { status: 400 });
  }

  // 4. 冪等性チェック（同じevent_idは二度処理しない）
  const { error: insertError } = await supabaseAdmin
    .from('square_webhook_events')
    .insert({
      event_id: event.event_id,
      event_type: event.type,
      payload: event,
    });

  if (insertError) {
    // unique違反 = 既に処理済み
    if (insertError.message.includes('duplicate key')) {
      console.log('Square webhook: duplicate event, skipping');
      return NextResponse.json({ ok: true, message: 'already processed' });
    }
    console.error('Square webhook: insert error', insertError);
    // 他のエラーでも200を返す（Squareの無限再送を防ぐ）
  }

  // 5. payment.updated + COMPLETED 以外は無視
  if (!isPaymentCompleted(event)) {
    console.log(`Square webhook: ignoring event type ${event.type}`);
    return NextResponse.json({ ok: true, message: 'ignored' });
  }

  // 6. payment情報を抽出
  const { paymentId, orderId: squareOrderId } = extractPaymentInfo(event);

  if (!paymentId) {
    console.error('Square webhook: no payment_id in event');
    return NextResponse.json({ ok: true, message: 'no payment_id' });
  }

  // Square APIから最新の情報を取得（必要に応じて）
  let finalSquareOrderId = squareOrderId;
  if (!finalSquareOrderId) {
    try {
      const response = await squareClient.payments.get({ paymentId });
      finalSquareOrderId = response.payment?.orderId;
    } catch (err) {
      console.error('Square webhook: failed to get payment', err);
    }
  }

  if (!finalSquareOrderId) {
    console.error('Square webhook: no square_order_id');
    return NextResponse.json({ ok: true, message: 'no order_id' });
  }

  // 7. paymentsテーブルからinternal orderを特定
  const { data: paymentRow, error: paymentError } = await supabaseAdmin
    .from('payments')
    .select('id, order_id')
    .eq('square_order_id', finalSquareOrderId)
    .maybeSingle();

  if (paymentError || !paymentRow) {
    console.error('Square webhook: payment row not found', paymentError);
    return NextResponse.json({ ok: true, message: 'payment not found' });
  }

  // 8. paymentsを更新
  const { error: updatePaymentError } = await supabaseAdmin
    .from('payments')
    .update({
      status: 'SUCCEEDED',
      square_payment_id: paymentId,
      square_environment: getSquareEnvironmentName(),
      raw_webhook: event,
    })
    .eq('id', paymentRow.id);

  if (updatePaymentError) {
    console.error('Square webhook: failed to update payment', updatePaymentError);
  }

  // 9. ordersを更新（PAID）
  const { error: updateOrderError } = await supabaseAdmin
    .from('orders')
    .update({ status: 'PAID' })
    .eq('id', paymentRow.order_id);

  if (updateOrderError) {
    console.error('Square webhook: failed to update order', updateOrderError);
  }

  console.log(`Square webhook: order ${paymentRow.order_id} marked as PAID`);

  // TODO: メール通知を送信

  return NextResponse.json({ ok: true });
}
