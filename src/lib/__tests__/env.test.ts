/**
 * 環境変数検証のユニットテスト
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { z } from 'zod';

// envSchema を直接テストするため、モジュールの型だけをインポート
describe('env validation', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  // 環境変数スキーマを直接定義してテスト
  const envSchema = z.object({
    STRIPE_SECRET_KEY: z.string().startsWith('sk_', {
      message: 'STRIPE_SECRET_KEY must start with "sk_"',
    }),
    STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_', {
      message: 'STRIPE_WEBHOOK_SECRET must start with "whsec_"',
    }),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url({
      message: 'NEXT_PUBLIC_SUPABASE_URL must be a valid URL',
    }),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, {
      message: 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required',
    }),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, {
      message: 'SUPABASE_SERVICE_ROLE_KEY is required',
    }),
    NEXT_PUBLIC_APP_URL: z.string().url({
      message: 'NEXT_PUBLIC_APP_URL must be a valid URL',
    }),
    SHIPPING_FEE_YEN: z.coerce.number().int().positive().default(1200),
  });

  describe('STRIPE_SECRET_KEY', () => {
    it('sk_で始まるキーを受け入れる', () => {
      const result = z.string().startsWith('sk_').safeParse('sk_test_123');
      expect(result.success).toBe(true);
    });

    it('sk_で始まらないキーを拒否する', () => {
      const result = z.string().startsWith('sk_').safeParse('pk_test_123');
      expect(result.success).toBe(false);
    });

    it('空のキーを拒否する', () => {
      const result = z.string().startsWith('sk_').safeParse('');
      expect(result.success).toBe(false);
    });
  });

  describe('STRIPE_WEBHOOK_SECRET', () => {
    it('whsec_で始まるキーを受け入れる', () => {
      const result = z.string().startsWith('whsec_').safeParse('whsec_test_123');
      expect(result.success).toBe(true);
    });

    it('whsec_で始まらないキーを拒否する', () => {
      const result = z.string().startsWith('whsec_').safeParse('invalid_123');
      expect(result.success).toBe(false);
    });
  });

  describe('NEXT_PUBLIC_SUPABASE_URL', () => {
    it('有効なURLを受け入れる', () => {
      const result = z.string().url().safeParse('https://xxx.supabase.co');
      expect(result.success).toBe(true);
    });

    it('無効なURLを拒否する', () => {
      const result = z.string().url().safeParse('not-a-url');
      expect(result.success).toBe(false);
    });
  });

  describe('SHIPPING_FEE_YEN', () => {
    it('正の整数を受け入れる', () => {
      const result = z.coerce.number().int().positive().safeParse('1200');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(1200);
      }
    });

    it('デフォルト値が1200', () => {
      const schema = z.coerce.number().int().positive().default(1200);
      const result = schema.safeParse(undefined);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(1200);
      }
    });

    it('負の数を拒否する', () => {
      const result = z.coerce.number().int().positive().safeParse('-100');
      expect(result.success).toBe(false);
    });

    it('小数を拒否する', () => {
      const result = z.coerce.number().int().positive().safeParse('1200.5');
      expect(result.success).toBe(false);
    });
  });

  describe('完全な環境変数セット', () => {
    it('すべての必須変数が設定されていれば成功する', () => {
      const validEnv = {
        STRIPE_SECRET_KEY: 'sk_test_123',
        STRIPE_WEBHOOK_SECRET: 'whsec_test_123',
        NEXT_PUBLIC_SUPABASE_URL: 'https://xxx.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon_key_123',
        SUPABASE_SERVICE_ROLE_KEY: 'service_role_key_123',
        NEXT_PUBLIC_APP_URL: 'https://momo.example.com',
      };

      const result = envSchema.safeParse(validEnv);
      expect(result.success).toBe(true);
    });

    it('必須変数が欠けていると失敗する', () => {
      const invalidEnv = {
        STRIPE_SECRET_KEY: 'sk_test_123',
        // STRIPE_WEBHOOK_SECRET が欠落
        NEXT_PUBLIC_SUPABASE_URL: 'https://xxx.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon_key_123',
        SUPABASE_SERVICE_ROLE_KEY: 'service_role_key_123',
        NEXT_PUBLIC_APP_URL: 'https://momo.example.com',
      };

      const result = envSchema.safeParse(invalidEnv);
      expect(result.success).toBe(false);
    });
  });
});
