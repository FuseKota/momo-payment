import Stripe from 'stripe';
import { env } from '@/lib/env';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-12-15.clover',
  typescript: true,
});

/**
 * Stripe環境名を取得（Production or Test）
 */
export function getStripeEnvironmentName(): string {
  return env.STRIPE_SECRET_KEY.startsWith('sk_live_') ? 'Production' : 'Test';
}

export default stripe;
