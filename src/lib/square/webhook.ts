import crypto from 'crypto';

/**
 * Square Webhook署名検証
 *
 * Square公式ドキュメントに基づき、HMAC-SHA256で署名を検証する
 * @see https://developer.squareup.com/docs/webhooks/validate-notifications
 */
export function verifySquareWebhookSignature(params: {
  signatureHeader: string | null;
  rawBody: string;
}): boolean {
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  const notificationUrl = process.env.SQUARE_WEBHOOK_NOTIFICATION_URL;

  if (!signatureKey || !notificationUrl) {
    console.error('Square webhook config missing');
    return false;
  }

  if (!params.signatureHeader) {
    console.error('Missing signature header');
    return false;
  }

  // Square's signature is calculated as: HMAC-SHA256(notification_url + body)
  const payload = notificationUrl + params.rawBody;
  const expectedSignature = crypto
    .createHmac('sha256', signatureKey)
    .update(payload)
    .digest('base64');

  const isValid = params.signatureHeader === expectedSignature;

  if (!isValid) {
    console.error('Webhook signature mismatch');
  }

  return isValid;
}

/**
 * Square WebhookイベントのPayload型
 */
export interface SquareWebhookPayload {
  merchant_id: string;
  type: string;
  event_id: string;
  created_at: string;
  data: {
    type: string;
    id: string;
    object?: {
      payment?: {
        id: string;
        status: string;
        order_id?: string;
        amount_money?: {
          amount: number;
          currency: string;
        };
      };
    };
  };
}

/**
 * 支払い完了かどうかを判定
 */
export function isPaymentCompleted(event: SquareWebhookPayload): boolean {
  return (
    event.type === 'payment.updated' &&
    event.data.object?.payment?.status === 'COMPLETED'
  );
}

/**
 * イベントからpayment_idとorder_idを抽出
 */
export function extractPaymentInfo(event: SquareWebhookPayload): {
  paymentId: string | undefined;
  orderId: string | undefined;
} {
  const payment = event.data.object?.payment;
  return {
    paymentId: payment?.id,
    orderId: payment?.order_id,
  };
}
