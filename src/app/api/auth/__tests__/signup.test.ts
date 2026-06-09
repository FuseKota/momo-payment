import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing the route handler
const { fromMock, insertMock, getUserMock, validateOriginMock, rateLimitMock } = vi.hoisted(() => {
  const insertMock = vi.fn();
  const fromMock = vi.fn(() => ({ insert: insertMock }));
  return {
    fromMock,
    insertMock,
    getUserMock: vi.fn(),
    validateOriginMock: vi.fn(() => ({ valid: true })),
    rateLimitMock: vi.fn(async () => ({ allowed: true })),
  };
});

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({ from: fromMock }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: getUserMock } })),
}));

vi.mock('@/lib/security/csrf', () => ({
  validateOrigin: validateOriginMock,
}));

vi.mock('@/lib/security/rate-limit', () => ({
  checkAuthRateLimit: rateLimitMock,
  getClientIP: vi.fn(() => '127.0.0.1'),
}));

import { POST } from '../signup/route';

const makeRequest = () =>
  new Request('http://localhost:3000/api/auth/signup', { method: 'POST' });

const userWithAddress = {
  id: 'user-1',
  email: 'test@example.com',
  user_metadata: {
    display_name: 'テスト太郎',
    phone: '09012345678',
    address: {
      postalCode: '1000001',
      pref: '東京都',
      city: '千代田区',
      address1: '1-1-1',
      address2: '',
    },
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  validateOriginMock.mockReturnValue({ valid: true });
  rateLimitMock.mockResolvedValue({ allowed: true });
});

describe('POST /api/auth/signup (idempotent ensure profile)', () => {
  it('未認証なら401でDBに触れない', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });

    const res = await POST(makeRequest());

    expect(res.status).toBe(401);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('住所メタデータが無いユーザー（管理者等）はスキップ', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: 'admin-1', email: 'a@b.com', user_metadata: {} } },
      error: null,
    });

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, skipped: true });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('住所メタデータからprofileとデフォルト住所を作成', async () => {
    getUserMock.mockResolvedValue({ data: { user: userWithAddress }, error: null });
    insertMock.mockResolvedValueOnce({ error: null }); // customer_profiles
    insertMock.mockResolvedValueOnce({ error: null }); // customer_addresses

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true });
    expect(fromMock).toHaveBeenNthCalledWith(1, 'customer_profiles');
    expect(fromMock).toHaveBeenNthCalledWith(2, 'customer_addresses');

    expect(insertMock.mock.calls[0][0]).toMatchObject({
      user_id: 'user-1',
      display_name: 'テスト太郎',
      phone: '09012345678',
    });
    expect(insertMock.mock.calls[1][0]).toMatchObject({
      user_id: 'user-1',
      postal_code: '1000001',
      pref: '東京都',
      city: '千代田区',
      address1: '1-1-1',
      recipient_name: 'テスト太郎',
      recipient_phone: '09012345678',
      is_default: true,
    });
  });

  it('profileが既存(23505)なら住所は作成せずalreadyInitialized', async () => {
    getUserMock.mockResolvedValue({ data: { user: userWithAddress }, error: null });
    insertMock.mockResolvedValueOnce({ error: { code: '23505' } }); // 重複

    const res = await POST(makeRequest());
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ success: true, alreadyInitialized: true });
    // profile insert のみで、住所 insert は呼ばれない（誤復活防止）
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith('customer_profiles');
  });

  it('不正なOriginなら403で認証チェックに進まない', async () => {
    validateOriginMock.mockReturnValue({ valid: false });

    const res = await POST(makeRequest());

    expect(res.status).toBe(403);
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it('レート制限超過なら429', async () => {
    rateLimitMock.mockResolvedValue({ allowed: false, resetIn: 30 });

    const res = await POST(makeRequest());

    expect(res.status).toBe(429);
    expect(getUserMock).not.toHaveBeenCalled();
  });
});
