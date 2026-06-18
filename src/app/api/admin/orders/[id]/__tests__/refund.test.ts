import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * 全額返金API（POST /api/admin/orders/[id]/refund）の単体テスト。
 *
 * supabaseAdmin.from(table) はテーブル名で返り値を切り替える。
 * - orders  : select → 注文取得（.eq().single()） / update → REFUNDED 更新（.eq().eq().select().maybeSingle()）
 * - payments : select → payment 取得（.eq().maybeSingle()） / update → REFUNDED 更新（.eq() を await）
 *
 * orderResult / paymentResult / orderUpdateResult / paymentUpdateResult を
 * 各テストで差し替えてケースを表現する。
 */

// --- supabaseAdmin モック（テーブル名・操作で返り値を切り替えるヘルパ） ---
const state: {
  orderResult: { data: unknown; error: unknown };
  paymentResult: { data: unknown; error: unknown };
  orderUpdateResult: { data: unknown; error: unknown };
  paymentUpdateResult: { data: unknown; error: unknown };
} = {
  orderResult: { data: null, error: null },
  paymentResult: { data: null, error: null },
  orderUpdateResult: { data: { id: 'order-1' }, error: null },
  paymentUpdateResult: { data: null, error: null },
};

const mockOrderUpdate = vi.fn();
const mockPaymentUpdate = vi.fn();

function makeSelectChain(table: string) {
  // orders: .eq('id', x).single()
  // payments: .eq('order_id', x).maybeSingle()
  return {
    eq: () => ({
      single: () => Promise.resolve(state.orderResult),
      maybeSingle: () =>
        Promise.resolve(table === 'orders' ? state.orderResult : state.paymentResult),
    }),
  };
}

function makeOrdersUpdateChain() {
  // .update(...).eq('id').eq('status').select('id').maybeSingle()
  const chain = {
    eq: () => chain,
    select: () => ({
      maybeSingle: () => Promise.resolve(state.orderUpdateResult),
    }),
  };
  return chain;
}

function makePaymentsUpdateChain() {
  // .update(...).eq('id', x) を await
  return {
    eq: () => Promise.resolve(state.paymentUpdateResult),
  };
}

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (table: string) => ({
      select: () => makeSelectChain(table),
      update: (...args: unknown[]) => {
        if (table === 'orders') {
          mockOrderUpdate(...args);
          return makeOrdersUpdateChain();
        }
        mockPaymentUpdate(...args);
        return makePaymentsUpdateChain();
      },
    }),
  },
}));

// --- adminWriteGuard: 認証OK固定 ---
vi.mock('@/lib/api/admin-guards', () => ({
  adminWriteGuard: vi.fn().mockResolvedValue({ ok: true, userId: 'admin-1' }),
}));

// --- stripe: refunds.create をモック ---
const mockRefundsCreate = vi.fn();
vi.mock('@/lib/stripe/client', () => ({
  stripe: {
    refunds: {
      create: (...args: unknown[]) => mockRefundsCreate(...args),
    },
  },
}));

// --- email / audit-log / logger ---
const mockSendRefundEmail = vi.fn().mockResolvedValue({ success: true });
vi.mock('@/lib/email/resend', () => ({
  sendRefundNotificationEmail: (...args: unknown[]) => mockSendRefundEmail(...args),
}));

const mockWriteAuditLog = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/logging/audit-log', () => ({
  writeAuditLog: (...args: unknown[]) => mockWriteAuditLog(...args),
}));

vi.mock('@/lib/logging/secure-logger', () => ({
  secureLog: vi.fn(),
  safeErrorLog: vi.fn((e) => e),
}));

// uuidSchema / adminRefundSchema / formatValidationErrors は実物を使う（モックしない）

import { POST } from '@/app/api/admin/orders/[id]/refund/route';
import { NextRequest } from 'next/server';

const ORDER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function makeRequest(body: Record<string, unknown> = {}): NextRequest {
  return new NextRequest(`http://localhost:3000/api/admin/orders/${ORDER_ID}/refund`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeParams(id: string = ORDER_ID) {
  return { params: Promise.resolve({ id }) };
}

// 各テストで差し替える注文ベース
function baseOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: 'order-1',
    status: 'PAID',
    payment_method: 'STRIPE',
    order_no: 'ORD-001',
    customer_name: 'テスト太郎',
    customer_email: 'test@example.com',
    total_yen: 1000,
    locale: 'ja',
    ...overrides,
  };
}

function basePayment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pay-1',
    status: 'PAID',
    stripe_payment_intent_id: 'pi_test_123',
    refunded_at: null,
    ...overrides,
  };
}

