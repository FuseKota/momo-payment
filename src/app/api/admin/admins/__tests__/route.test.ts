import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * 管理者一覧・追加API（/api/admin/admins）の単体テスト。
 *
 * - GET  : requireAdmin（一覧）admin_users を取得し各行の email を auth.admin.getUserById で解決
 * - POST : adminWriteGuard（追加）auth.admin.createUser → admin_users.insert（失敗時 deleteUser でロールバック）
 *
 * adminCreateSchema / formatValidationErrors は実物を使う。
 */

const state: {
  listResult: { data: unknown; error: unknown };
  insertResult: { error: unknown };
  createUserResult: { data: unknown; error: unknown };
  getUserByIdResult: { data: unknown; error: unknown };
  authResult: { authorized: boolean; userId?: string; response?: unknown };
  guardResult: { ok: boolean; userId?: string; response?: unknown };
} = {
  listResult: { data: [], error: null },
  insertResult: { error: null },
  createUserResult: { data: null, error: null },
  getUserByIdResult: { data: { user: { email: 'member@example.com' } }, error: null },
  authResult: { authorized: true, userId: 'admin-1' },
  guardResult: { ok: true, userId: 'admin-1' },
};

const mockOrder = vi.fn(() => Promise.resolve(state.listResult));
const mockInsert = vi.fn(() => Promise.resolve(state.insertResult));
const mockFrom = vi.fn(() => ({
  select: () => ({ order: (...args: unknown[]) => mockOrder(...args) }),
  insert: (...args: unknown[]) => {
    mockInsert(...args);
    return Promise.resolve(state.insertResult);
  },
}));

const mockCreateUser = vi.fn(() => Promise.resolve(state.createUserResult));
const mockGetUserById = vi.fn(() => Promise.resolve(state.getUserByIdResult));
const mockDeleteUser = vi.fn(() => Promise.resolve({ error: null }));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    from: mockFrom,
    auth: {
      admin: {
        createUser: (...args: unknown[]) => mockCreateUser(...args),
        getUserById: (...args: unknown[]) => mockGetUserById(...args),
        deleteUser: (...args: unknown[]) => mockDeleteUser(...args),
      },
    },
  }),
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

import { GET, POST } from '@/app/api/admin/admins/route';
import { NextRequest, NextResponse } from 'next/server';

function makePostRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/admins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

describe('GET /api/admin/admins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.authResult = { authorized: true, userId: 'admin-1' };
    state.listResult = {
      data: [{ user_id: 'u1', role: 'admin', created_at: '2026-01-01T00:00:00Z' }],
      error: null,
    };
    state.getUserByIdResult = { data: { user: { email: 'member@example.com' } }, error: null };
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

  it('正常系: 各行の email を解決して admins を返す', async () => {
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.admins).toEqual([
      { user_id: 'u1', email: 'member@example.com', role: 'admin', created_at: '2026-01-01T00:00:00Z' },
    ]);
    expect(mockGetUserById).toHaveBeenCalledWith('u1');
  });

  it('email 解決に失敗しても user_id は返す（email は null）', async () => {
    mockGetUserById.mockRejectedValueOnce(new Error('not found'));

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.admins[0].email).toBeNull();
    expect(data.admins[0].user_id).toBe('u1');
  });

  it('DBエラー時は 500', async () => {
    state.listResult = { data: null, error: { message: 'db down' } };

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

describe('POST /api/admin/admins', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.guardResult = { ok: true, userId: 'admin-1' };
    state.createUserResult = {
      data: { user: { id: 'new-user-1', created_at: '2026-06-29T00:00:00Z' } },
      error: null,
    };
    state.insertResult = { error: null };
  });

  it('ガード失敗は 403 をそのまま返す', async () => {
    state.guardResult = {
      ok: false,
      response: NextResponse.json({ error: 'invalid_origin' }, { status: 403 }),
    };

    const res = await POST(makePostRequest({ email: 'a@example.com', password: 'password123' }));
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe('invalid_origin');
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('不正なJSONは 400 invalid_json', async () => {
    const res = await POST(makePostRequest('not-json'));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('invalid_json');
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('メール形式不正は 400 validation_error', async () => {
    const res = await POST(makePostRequest({ email: 'not-an-email', password: 'password123' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('validation_error');
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('パスワードが8文字未満は 400 validation_error', async () => {
    const res = await POST(makePostRequest({ email: 'a@example.com', password: 'short' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('validation_error');
    expect(mockCreateUser).not.toHaveBeenCalled();
  });

  it('メール重複（email_exists）は 409', async () => {
    state.createUserResult = {
      data: null,
      error: { code: 'email_exists', status: 422, message: 'already been registered' },
    };

    const res = await POST(makePostRequest({ email: 'dup@example.com', password: 'password123' }));
    const data = await res.json();

    expect(res.status).toBe(409);
    expect(data.error).toBe('email_exists');
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockWriteAuditLog).not.toHaveBeenCalled();
  });

  it('正常系: 作成して201を返し、監査ログを記録する', async () => {
    const res = await POST(makePostRequest({ email: 'new@example.com', password: 'password123' }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.user_id).toBe('new-user-1');
    expect(data.email).toBe('new@example.com');
    expect(mockCreateUser).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'password123',
      email_confirm: true,
    });
    expect(mockInsert).toHaveBeenCalledWith({ user_id: 'new-user-1' });
    expect(mockWriteAuditLog).toHaveBeenCalledTimes(1);
    expect(mockWriteAuditLog.mock.calls[0][0]).toMatchObject({
      actorId: 'admin-1',
      action: 'admin.create',
      targetType: 'admin',
      targetId: 'new-user-1',
    });
  });

  it('admin_users への登録失敗時は作成済みユーザーを削除して 500', async () => {
    state.insertResult = { error: { message: 'insert failed' } };

    const res = await POST(makePostRequest({ email: 'new@example.com', password: 'password123' }));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Internal server error');
    expect(mockDeleteUser).toHaveBeenCalledWith('new-user-1');
    expect(mockWriteAuditLog).not.toHaveBeenCalled();
  });
});
