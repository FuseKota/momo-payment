import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockRpc = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({ rpc: mockRpc }),
}));

import { checkRateLimit, getClientIP } from '../rate-limit';

describe('rate-limit', () => {
  beforeEach(() => {
    mockRpc.mockReset();
  });

  describe('checkRateLimit (Supabase RPC)', () => {
    it('許可レスポンスを正しく返す', async () => {
      mockRpc.mockResolvedValue({
        data: [{ allowed: true, remaining: 9, reset_in: 60 }],
        error: null,
      });

      const result = await checkRateLimit('test-ip', 10, 60000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
      expect(result.resetIn).toBe(60);
    });

    it('拒否レスポンスを正しく返す', async () => {
      mockRpc.mockResolvedValue({
        data: [{ allowed: false, remaining: 0, reset_in: 30 }],
        error: null,
      });

      const result = await checkRateLimit('test-ip', 10, 60000);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.resetIn).toBe(30);
    });

    it('DB エラー時はフェイルオープンで許可する', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: { message: 'connection refused' },
      });

      const result = await checkRateLimit('test-ip', 10, 60000);
      expect(result.allowed).toBe(true);
    });

    it('例外時もフェイルオープンで許可する', async () => {
      mockRpc.mockRejectedValue(new Error('network error'));

      const result = await checkRateLimit('test-ip', 10, 60000);
      expect(result.allowed).toBe(true);
    });

    it('RPC に識別子・limit・window を渡す', async () => {
      mockRpc.mockResolvedValue({
        data: [{ allowed: true, remaining: 5, reset_in: 60 }],
        error: null,
      });

      await checkRateLimit('custom-id', 10, 60000);
      expect(mockRpc).toHaveBeenCalledWith('check_rate_limit', {
        p_identifier: 'custom-id',
        p_limit: 10,
        p_window_seconds: 60,
      });
    });
  });

  describe('getClientIP', () => {
    function createRequest(headers: Record<string, string>): Request {
      return new Request('http://localhost', { headers });
    }

    it('x-nf-client-connection-ip を最優先する (Netlify)', () => {
      const req = createRequest({
        'x-nf-client-connection-ip': '10.0.0.1',
        'x-real-ip': '10.0.0.2',
        'x-forwarded-for': '10.0.0.3',
      });
      expect(getClientIP(req)).toBe('10.0.0.1');
    });

    it('x-real-ip を使う (Vercel)', () => {
      const req = createRequest({
        'x-real-ip': '192.168.1.1',
        'x-forwarded-for': '10.0.0.3',
      });
      expect(getClientIP(req)).toBe('192.168.1.1');
    });

    it('x-forwarded-for の最初の IP を使う', () => {
      const req = createRequest({
        'x-forwarded-for': '203.0.113.1, 10.0.0.1',
      });
      expect(getClientIP(req)).toBe('203.0.113.1');
    });

    it('ヘッダーがない場合は "unknown" を返す', () => {
      const req = createRequest({});
      expect(getClientIP(req)).toBe('unknown');
    });
  });
});
