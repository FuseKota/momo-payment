import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * 発送登録API（POST /api/admin/orders/[id]/ship）の単体テスト。
 *
 * supabaseAdmin.from(table) を操作で切り替える:
 * - orders.select(...).eq().single()  → 注文取得 / メール用注文取得（同一注文を返す）
 * - shipments.insert(...)             → 発送レコード作成（await で { error } を受ける）
 * - orders.update(...).eq()           → ステータス更新（await で { error } を受ける）
 *
 * 回帰: orders.update には存在しない shipped_at 列を含めない（status のみ）。
 */

const state: {
  orderResult: { data: unknown; error: unknown };
  shipmentInsertResult: { error: unknown };
  orderUpdateResult: { error: unknown };
} = {
  orderResult: { data: null, error: null },
  shipmentInsertResult: { error: null },
  orderUpdateResult: { error: null },
};

const mockShipmentInsert = vi.fn();
const mockOrderUpdate = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve(state.orderResult),
        }),
      }),
      insert: (...args: unknown[]) => {
        mockShipmentInsert(...args);
        return Promise.resolve(state.shipmentInsertResult);
      },
      update: (...args: unknown[]) => {
        mockOrderUpdate(...args);
        return { eq: () => Promise.resolve(state.orderUpdateResult) };
      },
    }),
  },
}));

vi.mock('@/lib/api/admin-guards', () => ({
  adminWriteGuard: vi.fn().mockResolvedValue({ ok: true, userId: 'admin-1' }),
}));

const mockSendShippingEmail = vi.fn().mockResolvedValue({ success: true });
vi.mock('@/lib/email/resend', () => ({
  sendShippingNotificationEmail: (...args: unknown[]) => mockSendShippingEmail(...args),
}));

const mockWriteAuditLog = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/logging/audit-log', () => ({
  writeAuditLog: (...args: unknown[]) => mockWriteAuditLog(...args),
}));

vi.mock('@/lib/logging/secure-logger', () => ({
  secureLog: vi.fn(),
  safeErrorLog: vi.fn((e) => e),
}));

// uuidSchema / adminShipSchema / formatValidationErrors は実物を使う

import { POST } from '@/app/api/admin/orders/[id]/ship/route';
import { NextRequest } from 'next/server';

const ORDER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function makeRequest(body: Record<string, unknown> = { carrier: 'yamato', trackingNo: '1234-5678' }): NextRequest {
  return new NextRequest(`http://localhost:3000/api/admin/orders/${ORDER_ID}/ship`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeParams(id: string = ORDER_ID) {
  return { params: Promise.resolve({ id }) };
}

function baseOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    status: 'PAID',
    order_type: 'SHIPPING',
    order_no: 'ORD-001',
    customer_name: 'テスト太郎',
    customer_email: 'test@example.com',
    ...overrides,
  };
}

describe('POST /api/admin/orders/[id]/ship', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.orderResult = { data: baseOrder(), error: null };
    state.shipmentInsertResult = { error: null };
    state.orderUpdateResult = { error: null };
  });

  it('正常系: PAID/SHIPPING を発送登録して 200・SHIPPED', async () => {
    const res = await POST(makeRequest(), makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.data.status).toBe('SHIPPED');
    expect(data.data.trackingNo).toBe('1234-5678');
    // shipments に shipped_at 付きで insert される
    expect(mockShipmentInsert).toHaveBeenCalledTimes(1);
    expect(mockShipmentInsert.mock.calls[0][0]).toMatchObject({
      order_id: ORDER_ID,
      carrier: 'yamato',
      tracking_no: '1234-5678',
    });
    expect(mockShipmentInsert.mock.calls[0][0].shipped_at).toBeTruthy();
  });

  it('回帰: orders.update は { status: "SHIPPED" } のみで shipped_at を含めない', async () => {
    await POST(makeRequest(), makeParams());

    expect(mockOrderUpdate).toHaveBeenCalledTimes(1);
    const updatePayload = mockOrderUpdate.mock.calls[0][0];
    expect(updatePayload).toEqual({ status: 'SHIPPED' });
    expect(updatePayload).not.toHaveProperty('shipped_at');
  });

  it('配送以外の注文は 400 not_shipping_order', async () => {
    state.orderResult = { data: baseOrder({ order_type: 'OTHER' }), error: null };

    const res = await POST(makeRequest(), makeParams());
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('not_shipping_order');
    expect(mockShipmentInsert).not.toHaveBeenCalled();
  });

  it('PAID/PACKING 以外のステータスは 400 invalid_status', async () => {
    state.orderResult = { data: baseOrder({ status: 'PENDING_PAYMENT' }), error: null };

    const res = await POST(makeRequest(), makeParams());
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('invalid_status');
    expect(mockShipmentInsert).not.toHaveBeenCalled();
  });

  it('注文が存在しない場合は 404 order_not_found', async () => {
    state.orderResult = { data: null, error: { message: 'not found' } };

    const res = await POST(makeRequest(), makeParams());
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('order_not_found');
  });

  it('shipments insert 失敗時は 500 shipment_create_failed', async () => {
    state.shipmentInsertResult = { error: { message: 'insert failed' } };

    const res = await POST(makeRequest(), makeParams());
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('shipment_create_failed');
    expect(mockOrderUpdate).not.toHaveBeenCalled();
  });

  it('入力不正（carrier/trackingNo欠落）は 400 validation_error', async () => {
    const res = await POST(makeRequest({ carrier: '' }), makeParams());
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('validation_error');
    expect(mockShipmentInsert).not.toHaveBeenCalled();
  });
});
