import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * マイページ注文一覧API（GET /api/mypage/orders）の単体テスト。
 *
 * getSupabaseAdmin() が返すクライアントの from(table) を差し替える。
 * - orders.select(...).eq('user_id').order('created_at')  → 一覧取得（await で { data, error }）
 *
 * 認証ガード requireCustomer はモックして authorized / unauthorized を切り替える。
 */

const state: {
  ordersResult: { data: unknown; error: unknown };
} = {
  ordersResult: { data: null, error: null },
};

// requireCustomer: 既定で認証OK
const mockRequireCustomer = vi.fn(async () => ({
  authorized: true as const,
  userId: 'user-1',
}));
vi.mock('@/lib/auth/require-customer', () => ({
  requireCustomer: () => mockRequireCustomer(),
}));

// getSupabaseAdmin: orders 一覧クエリチェーン
const mockOrdersSelect = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: (...args: unknown[]) => {
        mockOrdersSelect(...args);
        return {
          eq: () => ({
            order: () => Promise.resolve(state.ordersResult),
          }),
        };
      },
    }),
  }),
}));

import { GET } from '@/app/api/mypage/orders/route';

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
    customer_phone: '090-1234-5678',
    customer_email: 'test@example.com',
    delivery_date: null,
    delivery_time_slot: null,
    agreement_accepted: true,
    user_id: 'user-1',
    locale: 'ja',
    paid_at: '2026-06-17T10:00:00Z',
    created_at: '2026-06-17T10:00:00Z',
    updated_at: '2026-06-17T10:00:00Z',
    order_items: [],
    ...overrides,
  };
}

describe('GET /api/mypage/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.ordersResult = { data: [baseOrder()], error: null };
    mockRequireCustomer.mockResolvedValue({ authorized: true, userId: 'user-1' });
  });

  it('未認証は 401 unauthorized（ガードのresponseをそのまま返す）', async () => {
    const { NextResponse } = await import('next/server');
    mockRequireCustomer.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    } as never);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('unauthorized');
  });

  it('正常系: ログインユーザーの注文一覧を 200 で返す', async () => {
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(1);
    expect(data[0].order_no).toBe('ORD-001');
  });

  it('正常系: 注文が0件なら空配列を返す（data=null）', async () => {
    state.ordersResult = { data: null, error: null };

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual([]);
  });

  it('DBエラー時は 500 Internal server error', async () => {
    state.ordersResult = { data: null, error: { message: 'db error' } };

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
