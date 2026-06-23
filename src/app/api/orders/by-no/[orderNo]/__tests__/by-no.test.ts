import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * 注文照会API（GET /api/orders/by-no/[orderNo]）の単体テスト。
 * アクセス制御（ログイン本人 / lookup_token / ゲスト）を中心に検証する。
 */

const state: {
  orderResult: { data: unknown; error: unknown };
  currentUser: { id: string } | null;
  rateAllowed: boolean;
} = {
  orderResult: { data: null, error: null },
  currentUser: null,
  rateAllowed: true,
};

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve(state.orderResult),
        }),
      }),
    }),
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: state.currentUser } }) },
  })),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkRateLimit: vi.fn(async () => ({ allowed: state.rateAllowed, resetIn: 30 })),
  getClientIP: () => '1.2.3.4',
}));

vi.mock('@/lib/logging/secure-logger', () => ({
  secureLog: vi.fn(),
  safeErrorLog: vi.fn((e) => e),
}));

import { GET } from '@/app/api/orders/by-no/[orderNo]/route';
import { NextRequest } from 'next/server';

function makeReq(orderNo: string, token?: string): NextRequest {
  const url = new URL(`http://localhost:3000/api/orders/by-no/${orderNo}`);
  if (token) url.searchParams.set('token', token);
  return new NextRequest(url);
}

function makeParams(orderNo: string) {
  return { params: Promise.resolve({ orderNo }) };
}

function baseOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    order_no: 'ORD-001',
    order_type: 'SHIPPING',
    status: 'PAID',
    payment_method: 'STRIPE',
    temp_zone: 'FROZEN',
    subtotal_yen: 1000,
    shipping_fee_yen: 0,
    total_yen: 1000,
    customer_name: 'テスト太郎',
    delivery_date: null,
    delivery_time_slot: null,
    created_at: '2026-06-17T10:00:00Z',
    user_id: null,
    lookup_token: 'secret-token-123',
    order_items: [],
    ...overrides,
  };
}

describe('GET /api/orders/by-no/[orderNo]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.orderResult = { data: baseOrder(), error: null };
    state.currentUser = null;
    state.rateAllowed = true;
  });

  it('rate limit 超過は 429', async () => {
    state.rateAllowed = false;
    const res = await GET(makeReq('ORD-001'), makeParams('ORD-001'));
    expect(res.status).toBe(429);
  });

  it('注文が存在しなければ 404', async () => {
    state.orderResult = { data: null, error: { message: 'not found' } };
    const res = await GET(makeReq('ORD-404', 'secret-token-123'), makeParams('ORD-404'));
    const data = await res.json();
    expect(res.status).toBe(404);
    expect(data.error).toBe('order_not_found');
  });

  it('ゲスト注文 + 有効トークンは 200・内部フィールドを除去', async () => {
    state.orderResult = { data: baseOrder({ user_id: null }), error: null };
    const res = await GET(makeReq('ORD-001', 'secret-token-123'), makeParams('ORD-001'));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.data.order_no).toBe('ORD-001');
    // 内部フィールドは漏らさない
    expect(data.data).not.toHaveProperty('user_id');
    expect(data.data).not.toHaveProperty('lookup_token');
  });

  it('ゲスト注文 + トークン無しは 404', async () => {
    state.orderResult = { data: baseOrder({ user_id: null }), error: null };
    const res = await GET(makeReq('ORD-001'), makeParams('ORD-001'));
    expect(res.status).toBe(404);
  });

  it('ゲスト注文 + 誤ったトークンは 404', async () => {
    state.orderResult = { data: baseOrder({ user_id: null }), error: null };
    const res = await GET(makeReq('ORD-001', 'wrong-token'), makeParams('ORD-001'));
    expect(res.status).toBe(404);
  });

  it('ユーザー注文 + 本人ログインは 200', async () => {
    state.orderResult = { data: baseOrder({ user_id: 'user-1' }), error: null };
    state.currentUser = { id: 'user-1' };
    const res = await GET(makeReq('ORD-001'), makeParams('ORD-001'));
    expect(res.status).toBe(200);
  });

  it('ユーザー注文 + 別人 + トークン無しは 404', async () => {
    state.orderResult = { data: baseOrder({ user_id: 'user-1' }), error: null };
    state.currentUser = { id: 'other-user' };
    const res = await GET(makeReq('ORD-001'), makeParams('ORD-001'));
    expect(res.status).toBe(404);
  });

  it('ユーザー注文 + 別人でも有効トークンがあれば 200', async () => {
    state.orderResult = { data: baseOrder({ user_id: 'user-1' }), error: null };
    state.currentUser = { id: 'other-user' };
    const res = await GET(makeReq('ORD-001', 'secret-token-123'), makeParams('ORD-001'));
    expect(res.status).toBe(200);
  });
});
