import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * 商品管理API（/api/admin/products）の単体テスト。
 *
 * - GET   : requireAdmin（一覧）
 * - POST  : adminWriteGuard（作成）
 *
 * getSupabaseAdmin().from('products') のクエリチェーンをモックする:
 * - select('*').is('deleted_at', null).order('sort_order') → 一覧（await で { data, error }）
 * - insert(...).select().single()               → 作成（{ data, error }）
 * adminProductCreateSchema / formatValidationErrors は実物を使う。
 */

const state: {
  listResult: { data: unknown; error: unknown };
  insertResult: { data: unknown; error: unknown };
  authResult: { authorized: boolean; userId?: string; response?: unknown };
  guardResult: { ok: boolean; userId?: string; response?: unknown };
} = {
  listResult: { data: [], error: null },
  insertResult: { data: null, error: null },
  authResult: { authorized: true, userId: 'admin-1' },
  guardResult: { ok: true, userId: 'admin-1' },
};

const mockInsert = vi.fn();
const mockOrder = vi.fn(() => Promise.resolve(state.listResult));

const mockFrom = vi.fn(() => ({
  select: () => ({
    is: () => ({
      order: (...args: unknown[]) => mockOrder(...args),
    }),
  }),
  insert: (...args: unknown[]) => {
    mockInsert(...args);
    return {
      select: () => ({
        single: () => Promise.resolve(state.insertResult),
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

import { GET, POST } from '@/app/api/admin/products/route';
import { NextRequest, NextResponse } from 'next/server';

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function validProductBody(overrides: Record<string, unknown> = {}) {
  return {
    name: 'もも大福',
    slug: 'momo-daifuku',
    kind: 'FROZEN_FOOD',
    price_yen: 1200,
    ...overrides,
  };
}

describe('GET /api/admin/products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.authResult = { authorized: true, userId: 'admin-1' };
    state.listResult = { data: [{ id: 'p1', slug: 'momo-daifuku' }], error: null };
  });

  it('未認証は requireAdmin の 401 を返す', async () => {
    state.authResult = {
      authorized: false,
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    };

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('unauthorized');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('正常系: 商品配列をそのまま返す', async () => {
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual([{ id: 'p1', slug: 'momo-daifuku' }]);
    expect(mockOrder).toHaveBeenCalledWith('sort_order');
  });

  it('DBエラー時は 500 Internal server error', async () => {
    state.listResult = { data: null, error: { message: 'db down' } };

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

describe('POST /api/admin/products', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.guardResult = { ok: true, userId: 'admin-1' };
    state.insertResult = {
      data: { id: 'new-product', slug: 'momo-daifuku', kind: 'FROZEN_FOOD' },
      error: null,
    };
  });

  it('ガード失敗（CSRF/権限）は 403 をそのまま返す', async () => {
    state.guardResult = {
      ok: false,
      response: NextResponse.json({ error: 'invalid_origin' }, { status: 403 }),
    };

    const res = await POST(makePostRequest(validProductBody()));
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe('invalid_origin');
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('正常系: 作成して作成行を返し、監査ログを記録する', async () => {
    const res = await POST(makePostRequest(validProductBody()));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe('new-product');
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert.mock.calls[0][0]).toMatchObject({
      name: 'もも大福',
      slug: 'momo-daifuku',
      kind: 'FROZEN_FOOD',
      price_yen: 1200,
    });
    expect(mockWriteAuditLog).toHaveBeenCalledTimes(1);
    expect(mockWriteAuditLog.mock.calls[0][0]).toMatchObject({
      actorId: 'admin-1',
      action: 'product.create',
      targetType: 'product',
      targetId: 'new-product',
    });
  });

  it('入力不正（kind が許可外）は 400 validation_error', async () => {
    const res = await POST(makePostRequest(validProductBody({ kind: 'INVALID' })));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('validation_error');
    expect(data.details).toBeDefined();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('入力不正（slug の形式違反）は 400 validation_error', async () => {
    const res = await POST(makePostRequest(validProductBody({ slug: 'Momo Daifuku' })));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('validation_error');
  });

  it('slug 重複（23505）は 409 を返す', async () => {
    state.insertResult = { data: null, error: { code: '23505' } };

    const res = await POST(makePostRequest(validProductBody()));
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe('このスラッグはすでに使われています');
    expect(mockWriteAuditLog).not.toHaveBeenCalled();
  });

  it('その他のDBエラーは 500 Internal server error', async () => {
    state.insertResult = { data: null, error: { code: 'XXXXX', message: 'boom' } };

    const res = await POST(makePostRequest(validProductBody()));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Internal server error');
    expect(mockWriteAuditLog).not.toHaveBeenCalled();
  });
});
