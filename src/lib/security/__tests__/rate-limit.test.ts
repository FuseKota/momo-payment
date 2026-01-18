/**
 * レート制限のユニットテスト
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, checkOrderRateLimit, resetRateLimit, getClientIP } from '../rate-limit';

describe('rate-limit', () => {
  beforeEach(() => {
    // 各テスト前にレート制限をリセット
    resetRateLimit();
  });

  describe('checkRateLimit', () => {
    it('最初のリクエストは許可される', () => {
      const result = checkRateLimit('test-ip', 10, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('制限内のリクエストは許可される', () => {
      for (let i = 0; i < 10; i++) {
        const result = checkRateLimit('test-ip', 10, 60000);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(9 - i);
      }
    });

    it('制限を超えたリクエストは拒否される', () => {
      // 10回のリクエスト
      for (let i = 0; i < 10; i++) {
        checkRateLimit('test-ip', 10, 60000);
      }

      // 11回目は拒否
      const result = checkRateLimit('test-ip', 10, 60000);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('異なるIPは独立してカウントされる', () => {
      // IP1で10回
      for (let i = 0; i < 10; i++) {
        checkRateLimit('ip-1', 10, 60000);
      }

      // IP2は制限されていない
      const result = checkRateLimit('ip-2', 10, 60000);
      expect(result.allowed).toBe(true);
    });

    it('リセット後は再び許可される', () => {
      for (let i = 0; i < 10; i++) {
        checkRateLimit('test-ip', 10, 60000);
      }

      // 制限超過
      expect(checkRateLimit('test-ip', 10, 60000).allowed).toBe(false);

      // リセット
      resetRateLimit('order:test-ip');
      resetRateLimit('test-ip');

      // 再び許可
      expect(checkRateLimit('test-ip', 10, 60000).allowed).toBe(true);
    });
  });

  describe('checkOrderRateLimit', () => {
    it('注文APIのレート制限（10req/min）が適用される', () => {
      // 10回は許可
      for (let i = 0; i < 10; i++) {
        const result = checkOrderRateLimit('192.168.1.1');
        expect(result.allowed).toBe(true);
      }

      // 11回目は拒否
      const result = checkOrderRateLimit('192.168.1.1');
      expect(result.allowed).toBe(false);
    });
  });

  describe('getClientIP', () => {
    it('x-forwarded-forヘッダーからIPを取得', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      });
      expect(getClientIP(request)).toBe('192.168.1.1');
    });

    it('x-real-ipヘッダーからIPを取得', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-real-ip': '192.168.1.2',
        },
      });
      expect(getClientIP(request)).toBe('192.168.1.2');
    });

    it('ヘッダーがない場合はunknownを返す', () => {
      const request = new Request('http://localhost');
      expect(getClientIP(request)).toBe('unknown');
    });
  });
});
