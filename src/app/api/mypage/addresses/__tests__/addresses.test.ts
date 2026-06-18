import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * マイページ配送先住所API（GET / POST /api/mypage/addresses）の単体テスト。
 *
 * getSupabaseAdmin() の from(table) を操作ごとに切り替える:
 * - select(...).eq('user_id').order().order()  → 一覧取得（await で { data, error }）
 * - update(...).eq().eq()                       → 既存デフォルト解除（await で { error }）
 * - insert(...).select().single()               → 住所作成（{ data, error }）
 *
 * 認証ガード requireCustomer と CSRF の validateOrigin はモックする。
 * savedAddressSchema / formatValidationErrors は実物を使う。
 */

const state: {
  listResult: { data: unknown; error: unknown };
  insertResult: { data: unknown; error: unknown };
  originValid: boolean;
} = {
  listResult: { data: null, error: null },
  insertResult: { data: null, error: null },
  originValid: true,
};

const mockRequireCustomer = vi.fn(async () => ({
  authorized: true as const,
  userId: 'user-1',
}));
vi.mock('@/lib/auth/require-customer', () => ({
  requireCustomer: () => mockRequireCustomer(),
}));

vi.mock('@/lib/security/csrf', () => ({
  validateOrigin: () => ({ valid: state.originValid, origin: 'http://localhost:3000' }),
}));

const mockDefaultUpdate = vi.fn();
const mockInsert = vi.fn();
vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      // GET 一覧
      select: () => ({
        eq: () => ({
          order: () => ({
            order: () => Promise.resolve(state.listResult),
          }),
        }),
      }),
      // 既存デフォルト解除
      update: (...args: unknown[]) => {
        mockDefaultUpdate(...args);
        return { eq: () => ({ eq: () => Promise.resolve({ error: null }) }) };
      },
      // 住所作成
      insert: (...args: unknown[]) => {
        mockInsert(...args);
        return {
          select: () => ({
            single: () => Promise.resolve(state.insertResult),
          }),
        };
      },
    }),
  }),
}));

import { GET, POST } from '@/app/api/mypage/addresses/route';
import { NextRequest } from 'next/server';

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    label: '自宅',
    recipientName: 'テスト太郎',
    recipientPhone: '090-1234-5678',
    postalCode: '123-4567',
    pref: '東京都',
    city: '渋谷区',
    address1: '1-2-3',
    address2: 'マンション101',
    isDefault: true,
    ...overrides,
  };
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/mypage/addresses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function baseAddress(overrides: Record<string, unknown> = {}) {
  return {
    id: 'addr-1',
    user_id: 'user-1',
    label: '自宅',
    postal_code: '123-4567',
    pref: '東京都',
    city: '渋谷区',
    address1: '1-2-3',
    address2: 'マンション101',
    recipient_name: 'テスト太郎',
    recipient_phone: '090-1234-5678',
    is_default: true,
    created_at: '2026-06-17T10:00:00Z',
    ...overrides,
  };
}

describe('GET /api/mypage/addresses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.listResult = { data: [baseAddress()], error: null };
    mockRequireCustomer.mockResolvedValue({ authorized: true, userId: 'user-1' });
  });

  it('未認証は 401 unauthorized', async () => {
    const { NextResponse } = await import('next/server');
    mockRequireCustomer.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    } as never);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('unauthorized');
  });

  it('正常系: 住所一覧を 200 で返す', async () => {
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].id).toBe('addr-1');
  });

  it('0件（data=null）は空配列を返す', async () => {
    state.listResult = { data: null, error: null };

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual([]);
  });

  it('DBエラー時は 500 Internal server error', async () => {
    state.listResult = { data: null, error: { message: 'db error' } };

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

describe('POST /api/mypage/addresses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.insertResult = { data: baseAddress(), error: null };
    state.originValid = true;
    mockRequireCustomer.mockResolvedValue({ authorized: true, userId: 'user-1' });
  });

  it('未認証は 401 unauthorized', async () => {
    const { NextResponse } = await import('next/server');
    mockRequireCustomer.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    } as never);

    const res = await POST(makeRequest(validBody()));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('unauthorized');
  });

  it('CSRF: Origin不正は 403 invalid_origin', async () => {
    state.originValid = false;

    const res = await POST(makeRequest(validBody()));
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe('invalid_origin');
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('正常系: 住所を作成して 200・isDefault=true なら既存デフォルトを解除', async () => {
    const res = await POST(makeRequest(validBody()));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe('addr-1');
    // isDefault=true → 既存デフォルト解除 update が呼ばれる
    expect(mockDefaultUpdate).toHaveBeenCalledTimes(1);
    expect(mockDefaultUpdate.mock.calls[0][0]).toEqual({ is_default: false });
    // insert は user_id とローカライズ済みフィールドで呼ばれる
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert.mock.calls[0][0]).toMatchObject({
      user_id: 'user-1',
      postal_code: '123-4567',
      pref: '東京都',
      recipient_name: 'テスト太郎',
      is_default: true,
    });
  });

  it('isDefault=false なら既存デフォルト解除は行わない', async () => {
    const res = await POST(makeRequest(validBody({ isDefault: false })));

    expect(res.status).toBe(200);
    expect(mockDefaultUpdate).not.toHaveBeenCalled();
  });

  it('バリデーションエラー（電話番号不正）は 400 validation_error', async () => {
    const res = await POST(makeRequest(validBody({ recipientPhone: 'abc' })));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('validation_error');
    expect(data.details).toBeTruthy();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('不正なJSONボディは 400 Invalid JSON', async () => {
    const req = new NextRequest('http://localhost:3000/api/mypage/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{not json',
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid JSON');
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('insert失敗時は 500 Internal server error', async () => {
    state.insertResult = { data: null, error: { message: 'insert failed' } };

    const res = await POST(makeRequest(validBody()));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
