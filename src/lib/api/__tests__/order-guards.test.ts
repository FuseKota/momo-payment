import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock dependencies before importing
vi.mock('@/lib/security/rate-limit', () => ({
  checkOrderRateLimit: vi.fn(),
  getClientIP: vi.fn(() => '127.0.0.1'),
}));

vi.mock('@/lib/security/csrf', () => ({
  validateOrigin: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/logging/secure-logger', () => ({
  secureLog: vi.fn(),
}));

import { orderGuard } from '../order-guards';
import { checkOrderRateLimit } from '@/lib/security/rate-limit';
import { validateOrigin } from '@/lib/security/csrf';
import { createClient } from '@/lib/supabase/server';

const createMockRequest = () =>
  new NextRequest('http://localhost:3000/api/orders/pickup', {
    method: 'POST',
    headers: { origin: 'http://localhost:3000' },
  });

describe('orderGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('レート制限超過で429を返す', async () => {
    vi.mocked(checkOrderRateLimit).mockReturnValue({
      allowed: false,
      remaining: 0,
      resetIn: 30,
    });

    const result = await orderGuard(createMockRequest());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(429);
    }
  });

  it('CSRF検証失敗で403を返す', async () => {
    vi.mocked(checkOrderRateLimit).mockReturnValue({
      allowed: true,
      remaining: 9,
      resetIn: 60,
    });
    vi.mocked(validateOrigin).mockReturnValue({
      valid: false,
      origin: 'http://evil.com',
      reason: 'Origin not allowed',
    });

    const result = await orderGuard(createMockRequest());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it('全チェック通過で成功を返す（ゲストユーザー）', async () => {
    vi.mocked(checkOrderRateLimit).mockReturnValue({
      allowed: true,
      remaining: 9,
      resetIn: 60,
    });
    vi.mocked(validateOrigin).mockReturnValue({
      valid: true,
      origin: 'http://localhost:3000',
    });
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const result = await orderGuard(createMockRequest());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.clientIP).toBe('127.0.0.1');
      expect(result.userId).toBeNull();
    }
  });

  it('ログインユーザーのuser_idを取得する', async () => {
    vi.mocked(checkOrderRateLimit).mockReturnValue({
      allowed: true,
      remaining: 9,
      resetIn: 60,
    });
    vi.mocked(validateOrigin).mockReturnValue({
      valid: true,
      origin: 'http://localhost:3000',
    });
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const result = await orderGuard(createMockRequest());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBe('user-123');
    }
  });

  it('認証エラーでもユーザーIDはnullで成功する', async () => {
    vi.mocked(checkOrderRateLimit).mockReturnValue({
      allowed: true,
      remaining: 9,
      resetIn: 60,
    });
    vi.mocked(validateOrigin).mockReturnValue({
      valid: true,
      origin: 'http://localhost:3000',
    });
    vi.mocked(createClient).mockRejectedValue(new Error('auth error'));

    const result = await orderGuard(createMockRequest());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.userId).toBeNull();
    }
  });
});
