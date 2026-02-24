import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
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
          id: 'cs_test_456',
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

import { POST } from '@/app/api/orders/shipping/route';
import { NextRequest } from 'next/server';
import { checkOrderRateLimit } from '@/lib/security/rate-limit';
import { validateOrigin } from '@/lib/security/csrf';

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/orders/shipping', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const validBody = {
  customer: { name: 'テスト太郎', phone: '090-1234-5678', email: 'test@example.com' },
  address: {
    postalCode: '100-0001',
    pref: '東京都',
    city: '千代田区',
    address1: '千代田1-1',
  },
  items: [{ productId: '00000000-0000-0000-0000-000000000001', qty: 1 }],
  agreementAccepted: true,
};

describe('POST /api/orders/shipping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkOrderRateLimit).mockReturnValue({ allowed: true, remaining: 9, resetIn: 60 });
    vi.mocked(validateOrigin).mockReturnValue({ valid: true });
  });

  it('returns 429 when rate limited', async () => {
    vi.mocked(checkOrderRateLimit).mockReturnValue({ allowed: false, remaining: 0, resetIn: 30 });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(429);
  });

  it('returns 403 when CSRF check fails', async () => {
    vi.mocked(validateOrigin).mockReturnValue({ valid: false, reason: 'bad origin' });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(403);
  });

  it('returns 400 for validation errors - empty customer', async () => {
    const res = await POST(makeRequest({
      customer: { name: '', phone: '', email: '' },
      address: { postalCode: '', pref: '', city: '', address1: '' },
      items: [],
      agreementAccepted: false,
    }));
    expect(res.status).toBe(400);

    const data = await res.json();
    expect(data.error).toBe('validation_error');
  });

  it('returns 400 for invalid email format', async () => {
    const res = await POST(makeRequest({
      ...validBody,
      customer: { ...validBody.customer, email: 'not-an-email' },
    }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid postal code', async () => {
    const res = await POST(makeRequest({
      ...validBody,
      address: { ...validBody.address, postalCode: '12345' },
    }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing items', async () => {
    const res = await POST(makeRequest({
      ...validBody,
      items: [],
    }));
    expect(res.status).toBe(400);
  });

  it('returns 400 when agreementAccepted is false', async () => {
    const res = await POST(makeRequest({
      ...validBody,
      agreementAccepted: false,
    }));
    expect(res.status).toBe(400);
  });
});
