import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * マイページ配送先住所API（PUT / DELETE /api/mypage/addresses/[id]）の単体テスト。
 *
 * getSupabaseAdmin() の from('customer_addresses') を操作ごとに切り替える:
 *
 * [PUT]
 * - select('id').eq('id').eq('user_id').single()        → 所有者チェック（{ data }）
 * - update({ is_default:false }).eq().eq()              → 既存デフォルト解除（await）
 * - update(body).eq('id').eq('user_id').select().single() → 本体更新（{ data, error }）
 *
 * update は終端が異なる（解除=eq().eq() を await / 本体更新=eq().eq().select().single()）ため、
 * 同一チェーンで両方を満たせるよう eq() は then 可能かつ select().single() も持たせる。
 *
 * [DELETE]
 * - delete().eq('id').eq('user_id')                     → 削除（await で { error }）
 *
 * 認証ガード・CSRF はモック、uuidSchema / savedAddressSchema は実物を使う。
 */

const state: {
  ownerResult: { data: unknown; error: unknown };
  updateResult: { data: unknown; error: unknown };
  deleteResult: { error: unknown };
  originValid: boolean;
} = {
  ownerResult: { data: { id: 'addr-1' }, error: null },
  updateResult: { data: null, error: null },
  deleteResult: { error: null },
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

const mockBodyUpdate = vi.fn();
const mockDefaultUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: () => ({
      // 所有者チェック
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: () => Promise.resolve(state.ownerResult),
          }),
        }),
      }),
      // update は2用途: { is_default:false }(解除) と 本体更新
      update: (payload: Record<string, unknown>) => {
        const isDefaultReset =
          Object.keys(payload).length === 1 && payload.is_default === false;
        if (isDefaultReset) {
          mockDefaultUpdate(payload);
        } else {
          mockBodyUpdate(payload);
        }
        // 終端は呼び出し側で .eq().eq() (await) または .eq().eq().select().single()
        const tail = {
          select: () => ({
            single: () => Promise.resolve(state.updateResult),
          }),
          // .eq().eq() を await したときに解決する thenable
          then: (resolve: (v: { error: unknown }) => unknown) =>
            resolve({ error: null }),
        };
        return { eq: () => ({ eq: () => tail }) };
      },
      // 削除
      delete: () => {
        mockDelete();
        return { eq: () => ({ eq: () => Promise.resolve(state.deleteResult) }) };
      },
    }),
  }),
}));

import { PUT, DELETE } from '@/app/api/mypage/addresses/[id]/route';
import { NextRequest } from 'next/server';

const ADDR_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function makeParams(id: string = ADDR_ID) {
  return { params: Promise.resolve({ id }) };
}

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

function makePutRequest(body: unknown): NextRequest {
  return new NextRequest(`http://localhost:3000/api/mypage/addresses/${ADDR_ID}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(): NextRequest {
  return new NextRequest(`http://localhost:3000/api/mypage/addresses/${ADDR_ID}`, {
    method: 'DELETE',
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
    ...overrides,
  };
}

describe('PUT /api/mypage/addresses/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.ownerResult = { data: { id: 'addr-1' }, error: null };
    state.updateResult = { data: baseAddress(), error: null };
    state.originValid = true;
    mockRequireCustomer.mockResolvedValue({ authorized: true, userId: 'user-1' });
  });

  it('未認証は 401 unauthorized', async () => {
    const { NextResponse } = await import('next/server');
    mockRequireCustomer.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    } as never);

    const res = await PUT(makePutRequest(validBody()), makeParams());
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('unauthorized');
  });

  it('CSRF: Origin不正は 403 invalid_origin', async () => {
    state.originValid = false;

    const res = await PUT(makePutRequest(validBody()), makeParams());
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe('invalid_origin');
  });

  it('UUID形式でないIDは 400 Invalid address ID', async () => {
    const res = await PUT(makePutRequest(validBody()), makeParams('not-a-uuid'));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid address ID');
  });

  it('他人/存在しない住所は 404 Address not found', async () => {
    state.ownerResult = { data: null, error: { message: 'not found' } };

    const res = await PUT(makePutRequest(validBody()), makeParams());
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Address not found');
    expect(mockBodyUpdate).not.toHaveBeenCalled();
  });

  it('正常系: 住所を更新して 200・isDefault=true なら既存デフォルト解除', async () => {
    const res = await PUT(makePutRequest(validBody()), makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe('addr-1');
    expect(mockDefaultUpdate).toHaveBeenCalledTimes(1);
    expect(mockBodyUpdate).toHaveBeenCalledTimes(1);
    expect(mockBodyUpdate.mock.calls[0][0]).toMatchObject({
      postal_code: '123-4567',
      recipient_name: 'テスト太郎',
      is_default: true,
    });
  });

  it('isDefault=false なら既存デフォルト解除は行わない', async () => {
    const res = await PUT(makePutRequest(validBody({ isDefault: false })), makeParams());

    expect(res.status).toBe(200);
    expect(mockDefaultUpdate).not.toHaveBeenCalled();
  });

  it('バリデーションエラー（郵便番号不正）は 400 validation_error', async () => {
    const res = await PUT(makePutRequest(validBody({ postalCode: 'xxx' })), makeParams());
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('validation_error');
    expect(mockBodyUpdate).not.toHaveBeenCalled();
  });

  it('不正なJSONボディは 400 Invalid JSON', async () => {
    const req = new NextRequest(`http://localhost:3000/api/mypage/addresses/${ADDR_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: '{bad',
    });

    const res = await PUT(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid JSON');
  });

  it('update失敗時は 500 Internal server error', async () => {
    state.updateResult = { data: null, error: { message: 'update failed' } };

    const res = await PUT(makePutRequest(validBody()), makeParams());
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

describe('DELETE /api/mypage/addresses/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.deleteResult = { error: null };
    state.originValid = true;
    mockRequireCustomer.mockResolvedValue({ authorized: true, userId: 'user-1' });
  });

  it('未認証は 401 unauthorized', async () => {
    const { NextResponse } = await import('next/server');
    mockRequireCustomer.mockResolvedValue({
      authorized: false,
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    } as never);

    const res = await DELETE(makeDeleteRequest(), makeParams());
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('unauthorized');
  });

  it('CSRF: Origin不正は 403 invalid_origin', async () => {
    state.originValid = false;

    const res = await DELETE(makeDeleteRequest(), makeParams());
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe('invalid_origin');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('UUID形式でないIDは 400 Invalid address ID', async () => {
    const res = await DELETE(makeDeleteRequest(), makeParams('not-a-uuid'));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid address ID');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('正常系: 削除して 200 { success: true }', async () => {
    const res = await DELETE(makeDeleteRequest(), makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });

  it('delete失敗時は 500 Internal server error', async () => {
    state.deleteResult = { error: { message: 'delete failed' } };

    const res = await DELETE(makeDeleteRequest(), makeParams());
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
