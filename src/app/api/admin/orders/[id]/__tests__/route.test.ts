import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * 管理者：注文詳細 GET / ステータス更新 PATCH（/api/admin/orders/[id]）の単体テスト。
 *
 * 回帰観点:
 * - GET: shipping_addresses（PostgREST one-to-one = 単一オブジェクト）を shipping_* に平坦化。
 * - GET: payment_status を paid_at / payments から導出。発送情報を shipments から平坦化。
 * - PATCH: orders に存在しない列（shipped_at 等）を書かず status のみ更新。
 * - PATCH: SHIPPED は専用 /ship を使うため拒否（use_ship_endpoint）。
 */

const state: {
  orderResult: { data: unknown; error: unknown };
  updateResult: { data: unknown; error: unknown };
} = {
  orderResult: { data: null, error: null },
  updateResult: { data: null, error: null },
};

const mockUpdate = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve(state.orderResult),
        }),
      }),
      update: (...args: unknown[]) => {
        mockUpdate(...args);
        return {
          eq: () => ({
            select: () => ({
              single: () => Promise.resolve(state.updateResult),
            }),
          }),
        };
      },
    }),
  }),
}));

vi.mock('@/lib/auth/require-admin', () => ({
  requireAdmin: vi.fn().mockResolvedValue({ authorized: true }),
}));

vi.mock('@/lib/api/admin-guards', () => ({
  adminWriteGuard: vi.fn().mockResolvedValue({ ok: true, userId: 'admin-1' }),
}));

vi.mock('@/lib/logging/audit-log', () => ({
  writeAuditLog: vi.fn().mockResolvedValue(undefined),
}));

import { GET, PATCH } from '@/app/api/admin/orders/[id]/route';
import { NextRequest } from 'next/server';

const ORDER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function makeParams(id: string = ORDER_ID) {
  return { params: Promise.resolve({ id }) };
}

function patchRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost:3000/api/admin/orders/${ORDER_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/admin/orders/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shipping_addresses が単一オブジェクトでも shipping_* に平坦化する', async () => {
    state.orderResult = {
      data: {
        id: 'order-1',
        order_no: 'ORD-001',
        status: 'PAID',
        paid_at: '2026-06-20T00:00:00Z',
        payments: [{ status: 'SUCCEEDED' }],
        // PostgREST は UNIQUE FK を one-to-one と判定しオブジェクトで返す
        shipping_addresses: {
          postal_code: '1000001',
          pref: '東京都',
          city: '千代田区',
          address1: '千代田1-1',
          address2: '101',
          recipient_name: '受取太郎',
          recipient_phone: '0312345678',
        },
        shipments: [{ carrier: 'yamato', tracking_no: '1234-5678', shipped_at: '2026-06-21T00:00:00Z' }],
      },
      error: null,
    };

    const res = await GET(new Request('http://localhost'), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.shipping_postal_code).toBe('1000001');
    expect(body.shipping_prefecture).toBe('東京都');
    expect(body.shipping_address1).toBe('千代田1-1');
    // 平坦化後は埋め込みオブジェクトは残さない
    expect(body.shipping_addresses).toBeUndefined();
    // 決済状況の導出
    expect(body.payment_status).toBe('PAID');
    // 発送情報を shipments から平坦化
    expect(body.tracking_number).toBe('1234-5678');
    expect(body.shipped_at).toBe('2026-06-21T00:00:00Z');
  });

  it('未決済・住所/発送なしでも payment_status と null を返す', async () => {
    state.orderResult = {
      data: {
        id: 'order-2',
        order_no: 'ORD-002',
        status: 'PENDING_PAYMENT',
        paid_at: null,
        payments: [],
        shipping_addresses: null,
        shipments: [],
      },
      error: null,
    };

    const res = await GET(new Request('http://localhost'), makeParams());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.payment_status).toBe('PENDING_PAYMENT');
    expect(body.shipping_postal_code).toBeNull();
    expect(body.tracking_number).toBeNull();
    expect(body.shipped_at).toBeNull();
  });

  it('注文が無ければ 404', async () => {
    state.orderResult = { data: null, error: { message: 'not found' } };
    const res = await GET(new Request('http://localhost'), makeParams());
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/admin/orders/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.updateResult = { data: { id: 'order-1', order_no: 'ORD-001', status: 'PACKING' }, error: null };
  });

  it('回帰: status のみ更新し、存在しない列を書き込まない', async () => {
    const res = await PATCH(patchRequest({ status: 'PACKING' }), makeParams());

    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate.mock.calls[0][0]).toEqual({ status: 'PACKING' });
  });

  it('SHIPPED は専用エンドポイントが必要なため 400 use_ship_endpoint', async () => {
    const res = await PATCH(patchRequest({ status: 'SHIPPED' }), makeParams());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('use_ship_endpoint');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('status が無ければ 400 no_updatable_fields', async () => {
    const res = await PATCH(patchRequest({}), makeParams());
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe('no_updatable_fields');
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
