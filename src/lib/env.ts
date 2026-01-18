import { z } from 'zod';

/**
 * 環境変数のバリデーションスキーマ
 * アプリケーション起動時に検証され、不正な設定を早期に検出
 */
const envSchema = z.object({
  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith('sk_', {
    message: 'STRIPE_SECRET_KEY must start with "sk_"',
  }),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_', {
    message: 'STRIPE_WEBHOOK_SECRET must start with "whsec_"',
  }),

  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({
    message: 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL',
  }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, {
    message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required',
  }),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, {
    message: 'SUPABASE_SERVICE_ROLE_KEY is required',
  }),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url({
    message: 'NEXT_PUBLIC_APP_URL must be a valid URL',
  }),
  SHIPPING_FEE_YEN: z.coerce.number().int().positive().default(1200),

  // Email (optional)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional().or(z.literal('')),
  ADMIN_EMAIL: z.string().email().optional().or(z.literal('')),
});

/**
 * 検証済み環境変数
 * インポートして使用: import { env } from '@/lib/env';
 */
function getEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error('❌ Invalid environment variables:');
    console.error(parsed.error.flatten().fieldErrors);
    throw new Error('Invalid environment variables');
  }

  return parsed.data;
}

export const env = getEnv();

export type Env = z.infer<typeof envSchema>;
