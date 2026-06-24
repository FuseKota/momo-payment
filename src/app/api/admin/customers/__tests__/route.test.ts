import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * 顧客マスタ一覧API（GET /api/admin/customers）の単体テスト。
 *
 * 認証は requireAdmin をモックし、Supabase は getSupabaseAdmin().rpc('admin_list_customers')
 * をモックして RPC 返却を差し替える。adminCustomersQuerySchema / formatValidationErrors は
 * 実物を使う。
 */

const state: {
  authResult: { authorized: boolean; userId?: string; response?: unknown };
  rpcResult: { data: unknown; error: unknown };
} = {
  authResult: { authorized: true, userId: 'admin-1' },
  rpcResult: { data: [], error: null },
};

const mockRpc = vi.fn(async () => state.rpcResult);

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({ rpc: mockRpc }),
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

import { GET } from '@/app/api/admin/customers/route';
import { NextResponse } from 'next/server';

function makeRequest(query: Record<string, string> = {}): Request {
  const url = new URL('http://localhost:3000/api/admin/customers');
  for (const [k, v] of Object.entries(query)) {
    url.searchParams.set(k, v);
  }
  return new Request(url);
}

function baseRow(overrides: Record<string, unknown> = {}) {
  return {
    user_id: 'user-1',
    display_name: 'テスト太郎',
    email: 'taro@example.com',
    phone: '09012345678',
    registered_at: '2026-06-01T10:00:00Z',
    order_count: 3,
    total_spent_yen: 12000,
    last_order_at: '2026-06-20T10:00:00Z',
    total_count: 1,
    ...overrides,
  };
}

describe('GET /api/admin/customers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.authResult = { authorized: true, userId: 'admin-1' };
    state.rpcResult = { data: [baseRow()], error: null };
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
    expect(mockRpc).not.toHaveBeenCalled();
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

  it('正常系: 一覧と total/limit/offset を返し、total_count は行から除かれる', async () => {
    const res = await GET(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.customers).toHaveLength(1);
    expect(data.customers[0].user_id).toBe('user-1');
    expect(data.customers[0].order_count).toBe(3);
    expect(data.customers[0].total_spent_yen).toBe(12000);
    // total_count は外部に漏らさない
    expect(data.customers[0].total_count).toBeUndefined();
    // window count から total を取得
    expect(data.total).toBe(1);
    // schema デフォルト
    expect(data.limit).toBe(20);
    expect(data.offset).toBe(0);
    // RPC にデフォルトのページネーションが渡る
    expect(mockRpc).toHaveBeenCalledWith('admin_list_customers', {
      p_search: null,
      p_limit: 20,
      p_offset: 0,
    });
  });

  it('検索語 q が p_search として RPC に渡る', async () => {
    await GET(makeRequest({ q: 'taro' }));
    expect(mockRpc).toHaveBeenCalledWith('admin_list_customers', {
      p_search: 'taro',
      p_limit: 20,
      p_offset: 0,
    });
  });

  it('limit/offset を指定すると RPC と返却値に反映される', async () => {
    const res = await GET(makeRequest({ limit: '10', offset: '20' }));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.limit).toBe(10);
    expect(data.offset).toBe(20);
    expect(mockRpc).toHaveBeenCalledWith('admin_list_customers', {
      p_search: null,
      p_limit: 10,
      p_offset: 20,
    });
  });

  it('0件のときは total が 0 になる', async () => {
    state.rpcResult = { data: [], error: null };
    const res = await GET(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.customers).toHaveLength(0);
    expect(data.total).toBe(0);
  });

  it('不正な limit はバリデーションエラー(400)になる', async () => {
    const res = await GET(makeRequest({ limit: '0' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('validation_error');
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('RPC エラー時は 500 を返す', async () => {
    state.rpcResult = { data: null, error: { message: 'boom' } };
    const res = await GET(makeRequest());

    expect(res.status).toBe(500);
  });
});
