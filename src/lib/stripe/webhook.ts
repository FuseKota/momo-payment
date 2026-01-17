import Stripe from 'stripe';
import { stripe } from './client';

/**
 * Stripe Webhook署名検証
 * 検証成功時はEventを返し、失敗時はnullを返す
 */
export function verifyStripeWebhookSignature(params: {
  signatureHeader: string | null;
  rawBody: string | Buffer;
}): Stripe.Event | null {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret || !params.signatureHeader) {
    console.error('Stripe webhook config missing');
    return null;
  }

  try {
    return stripe.webhooks.constructEvent(
      params.rawBody,
      params.signatureHeader,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return null;
  }
}

/**
 * Checkout Session完了イベントかどうかを判定
 */
export function isCheckoutSessionCompleted(event: Stripe.Event): boolean {
  return event.type === 'checkout.session.completed';
}

/**
 * Checkout Session期限切れイベントかどうかを判定
 */
export function isCheckoutSessionExpired(event: Stripe.Event): boolean {
  return event.type === 'checkout.session.expired';
}

/**
 * イベントからセッション情報を抽出
 */
export function extractSessionInfo(event: Stripe.Event): {
  sessionId: string;
  paymentIntentId: string | null;
  metadata: Record<string, string>;
} | null {
  if (
    event.type !== 'checkout.session.completed' &&
    event.type !== 'checkout.session.expired'
  ) {
    return null;
  }

  const session = event.data.object as Stripe.Checkout.Session;
  return {
    sessionId: session.id,
    paymentIntentId:
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id ?? null,
    metadata: (session.metadata as Record<string, string>) ?? {},
  };
}
