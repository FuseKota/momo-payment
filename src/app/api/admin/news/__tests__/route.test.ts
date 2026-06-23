import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * ニュース管理API（/api/admin/news）の単体テスト。
 *
 * - GET  : requireAdmin（一覧）  select('*').order('created_at', {...})
 * - POST : adminWriteGuard（作成）insert(...).select().single()
 *
 * adminNewsCreateSchema / formatValidationErrors は実物を使う。
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
    order: (...args: unknown[]) => mockOrder(...args),
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

import { GET, POST } from '@/app/api/admin/news/route';
import { NextRequest, NextResponse } from 'next/server';

function makePostRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/news', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function validNewsBody(overrides: Record<string, unknown> = {}) {
  return {
    title: '夏の新商品',
    slug: 'summer-new',
    ...overrides,
  };
}

describe('GET /api/admin/news', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.authResult = { authorized: true, userId: 'admin-1' };
    state.listResult = { data: [{ id: 'n1', slug: 'summer-new' }], error: null };
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

  it('正常系: ニュース配列を created_at 降順で返す', async () => {
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual([{ id: 'n1', slug: 'summer-new' }]);
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('DBエラー時は 500 Internal server error', async () => {
    state.listResult = { data: null, error: { message: 'db down' } };

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

describe('POST /api/admin/news', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.guardResult = { ok: true, userId: 'admin-1' };
    state.insertResult = {
      data: { id: 'new-news', slug: 'summer-new', category: '福島もも娘' },
      error: null,
    };
  });

  it('ガード失敗は 403 をそのまま返す', async () => {
    state.guardResult = {
      ok: false,
      response: NextResponse.json({ error: 'invalid_origin' }, { status: 403 }),
    };

    const res = await POST(makePostRequest(validNewsBody()));
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe('invalid_origin');
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('不正なJSONは 400 Invalid JSON', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/news', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid JSON');
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('正常系: 作成して作成行を返し、監査ログを記録する', async () => {
    const res = await POST(makePostRequest(validNewsBody({ is_published: true })));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe('new-news');
    expect(mockInsert).toHaveBeenCalledTimes(1);
    const insertPayload = mockInsert.mock.calls[0][0];
    expect(insertPayload).toMatchObject({
      title: '夏の新商品',
      slug: 'summer-new',
      category: '福島もも娘',
      is_published: true,
    });
    // 公開かつ published_at 未指定なので published_at が補完される
    expect(insertPayload.published_at).toBeTruthy();
    expect(mockWriteAuditLog).toHaveBeenCalledTimes(1);
    expect(mockWriteAuditLog.mock.calls[0][0]).toMatchObject({
      actorId: 'admin-1',
      action: 'news.create',
      targetType: 'news',
      targetId: 'new-news',
    });
  });

  it('未公開の場合 published_at は null で挿入される', async () => {
    await POST(makePostRequest(validNewsBody({ is_published: false })));

    const insertPayload = mockInsert.mock.calls[0][0];
    expect(insertPayload.is_published).toBe(false);
    expect(insertPayload.published_at).toBeNull();
  });

  it('入力不正（slug 形式違反）は 400 validation_error', async () => {
    const res = await POST(makePostRequest(validNewsBody({ slug: 'Bad Slug' })));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('validation_error');
    expect(data.details).toBeDefined();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('入力不正（title 空）は 400 validation_error', async () => {
    const res = await POST(makePostRequest(validNewsBody({ title: '' })));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('validation_error');
  });

  it('slug 重複（23505）は 409 を返す', async () => {
    state.insertResult = { data: null, error: { code: '23505' } };

    const res = await POST(makePostRequest(validNewsBody()));
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe('このスラッグはすでに使われています');
    expect(mockWriteAuditLog).not.toHaveBeenCalled();
  });

  it('その他のDBエラーは 500 Internal server error', async () => {
    state.insertResult = { data: null, error: { code: 'XXXXX', message: 'boom' } };

    const res = await POST(makePostRequest(validNewsBody()));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Internal server error');
    expect(mockWriteAuditLog).not.toHaveBeenCalled();
  });
});
