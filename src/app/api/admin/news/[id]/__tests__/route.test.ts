import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * ニュース更新・削除API（/api/admin/news/[id]）の単体テスト。
 *
 * - PATCH  : adminWriteGuard（更新）update(updates).eq('id').select().single()
 * - DELETE : adminWriteGuard（削除）delete().eq('id') を await
 *
 * uuidSchema / adminNewsUpdateSchema / formatValidationErrors は実物を使う。
 */

const state: {
  updateResult: { data: unknown; error: unknown };
  deleteResult: { error: unknown };
  guardResult: { ok: boolean; userId?: string; response?: unknown };
} = {
  updateResult: { data: null, error: null },
  deleteResult: { error: null },
  guardResult: { ok: true, userId: 'admin-1' },
};

const mockUpdate = vi.fn();
const mockDelete = vi.fn();

const mockFrom = vi.fn(() => ({
  update: (...args: unknown[]) => {
    mockUpdate(...args);
    return {
      eq: () => ({
        select: () => ({
          single: () => Promise.resolve(state.updateResult),
        }),
      }),
    };
  },
  delete: () => {
    mockDelete();
    return {
      eq: () => Promise.resolve(state.deleteResult),
    };
  },
}));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({ from: mockFrom }),
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

import { PATCH, DELETE } from '@/app/api/admin/news/[id]/route';
import { NextRequest, NextResponse } from 'next/server';

const NEWS_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

function makePatchRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest(`http://localhost:3000/api/admin/news/${NEWS_ID}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function makeDeleteRequest(): NextRequest {
  return new NextRequest(`http://localhost:3000/api/admin/news/${NEWS_ID}`, {
    method: 'DELETE',
  });
}

function makeParams(id: string = NEWS_ID) {
  return { params: Promise.resolve({ id }) };
}

describe('PATCH /api/admin/news/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.guardResult = { ok: true, userId: 'admin-1' };
    state.updateResult = { data: { id: NEWS_ID, title: '更新後' }, error: null };
  });

  it('ガード失敗は 403 をそのまま返す', async () => {
    state.guardResult = {
      ok: false,
      response: NextResponse.json({ error: 'forbidden' }, { status: 403 }),
    };

    const res = await PATCH(makePatchRequest({ title: '更新後' }), makeParams());
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe('forbidden');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('不正なID は 400 Invalid news ID', async () => {
    const res = await PATCH(makePatchRequest({ title: '更新後' }), makeParams('bad-id'));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid news ID');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('不正なJSONは 400 Invalid JSON', async () => {
    const req = new NextRequest(`http://localhost:3000/api/admin/news/${NEWS_ID}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    });

    const res = await PATCH(req, makeParams());
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid JSON');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('正常系: 指定フィールドのみ更新し、監査ログを記録する', async () => {
    const res = await PATCH(makePatchRequest({ title: '更新後', excerpt: '抜粋' }), makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.title).toBe('更新後');
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    const updates = mockUpdate.mock.calls[0][0];
    expect(updates).toMatchObject({ title: '更新後', excerpt: '抜粋' });
    // 未指定フィールドは updates に含めない
    expect(updates).not.toHaveProperty('slug');
    expect(mockWriteAuditLog).toHaveBeenCalledTimes(1);
    expect(mockWriteAuditLog.mock.calls[0][0]).toMatchObject({
      actorId: 'admin-1',
      action: 'news.update',
      targetType: 'news',
      targetId: NEWS_ID,
    });
  });

  it('is_published=true かつ published_at 未指定なら published_at を補完する', async () => {
    await PATCH(makePatchRequest({ is_published: true }), makeParams());

    const updates = mockUpdate.mock.calls[0][0];
    expect(updates.is_published).toBe(true);
    expect(updates.published_at).toBeTruthy();
  });

  it('is_published=false なら published_at は null', async () => {
    await PATCH(makePatchRequest({ is_published: false }), makeParams());

    const updates = mockUpdate.mock.calls[0][0];
    expect(updates.is_published).toBe(false);
    expect(updates.published_at).toBeNull();
  });

  it('入力不正（slug 形式違反）は 400 validation_error', async () => {
    const res = await PATCH(makePatchRequest({ slug: 'Bad Slug' }), makeParams());
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('validation_error');
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('DBエラー時は 500 Internal server error', async () => {
    state.updateResult = { data: null, error: { message: 'boom' } };

    const res = await PATCH(makePatchRequest({ title: '更新後' }), makeParams());
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Internal server error');
    expect(mockWriteAuditLog).not.toHaveBeenCalled();
  });
});

describe('DELETE /api/admin/news/[id]', () => {
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
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('不正なID は 400 Invalid news ID', async () => {
    const res = await DELETE(makeDeleteRequest(), makeParams('bad-id'));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Invalid news ID');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('正常系: 削除して success を返し、監査ログを記録する', async () => {
    const res = await DELETE(makeDeleteRequest(), makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockWriteAuditLog).toHaveBeenCalledTimes(1);
    expect(mockWriteAuditLog.mock.calls[0][0]).toMatchObject({
      actorId: 'admin-1',
      action: 'news.delete',
      targetType: 'news',
      targetId: NEWS_ID,
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
