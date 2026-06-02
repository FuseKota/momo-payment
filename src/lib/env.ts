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

  // Email (本番では必須、開発/テストでは optional)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().email().optional().or(z.literal('')),
  ADMIN_EMAIL: z.string().email().optional().or(z.literal('')),

  // Google Calendar（飯舘村台湾夜市カレンダーの読み取り元）
  // 本番では必須、開発/テストでは optional（未設定時は API が空イベントで応答）
  GOOGLE_CALENDAR_CLIENT_EMAIL: z.string().email().optional().or(z.literal('')),
  // サービスアカウントの秘密鍵（PEM）。.env では改行を \n エスケープで記述するため、
  // ここで実際の改行へ復元してから JWT クライアントに渡す
  GOOGLE_CALENDAR_PRIVATE_KEY: z
    .string()
    .optional()
    .transform((s) => (s ? s.replace(/\\n/g, '\n') : s)),
  GOOGLE_CALENDAR_ID: z.string().optional(),
  GOOGLE_CALENDAR_TIMEZONE: z.string().default('Asia/Tokyo'),

  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
}).superRefine((data, ctx) => {
  if (data.NODE_ENV === 'production') {
    if (!data.RESEND_API_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['RESEND_API_KEY'],
        message: 'RESEND_API_KEY is required in production',
      });
    }
    if (!data.EMAIL_FROM) {
      ctx.addIssue({
        code: 'custom',
        path: ['EMAIL_FROM'],
        message: 'EMAIL_FROM is required in production',
      });
    }
    if (!data.ADMIN_EMAIL) {
      ctx.addIssue({
        code: 'custom',
        path: ['ADMIN_EMAIL'],
        message: 'ADMIN_EMAIL is required in production',
      });
    }
    if (!data.GOOGLE_CALENDAR_CLIENT_EMAIL) {
      ctx.addIssue({
        code: 'custom',
        path: ['GOOGLE_CALENDAR_CLIENT_EMAIL'],
        message: 'GOOGLE_CALENDAR_CLIENT_EMAIL is required in production',
      });
    }
    if (!data.GOOGLE_CALENDAR_PRIVATE_KEY) {
      ctx.addIssue({
        code: 'custom',
        path: ['GOOGLE_CALENDAR_PRIVATE_KEY'],
        message: 'GOOGLE_CALENDAR_PRIVATE_KEY is required in production',
      });
    }
    if (!data.GOOGLE_CALENDAR_ID) {
      ctx.addIssue({
        code: 'custom',
        path: ['GOOGLE_CALENDAR_ID'],
        message: 'GOOGLE_CALENDAR_ID is required in production',
      });
    }
  }
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
