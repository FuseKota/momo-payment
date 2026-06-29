import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * 管理者パスワード変更API（POST /api/admin/account/password）の単体テスト。
 *
 * - adminWriteGuard でガード
 * - getUserById で自分のメールを解決 → 一時クライアントの signInWithPassword で現在パスワードを再認証
 * - updateUserById で新パスワードへ更新し監査ログを記録
 *
 * adminPasswordChangeSchema / formatValidationErrors は実物を使う。
 */

const SELF = 'admin-1';

const state: {
  getUserByIdResult: { data: unknown; error: unknown };
  signInResult: { error: unknown };
  updateResult: { error: unknown };
  guardResult: { ok: boolean; userId?: string; response?: unknown };
} = {
  getUserByIdResult: { data: { user: { email: 'admin@example.com' } }, error: null },
  signInResult: { error: null },
  updateResult: { error: null },
  guardResult: { ok: true, userId: SELF },
};

const mockGetUserById = vi.fn(() => Promise.resolve(state.getUserByIdResult));
const mockUpdateUserById = vi.fn(() => Promise.resolve(state.updateResult));
const mockSignIn = vi.fn(() => Promise.resolve(state.signInResult));

vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: () => ({
    auth: {
      admin: {
        getUserById: (...args: unknown[]) => mockGetUserById(...args),
        updateUserById: (...args: unknown[]) => mockUpdateUserById(...args),
      },
    },
  }),
}));

// password route が現在パスワード検証に使う一時クライアント
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: { signInWithPassword: (...args: unknown[]) => mockSignIn(...args) },
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

import { POST } from '@/app/api/admin/account/password/route';
import { NextRequest, NextResponse } from 'next/server';

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/account/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const validBody = { currentPassword: 'oldpass123', newPassword: 'newpass123' };

describe('POST /api/admin/account/password', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.getUserByIdResult = { data: { user: { email: 'admin@example.com' } }, error: null };
    state.signInResult = { error: null };
    state.updateResult = { error: null };
    state.guardResult = { ok: true, userId: SELF };
  });

  it('ガード失敗は 403 をそのまま返す', async () => {
    state.guardResult = {
      ok: false,
      response: NextResponse.json({ error: 'invalid_origin' }, { status: 403 }),
    };

    const res = await POST(makeRequest(validBody));
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe('invalid_origin');
    expect(mockUpdateUserById).not.toHaveBeenCalled();
  });

  it('不正なJSONは 400 invalid_json', async () => {
    const res = await POST(makeRequest('not-json'));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('invalid_json');
  });

  it('新パスワードが8文字未満は 400 validation_error', async () => {
    const res = await POST(makeRequest({ currentPassword: 'oldpass123', newPassword: 'short' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('validation_error');
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('新旧パスワードが同一は 400 validation_error', async () => {
    const res = await POST(makeRequest({ currentPassword: 'samepass123', newPassword: 'samepass123' }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('validation_error');
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('現在のパスワードが誤りなら 401 invalid_current_password', async () => {
    state.signInResult = { error: { message: 'Invalid login credentials' } };

    const res = await POST(makeRequest(validBody));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('invalid_current_password');
    expect(mockUpdateUserById).not.toHaveBeenCalled();
    expect(mockWriteAuditLog).not.toHaveBeenCalled();
  });

  it('メール解決に失敗したら 500', async () => {
    state.getUserByIdResult = { data: { user: null }, error: { message: 'not found' } };

    const res = await POST(makeRequest(validBody));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('正常系: パスワードを更新し監査ログを記録する', async () => {
    const res = await POST(makeRequest(validBody));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockSignIn).toHaveBeenCalledWith({
      email: 'admin@example.com',
      password: 'oldpass123',
    });
    expect(mockUpdateUserById).toHaveBeenCalledWith(SELF, { password: 'newpass123' });
    expect(mockWriteAuditLog).toHaveBeenCalledTimes(1);
    expect(mockWriteAuditLog.mock.calls[0][0]).toMatchObject({
      actorId: SELF,
      action: 'admin.password_change',
      targetType: 'admin',
      targetId: SELF,
    });
  });

  it('更新のDBエラーは 500', async () => {
    state.updateResult = { error: { message: 'update failed' } };

    const res = await POST(makeRequest(validBody));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Internal server error');
    expect(mockWriteAuditLog).not.toHaveBeenCalled();
  });
});