describe('POST /api/admin/orders/[id]/refund', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルト: STRIPE 正常系
    state.orderResult = { data: baseOrder(), error: null };
    state.paymentResult = { data: basePayment(), error: null };
    state.orderUpdateResult = { data: { id: 'order-1' }, error: null };
    state.paymentUpdateResult = { data: null, error: null };
    mockRefundsCreate.mockResolvedValue({ id: 're_test_123' });
  });

  it('正常系(STRIPE): Stripe返金しorders/paymentsをREFUNDEDに更新して200', async () => {
    const res = await POST(makeRequest({ reason: '顧客都合' }), makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ok).toBe(true);
    expect(data.data.status).toBe('REFUNDED');
    expect(data.data.refundId).toBe('re_test_123');

    // stripe.refunds.create が payment_intent と idempotencyKey で呼ばれる
    expect(mockRefundsCreate).toHaveBeenCalledTimes(1);
    const [refundArgs, options] = mockRefundsCreate.mock.calls[0];
    expect(refundArgs.payment_intent).toBe('pi_test_123');
    expect(refundArgs.metadata.order_no).toBe('ORD-001');
    expect(refundArgs.metadata.reason).toBe('顧客都合');
    expect(options.idempotencyKey).toBe(`refund_${ORDER_ID}`);

    // orders / payments が REFUNDED に update
    expect(mockOrderUpdate).toHaveBeenCalledTimes(1);
    expect(mockOrderUpdate.mock.calls[0][0]).toMatchObject({ status: 'REFUNDED' });
    expect(mockPaymentUpdate).toHaveBeenCalledTimes(1);
    expect(mockPaymentUpdate.mock.calls[0][0]).toMatchObject({
      status: 'REFUNDED',
      stripe_refund_id: 're_test_123',
    });

    // 通知メールと監査ログ
    expect(mockSendRefundEmail).toHaveBeenCalledTimes(1);
    expect(mockWriteAuditLog).toHaveBeenCalledTimes(1);
  });

  it('冪等性(order.status=REFUNDED): 409 already_refunded・Stripe未呼び出し', async () => {
    state.orderResult = { data: baseOrder({ status: 'REFUNDED' }), error: null };

    const res = await POST(makeRequest(), makeParams());
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe('already_refunded');
    expect(mockRefundsCreate).not.toHaveBeenCalled();
    expect(mockOrderUpdate).not.toHaveBeenCalled();
  });

  it('冪等性(payment.refunded_at非null): 409 already_refunded・Stripe未呼び出し', async () => {
    state.paymentResult = {
      data: basePayment({ refunded_at: '2026-06-01T00:00:00.000Z' }),
      error: null,
    };

    const res = await POST(makeRequest(), makeParams());
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe('already_refunded');
    expect(mockRefundsCreate).not.toHaveBeenCalled();
  });

  it('状態ガード(PENDING_PAYMENT): 400 invalid_status', async () => {
    state.orderResult = { data: baseOrder({ status: 'PENDING_PAYMENT' }), error: null };

    const res = await POST(makeRequest(), makeParams());
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('invalid_status');
    expect(data.currentStatus).toBe('PENDING_PAYMENT');
    expect(mockRefundsCreate).not.toHaveBeenCalled();
  });

  it('非対応の決済方法: 400 unsupported_payment_method', async () => {
    state.orderResult = { data: baseOrder({ payment_method: 'UNKNOWN' }), error: null };

    const res = await POST(makeRequest(), makeParams());
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('unsupported_payment_method');
    expect(mockRefundsCreate).not.toHaveBeenCalled();
    expect(mockOrderUpdate).not.toHaveBeenCalled();
  });

  it('charge_already_refunded throw: 409 already_refunded', async () => {
    mockRefundsCreate.mockRejectedValue({ code: 'charge_already_refunded' });

    const res = await POST(makeRequest(), makeParams());
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe('already_refunded');
    // 更新は行わない
    expect(mockOrderUpdate).not.toHaveBeenCalled();
  });

  it('楽観ロックでupdate対象0件(maybeSingle→null): 409 already_refunded', async () => {
    state.orderUpdateResult = { data: null, error: null };

    const res = await POST(makeRequest(), makeParams());
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe('already_refunded');
    // Stripe 返金自体は成功している（楽観ロックで並行確定済み）
    expect(mockRefundsCreate).toHaveBeenCalledTimes(1);
    // payments 更新には進まない
    expect(mockPaymentUpdate).not.toHaveBeenCalled();
  });
});
