import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
const mockFrom = vi.fn();
const mockInsert = vi.fn().mockReturnValue({ data: null, error: null });
const mockUpdate = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: (...args: unknown[]) => {
      mockFrom(...args);
      return {
        insert: (...iArgs: unknown[]) => {
          return mockInsert(...iArgs);
        },
        update: (...uArgs: unknown[]) => {
          mockUpdate(...uArgs);
          // .eq() を連鎖可能にする（orders更新は .eq('id').eq('status') の2連）
          const eqChain = {
            eq: (...eArgs: unknown[]) => {
              mockEq(...eArgs);
              return eqChain;
            },
            select: (...sArgs: unknown[]) => {
              mockSelect(...sArgs);
              return { single: mockSingle };
            },
            data: null,
            error: null,
          };
          return eqChain;
        },
        select: (...sArgs: unknown[]) => {
          mockSelect(...sArgs);
          return {
            eq: (...eArgs: unknown[]) => {
              mockEq(...eArgs);
              return { maybeSingle: mockMaybeSingle };
            },
          };
        },
      };
    },
  },
}));

vi.mock('@/lib/stripe/webhook', () => ({
  verifyStripeWebhookSignature: vi.fn(),
  isCheckoutSessionCompleted: vi.fn(),
  isCheckoutSessionExpired: vi.fn().mockReturnValue(false),
  extractSessionInfo: vi.fn(),
}));

vi.mock('@/lib/stripe/client', () => ({
  getStripeEnvironmentName: vi.fn().mockReturnValue('test'),
}));

vi.mock('@/lib/email/resend', () => ({
  sendPaymentConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/logging/secure-logger', () => ({
  secureLog: vi.fn(),
  safeErrorLog: vi.fn((e) => e),
}));

import { POST } from '@/app/api/webhooks/stripe/route';
import { NextRequest } from 'next/server';
import { verifyStripeWebhookSignature, isCheckoutSessionCompleted, extractSessionInfo } from '@/lib/stripe/webhook';
import { sendPaymentConfirmationEmail } from '@/lib/email/resend';

