import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * 商品詳細・更新・削除API（/api/admin/products/[id]）の単体テスト。
 *
 * - GET    : requireAdmin（詳細）  select('*').eq('id').single()
 * - PATCH  : adminWriteGuard（更新）update(...).eq('id').select().single()
 * - DELETE : adminWriteGuard（論理削除）update({ deleted_at, is_active:false }).eq('id') を await
 *
 * uuidSchema / adminProductUpdateSchema / formatValidationErrors は実物を使う。
 */

const state: {
  getResult: { data: unknown; error: unknown };
  updateResult: { data: unknown; error: unknown };
  deleteResult: { error: unknown };
  authResult: { authorized: boolean; userId?: string; response?: unknown };
  guardResult: { ok: boolean; userId?: string; response?: unknown };
} = {
  getResult: { data: null, error: null },
  updateResult: { data: null, error: null },
  deleteResult: { error: null },
  authResult: { authorized: true, userId: 'admin-1' },
  guardResult: { ok: true, userId: 'admin-1' },
};

const mockUpdate = vi.fn();

const mockFrom = vi.fn(() => ({
  select: () => ({
    eq: () => ({
      single: () => Promise.resolve(state.getResult),
    }),
  }),
  update: (...args: unknown[]) => {
    mockUpdate(...args);
    // update().eq() は2通りで使われる:
    //   PATCH        : .eq().select().single() → updateResult
    //   DELETE(論理削除): await .eq() を直接   → deleteResult
    // そのため eq() は select を持ちつつ PromiseLike（then あり）にする。
    return {
      eq: () => ({
        select: () => ({
          single: () => Promise.resolve(state.updateResult),
        }),
        then: (
          onFulfilled: (v: { error: unknown }) => unknown,
          onRejected?: (e: unknown) => unknown
        ) => Promise.resolve(state.deleteResult).then(onFulfilled, onRejected),
      }),
    };
  },
}));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
}));

vi.mock('@/lib/auth/require-admin', () => ({
  requireAdmin: vi.fn(async () => {
    if (state.authResult.authorized) {
      return { authorized: true, userId: state.authResult.userId };
    }
    return { authorized: false, response: state.authResult.response };
  }),
}));

vi.mock('@/lib/api/admin-guards', () => ({
  adminWriteGuard: vi.fn(async () => {
    if (state.guardResult.ok) {
      return { ok: true, userId: state.guardResult.userId };
    }
    return { ok: false, response: state.guardResult.response };
  }),
}));

const mockWriteAuditLog = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/logging/audit-log', () => ({
  writeAuditLog: (...args: unknown[]) => mockWriteAuditLog(...args),
}));

vi.mock('@/lib/logging/secure-logger', () => ({
  secureLog: vi.fn(),
  safeErrorLog: vi.fn((e) => e),
}));

import { GET, PATCH, DELETE } from '@/app/api/admin/products/[id]/route';
import { NextRequest, NextResponse } from 'next/server';

const PRODUCT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function makeGetRequest(): Request {
  return new Request(`http://localhost:3000/api/admin/products/${PRODUCT_ID}`);
}

function makePatchRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost:3000/api/admin/products/${PRODUCT_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(): NextRequest {
  return new NextRequest(`http://localhost:3000/api/admin/products/${PRODUCT_ID}`, {
    method: 'DELETE',
  });
}

function makeParams(id: string = PRODUCT_ID) {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/admin/products/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.authResult = { authorized: true, userId: 'admin-1' };
    state.getResult = { data: { id: PRODUCT_ID, slug: 'momo-daifuku' }, error: null };
  });

  it('未認証は requireAdmin の 401 を返す', async () => {
    state.authResult = {
      authorized: false,
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    };

    const res = await GET(makeGetRequest(), makeParams());
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('unauthorized');
  });

  it('不正なID（UUIDでない）は 400 invalid_id', async () => {
    const res = await GET(makeGetRequest(), makeParams('not-a-uuid'));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('invalid_id');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('正常系: 商品を返す', async () => {
    const res = await GET(makeGetRequest(), makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe(PRODUCT_ID);
  });

  it('存在しない場合は 404 Product not found', async () => {
    state.getResult = { data: null, error: { message: 'not found' } };

    const res = await GET(makeGetRequest(), makeParams());
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Product not found');
  });
});

describe('PATCH /api/admin/products/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.guardResult = { ok: true, userId: 'admin-1' };
    state.updateResult = { data: { id: PRODUCT_ID, name: '更新後' }, error: null };
  });

  it('ガード失敗は 403 をそのまま返す', async () => {
    state.guardResult = {
      ok: false,
      response: NextResponse.json({ error: 'forbidden' }, { status: 403 }),
    };

    const res = await PATCH(makePatchRequest({ name: '更新後' }), makeParams());
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe('forbidden');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('不正なID は 400 invalid_id', async () => {
    const res = await PATCH(makePatchRequest({ name: '更新後' }), makeParams('bad-id'));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('invalid_id');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('正常系: 更新して更新行を返し、監査ログを記録する', async () => {
    const res = await PATCH(makePatchRequest({ name: '更新後', price_yen: 1500 }), makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.name).toBe('更新後');
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate.mock.calls[0][0]).toMatchObject({ name: '更新後', price_yen: 1500 });
    expect(mockWriteAuditLog).toHaveBeenCalledTimes(1);
    expect(mockWriteAuditLog.mock.calls[0][0]).toMatchObject({
      actorId: 'admin-1',
      action: 'product.update',
      targetType: 'product',
      targetId: PRODUCT_ID,
    });
  });

  it('入力不正（price_yen が負）は 400 validation_error', async () => {
    const res = await PATCH(makePatchRequest({ price_yen: -1 }), makeParams());
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('validation_error');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('DBエラー時は 500 Internal server error', async () => {
    state.updateResult = { data: null, error: { message: 'boom' } };

    const res = await PATCH(makePatchRequest({ name: '更新後' }), makeParams());
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Internal server error');
    expect(mockWriteAuditLog).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/admin/products/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.guardResult = { ok: true, userId: 'admin-1' };
    state.deleteResult = { error: null };
  });

  it('ガード失敗は 403 をそのまま返す', async () => {
    state.guardResult = {
      ok: false,
      response: NextResponse.json({ error: 'rate_limit_exceeded' }, { status: 429 }),
    };

    const res = await DELETE(makeDeleteRequest(), makeParams());
    const data = await res.json();

    expect(res.status).toBe(429);
    expect(data.error).toBe('rate_limit_exceeded');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('不正なID は 400 invalid_id', async () => {
    const res = await DELETE(makeDeleteRequest(), makeParams('bad-id'));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('invalid_id');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('正常系: 論理削除（deleted_at + is_active:false）して success を返し、監査ログを記録する', async () => {
    const res = await DELETE(makeDeleteRequest(), makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    // 物理削除ではなく deleted_at セット + 非公開化であることを検証
    expect(mockUpdate.mock.calls[0][0]).toMatchObject({ is_active: false });
    expect(mockUpdate.mock.calls[0][0].deleted_at).toEqual(expect.any(String));
    expect(mockWriteAuditLog).toHaveBeenCalledTimes(1);
    expect(mockWriteAuditLog.mock.calls[0][0]).toMatchObject({
      actorId: 'admin-1',
      action: 'product.delete',
      targetType: 'product',
      targetId: PRODUCT_ID,
    });
  });

  it('DBエラー時は 500 Internal server error', async () => {
    state.deleteResult = { error: { message: 'boom' } };

    const res = await DELETE(makeDeleteRequest(), makeParams());
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Internal server error');
    expect(mockWriteAuditLog).not.toHaveBeenCalled();
  });
});
