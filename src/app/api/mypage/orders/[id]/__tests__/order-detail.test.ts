import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * マイページ注文詳細API（GET /api/mypage/orders/[id]）の単体テスト。
 *
 * getSupabaseAdmin() が返すクライアントの from(table) を差し替える。
 * - orders.select(...).eq('id').eq('user_id').single()  → 注文取得（{ data, error }）
 *
 * 所有者チェックは .eq('user_id', userId) によりDB側で行われるため、
 * 他人の注文や存在しない注文は single() の error（404）として表現する。
 *
 * uuidSchema は実物を使う（モックしない）。
 */

const state: {
  orderResult: { data: unknown; error: unknown };
} = {
  orderResult: { data: null, error: null },
};

const mockRequireCustomer = vi.fn(async () => ({
  authorized: true as const,
  userId: 'user-1',
}));
vi.mock('@/lib/auth/require-customer', () => ({
  requireCustomer: () => mockRequireCustomer(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () => Promise.resolve(state.orderResult),
          }),
        }),
      }),
    }),
  }),
}));

import { GET } from '@/app/api/mypage/orders/[id]/route';

const ORDER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function makeParams(id: string = ORDER_ID) {
  return { params: Promise.resolve({ id }) };
}

function baseOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
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
    shipping_addresses: [],
    shipments: [],
    ...overrides,
  };
}

describe('GET /api/mypage/orders/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.orderResult = { data: baseOrder(), error: null };
    mockRequireCustomer.mockResolvedValue({ authorized: true, userId: 'user-1' });
  });

  it('未認証は 401 unauthorized', async () => {
    const { NextResponse } = await import('next/server');
    mockRequireCustomer.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    } as never);

    const res = await GET(new Request('http://localhost:3000'), makeParams());
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('unauthorized');
  });

  it('UUID形式でないIDは 400 Invalid order ID', async () => {
    const res = await GET(new Request('http://localhost:3000'), makeParams('not-a-uuid'));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid order ID');
  });

  it('正常系: 本人の注文詳細を 200 で返す', async () => {
    const res = await GET(new Request('http://localhost:3000'), makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.order_no).toBe('ORD-001');
    expect(data).toHaveProperty('shipping_addresses');
    expect(data).toHaveProperty('shipments');
  });

  it('他人の注文/存在しない注文は single() error で 404 Order not found', async () => {
    state.orderResult = { data: null, error: { message: 'not found' } };

    const res = await GET(new Request('http://localhost:3000'), makeParams());
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Order not found');
  });
});
