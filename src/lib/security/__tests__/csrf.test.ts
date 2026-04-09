/**
 * CSRF保護のユニットテスト
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { validateOrigin, requiresCsrfCheck } from '../csrf';

describe('csrf', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('validateOrigin', () => {
    it('許可されたOriginは通過する', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://momo-payment.example.com';
      process.env.NODE_ENV = 'production';

      const request = new Request('http://localhost', {
        headers: {
          origin: 'https://momo-payment.example.com',
        },
      });

      const result = validateOrigin(request);
      expect(result.valid).toBe(true);
      expect(result.origin).toBe('https://momo-payment.example.com');
    });

    it('不正なOriginは拒否される', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://momo-payment.example.com';
      process.env.NODE_ENV = 'production';

      const request = new Request('http://localhost', {
        headers: {
          origin: 'https://evil.com',
        },
      });

      const result = validateOrigin(request);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('Origin not allowed');
    });

    it('開発環境ではlocalhostが許可される', () => {
      process.env.NODE_ENV = 'development';

      const request = new Request('http://localhost', {
        headers: {
          origin: 'http://localhost:3000',
        },
      });

      const result = validateOrigin(request);
      expect(result.valid).toBe(true);
    });

    it('本番環境でOriginなしは拒否される', () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_APP_URL = 'https://momo-payment.example.com';

      const request = new Request('http://localhost');

      const result = validateOrigin(request);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Missing origin header');
    });

    it('開発環境でもOriginなしは拒否される', () => {
      process.env.NODE_ENV = 'development';

      const request = new Request('http://localhost');

      const result = validateOrigin(request);
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Missing origin header');
    });

    it('RefererヘッダーでOriginを代替チェックできる', () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://momo-payment.example.com';
      process.env.NODE_ENV = 'production';

      const request = new Request('http://localhost', {
        headers: {
          referer: 'https://momo-payment.example.com/checkout',
        },
      });

      const result = validateOrigin(request);
      expect(result.valid).toBe(true);
      expect(result.origin).toBe('https://momo-payment.example.com');
    });
  });

  describe('requiresCsrfCheck', () => {
    it('Webhookエンドポイントは除外される', () => {
      expect(requiresCsrfCheck('/api/webhooks/stripe')).toBe(false);
      expect(requiresCsrfCheck('/api/webhooks/square')).toBe(false);
    });

    it('通常のAPIエンドポイントはチェック対象', () => {
      expect(requiresCsrfCheck('/api/orders/pickup')).toBe(true);
      expect(requiresCsrfCheck('/api/orders/shipping')).toBe(true);
      expect(requiresCsrfCheck('/api/admin/orders')).toBe(true);
    });
  });
});
