import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing route handler
vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    single: vi.fn(),
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  }),
}));

vi.mock('@/lib/stripe/client', () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue({
          url: 'https://checkout.stripe.com/test',
          id: 'cs_test_123',
        }),
      },
    },
  },
  getStripeEnvironmentName: vi.fn().mockReturnValue('test'),
}));

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    SHIPPING_FEE_YEN: 1200,
  },
}));

vi.mock('@/lib/email/resend', () => ({
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkOrderRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 9, resetIn: 60 }),
  getClientIP: vi.fn().mockReturnValue('127.0.0.1'),
}));

vi.mock('@/lib/security/csrf', () => ({
  validateOrigin: vi.fn().mockReturnValue({ valid: true }),
}));

vi.mock('@/lib/logging/secure-logger', () => ({
  secureLog: vi.fn(),
  safeErrorLog: vi.fn((e) => e),
}));

import { POST } from '@/app/api/orders/pickup/route';
import { NextRequest } from 'next/server';
import { checkOrderRateLimit } from '@/lib/security/rate-limit';
import { validateOrigin } from '@/lib/security/csrf';
import { supabaseAdmin } from '@/lib/supabase/admin';

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/orders/pickup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  customer: { name: 'テスト太郎', phone: '090-1234-5678', email: 'test@example.com' },
  items: [{ productId: 'uuid-1234-5678-9012-123456789012', qty: 1 }],
  paymentMethod: 'PAY_AT_PICKUP',
  agreementAccepted: true,
};

describe('POST /api/orders/pickup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkOrderRateLimit).mockReturnValue({ allowed: true, remaining: 9, resetIn: 60 });
    vi.mocked(validateOrigin).mockReturnValue({ valid: true });
  });

  it('returns 429 when rate limited', async () => {
    vi.mocked(checkOrderRateLimit).mockReturnValue({ allowed: false, remaining: 0, resetIn: 30 });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(429);

    const data = await res.json();
    expect(data.error).toBe('rate_limit_exceeded');
  });

  it('returns 403 when CSRF check fails', async () => {
    vi.mocked(validateOrigin).mockReturnValue({ valid: false, reason: 'bad origin' });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(403);

    const data = await res.json();
    expect(data.error).toBe('invalid_origin');
  });

  it('returns 400 for validation errors', async () => {
    const res = await POST(makeRequest({
      customer: { name: '', phone: '', email: '' },
      items: [],
      paymentMethod: 'INVALID',
      agreementAccepted: false,
    }));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe('validation_error');
  });

  it('returns 400 for missing items', async () => {
    const res = await POST(makeRequest({
      ...validBody,
      items: [],
    }));
    expect(res.status).toBe(400);
  });

  it('returns 500 when product DB query fails', async () => {
    const selectInChain = {
      in: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'DB error' },
      }),
    };

    vi.mocked(supabaseAdmin.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue(selectInChain),
    });

    // Need to use a valid UUID v4 for the product ID
    const body = {
      ...validBody,
      items: [{ productId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', qty: 1 }],
    };

    const res = await POST(makeRequest(body));
    expect(res.status).toBe(500);
  });
});
