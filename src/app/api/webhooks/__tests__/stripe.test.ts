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
          return {
            eq: (...eArgs: unknown[]) => {
              mockEq(...eArgs);
              return {
                select: (...sArgs: unknown[]) => {
                  mockSelect(...sArgs);
                  return { single: mockSingle };
                },
                data: null,
                error: null,
              };
            },
          };
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

    mockInsert.mockImplementation(() => ({
      data: null,
      error: { message: 'duplicate key value violates unique constraint' },
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
    });

    mockMaybeSingle.mockResolvedValue({
      data: { id: 'pay-1', order_id: 'order-1' },
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
    });

    mockMaybeSingle.mockResolvedValue({
      data: { id: 'pay-2', order_id: 'order-2' },
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
});