function makeRequest(body = 'raw-body', sig = 'test-sig'): NextRequest {
  return new NextRequest('http://localhost:3000/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': sig },
    body,
  });
}

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 for invalid signature', async () => {
    vi.mocked(verifyStripeWebhookSignature).mockReturnValue(null);

    const res = await POST(makeRequest());
    expect(res.status).toBe(403);
  });

  it('returns 200 and skips duplicate events', async () => {
    vi.mocked(verifyStripeWebhookSignature).mockReturnValue({
      id: 'evt_dup',
      type: 'checkout.session.completed',
    } as any);

    // イベント未登録（初回チェック）
    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    // DB UNIQUE 制約違反エラー（競合条件）
    mockInsert.mockImplementation(() => ({
      data: null,
      error: { code: '23505', message: 'duplicate key value violates unique constraint' },
    }));

    const res = await POST(makeRequest());
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.message).toBe('already processed');
  });

  it('returns 200 and ignores non-checkout events', async () => {
    vi.mocked(verifyStripeWebhookSignature).mockReturnValue({
      id: 'evt_test',
      type: 'payment_intent.succeeded',
    } as any);

    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    mockInsert.mockImplementation(() => ({ data: null, error: null }));
    vi.mocked(isCheckoutSessionCompleted).mockReturnValue(false);

    const res = await POST(makeRequest());
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.message).toBe('ignored');
  });

  it('returns 200 when session info missing', async () => {
    vi.mocked(verifyStripeWebhookSignature).mockReturnValue({
      id: 'evt_test2',
      type: 'checkout.session.completed',
    } as any);

    mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
    mockInsert.mockImplementation(() => ({ data: null, error: null }));
    vi.mocked(isCheckoutSessionCompleted).mockReturnValue(true);
    vi.mocked(extractSessionInfo).mockReturnValue(null);

    const res = await POST(makeRequest());
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.message).toBe('no session info');
  });

  it('processes checkout.session.completed and sends email', async () => {
    vi.mocked(verifyStripeWebhookSignature).mockReturnValue({
      id: 'evt_ok',
      type: 'checkout.session.completed',
    } as any);

    mockInsert.mockImplementation(() => ({ data: null, error: null }));
    vi.mocked(isCheckoutSessionCompleted).mockReturnValue(true);
    vi.mocked(extractSessionInfo).mockReturnValue({
      sessionId: 'cs_test_123',
      paymentIntentId: 'pi_test_456',
      amountTotal: 1000,
      paymentStatus: 'paid',
      currency: 'jpy',
      metadata: {},
    });

    // 1回目: webhook_events 重複チェック（未登録）、2回目: payments 検索（請求額1000）
    mockMaybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: { id: 'pay-1', order_id: 'order-1', amount_yen: 1000 },
        error: null,
      });

    mockSingle.mockResolvedValue({
      data: {
        id: 'order-1',
        order_no: 'ORD-001',
        customer_name: 'テスト',
        customer_email: 'test@example.com',
        order_type: 'PICKUP',
        subtotal_yen: 1000,
        shipping_fee_yen: 0,
        total_yen: 1000,
        locale: 'ja',
        order_items: [
          { product_name: '商品A', qty: 1, unit_price_yen: 1000, line_total_yen: 1000 },
        ],
      },
      error: null,
    });

    const res = await POST(makeRequest());
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.ok).toBe(true);
    // 金額一致・支払い完了 → PAID遷移とメール送信が行われる
    expect(sendPaymentConfirmationEmail).toHaveBeenCalledTimes(1);
  });

  it('returns 200 even when email sending fails', async () => {
    vi.mocked(verifyStripeWebhookSignature).mockReturnValue({
      id: 'evt_email_fail',
      type: 'checkout.session.completed',
    } as any);

    mockInsert.mockImplementation(() => ({ data: null, error: null }));
    vi.mocked(isCheckoutSessionCompleted).mockReturnValue(true);
    vi.mocked(extractSessionInfo).mockReturnValue({
      sessionId: 'cs_test_789',
      paymentIntentId: 'pi_test_012',
      amountTotal: 500,
      paymentStatus: 'paid',
      currency: 'jpy',
      metadata: {},
    });

    mockMaybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: { id: 'pay-2', order_id: 'order-2', amount_yen: 500 },
        error: null,
      });

    mockSingle.mockResolvedValue({
      data: {
        id: 'order-2',
        order_no: 'ORD-002',
        customer_name: 'テスト',
        customer_email: 'test@example.com',
        order_type: 'PICKUP',
        subtotal_yen: 500,
        shipping_fee_yen: 0,
        total_yen: 500,
        locale: 'ja',
        order_items: [],
      },
      error: null,
    });

    vi.mocked(sendPaymentConfirmationEmail).mockRejectedValue(new Error('SMTP error'));

    const res = await POST(makeRequest());
    // Should still return 200 even if email fails
    expect(res.status).toBe(200);
  });

  it('金額不一致のときPAIDに遷移させずメールも送らない', async () => {
    vi.mocked(verifyStripeWebhookSignature).mockReturnValue({
      id: 'evt_amount_mismatch',
      type: 'checkout.session.completed',
    } as any);

    mockInsert.mockImplementation(() => ({ data: null, error: null }));
    vi.mocked(isCheckoutSessionCompleted).mockReturnValue(true);
    // 攻撃シナリオ: 実支払額(1)がDB請求額(1000)と一致しない
    vi.mocked(extractSessionInfo).mockReturnValue({
      sessionId: 'cs_test_attack',
      paymentIntentId: 'pi_test_attack',
      amountTotal: 1,
      paymentStatus: 'paid',
      currency: 'jpy',
      metadata: {},
    });

    mockMaybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: { id: 'pay-3', order_id: 'order-3', amount_yen: 1000 },
        error: null,
      });

    const res = await POST(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(200); // Stripeの再送を防ぐため200
    expect(data.message).toBe('amount mismatch, manual review required');
    // PAIDへのorders更新もメール送信も行われない
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(sendPaymentConfirmationEmail).not.toHaveBeenCalled();
  });

  it('payment_statusがpaidでないときPAIDに遷移させない', async () => {
    vi.mocked(verifyStripeWebhookSignature).mockReturnValue({
      id: 'evt_unpaid',
      type: 'checkout.session.completed',
    } as any);

    mockInsert.mockImplementation(() => ({ data: null, error: null }));
    vi.mocked(isCheckoutSessionCompleted).mockReturnValue(true);
    vi.mocked(extractSessionInfo).mockReturnValue({
      sessionId: 'cs_test_unpaid',
      paymentIntentId: null,
      amountTotal: 1000,
      paymentStatus: 'unpaid',
      currency: 'jpy',
      metadata: {},
    });

    mockMaybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: { id: 'pay-4', order_id: 'order-4', amount_yen: 1000 },
        error: null,
      });

    const res = await POST(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.message).toBe('payment not completed');
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(sendPaymentConfirmationEmail).not.toHaveBeenCalled();
  });
});
