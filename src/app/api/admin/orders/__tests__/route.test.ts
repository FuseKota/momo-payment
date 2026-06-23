import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * 注文一覧API（GET /api/admin/orders）の単体テスト。
 *
 * 認証は requireAdmin をモックし、Supabase は getSupabaseAdmin().from('orders')
 * のクエリビルダ（select → order → eq/gte/lte/or → range で連結し最後に await）を
 * チェーン可能なモックで再現する。
 * adminOrdersQuerySchema / formatValidationErrors は実物を使う。
 */

// --- Supabase クエリビルダのモック ---
// チェーンの全メソッドは this を返し、await（then）で state.queryResult を解決する。
const state: {
  authResult: { authorized: boolean; userId?: string; response?: unknown };
  queryResult: { data: unknown; error: unknown; count: number | null };
} = {
  authResult: { authorized: true, userId: 'admin-1' },
  queryResult: { data: [], error: null, count: 0 },
};

// クエリビルダに渡された呼び出しを記録するスパイ
const spies = {
  select: vi.fn(),
  order: vi.fn(),
  eq: vi.fn(),
  gte: vi.fn(),
  lte: vi.fn(),
  or: vi.fn(),
  range: vi.fn(),
};

function makeQueryBuilder() {
  const builder: Record<string, unknown> = {};
  const chainMethods = ['select', 'order', 'eq', 'gte', 'lte', 'or', 'range'] as const;
  for (const method of chainMethods) {
    builder[method] = (...args: unknown[]) => {
      spies[method](...args);
      return builder;
    };
  }
  // await query で解決される（PromiseLike）
  builder.then = (resolve: (value: unknown) => unknown) => resolve(state.queryResult);
  return builder;
}

const mockFrom = vi.fn(() => makeQueryBuilder());

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}));

vi.mock('@/lib/auth/require-admin', () => ({
  requireAdmin: vi.fn(async () => {
    if (state.authResult.authorized) {
      return { authorized: true, userId: state.authResult.userId };
    }
    return { authorized: false, response: state.authResult.response };
  }),
}));

vi.mock('@/lib/logging/secure-logger', () => ({
  secureLog: vi.fn(),
  safeErrorLog: vi.fn((e) => e),
}));

// adminOrdersQuerySchema / formatValidationErrors は実物を使う

import { GET } from '@/app/api/admin/orders/route';
import { NextResponse } from 'next/server';

function makeRequest(query: Record<string, string> = {}): Request {
  const url = new URL('http://localhost:3000/api/admin/orders');
  for (const [k, v] of Object.entries(query)) {
    url.searchParams.set(k, v);
  }
  return new Request(url);
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
    created_at: '2026-06-17T10:00:00Z',
    order_items: [],
    shipments: [],
    ...overrides,
  };
}

describe('GET /api/admin/orders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.authResult = { authorized: true, userId: 'admin-1' };
    state.queryResult = { data: [baseOrder()], error: null, count: 1 };
  });

  it('未認証は requireAdmin の 401 をそのまま返す', async () => {
    state.authResult = {
      authorized: false,
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    };

    const res = await GET(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('unauthorized');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('管理者以外は requireAdmin の 403 をそのまま返す', async () => {
    state.authResult = {
      authorized: false,
      response: NextResponse.json({ error: 'forbidden' }, { status: 403 }),
    };

    const res = await GET(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe('forbidden');
  });

  it('正常系: フィルタ無しで一覧と total/limit/offset を返す', async () => {
    const res = await GET(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.orders).toHaveLength(1);
    expect(data.orders[0].order_no).toBe('ORD-001');
    expect(data.total).toBe(1);
    // schema デフォルト
    expect(data.limit).toBe(20);
    expect(data.offset).toBe(0);
    // デフォルトページネーション range(0, 19)
    expect(spies.range).toHaveBeenCalledWith(0, 19);
    // フィルタ未指定なので eq/gte/lte/or は呼ばれない
    expect(spies.eq).not.toHaveBeenCalled();
    expect(spies.or).not.toHaveBeenCalled();
  });

  it('type/status フィルタが eq に反映される', async () => {
    const res = await GET(makeRequest({ type: 'SHIPPING', status: 'PAID' }));
    expect(res.status).toBe(200);

    expect(spies.eq).toHaveBeenCalledWith('order_type', 'SHIPPING');
    expect(spies.eq).toHaveBeenCalledWith('status', 'PAID');
  });

  it('from/to フィルタが gte/lte に反映される', async () => {
    const res = await GET(makeRequest({ from: '2026-06-01', to: '2026-06-30' }));
    expect(res.status).toBe(200);

    expect(spies.gte).toHaveBeenCalledWith('created_at', '2026-06-01T00:00:00+09:00');
    expect(spies.lte).toHaveBeenCalledWith('created_at', '2026-06-30T23:59:59.999+09:00');
  });

  it('q フィルタは ilike パターンで or に反映され、特殊文字はエスケープされる', async () => {
    const res = await GET(makeRequest({ q: 'a,b%c' }));
    expect(res.status).toBe(200);

    expect(spies.or).toHaveBeenCalledTimes(1);
    const orArg = spies.or.mock.calls[0][0] as string;
    // % , はバックスラッシュでエスケープされる
    expect(orArg).toContain('order_no.ilike.%a\\,b\\%c%');
    expect(orArg).toContain('customer_name.ilike.');
    expect(orArg).toContain('customer_email.ilike.');
  });

  it('limit/offset を指定すると range と返却値に反映される', async () => {
    const res = await GET(makeRequest({ limit: '10', offset: '20' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.limit).toBe(10);
    expect(data.offset).toBe(20);
    // range(offset, offset + limit - 1)
    expect(spies.range).toHaveBeenCalledWith(20, 29);
  });

  it('不正なクエリ（範囲外 limit）は 400 validation_error', async () => {
    const res = await GET(makeRequest({ limit: '0' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('validation_error');
    expect(data.details).toBeDefined();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('不正なクエリ（許可外 status）は 400 validation_error', async () => {
    const res = await GET(makeRequest({ status: 'NOPE' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('validation_error');
  });

  it('DBエラー時は 500 Internal server error', async () => {
    state.queryResult = { data: null, error: { message: 'db down' }, count: null };

    const res = await GET(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
