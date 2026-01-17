import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY!;

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-01-27.acacia',
  typescript: true,
});

/**
 * Stripe環境名を取得（Production or Test）
 */
export function getStripeEnvironmentName(): string {
  return stripeSecretKey?.startsWith('sk_live_') ? 'Production' : 'Test';
}

export default stripe;
