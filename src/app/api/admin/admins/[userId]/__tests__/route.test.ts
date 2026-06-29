import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * 管理者削除（権限剥奪）API（DELETE /api/admin/admins/[userId]）の単体テスト。
 *
 * - adminWriteGuard でガード
 * - 自分自身 / 最後の1人 / 非存在 をそれぞれ拒否
 * - admin_users から行削除し監査ログを記録
 */

const SELF = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

const state: {
  listResult: { data: unknown; error: unknown };
  deleteResult: { error: unknown };
  guardResult: { ok: boolean; userId?: string; response?: unknown };
} = {
  listResult: { data: [], error: null },
  deleteResult: { error: null },
  guardResult: { ok: true, userId: SELF },
};

const mockSelect = vi.fn(() => Promise.resolve(state.listResult));
const mockEq = vi.fn(() => Promise.resolve(state.deleteResult));
const mockDelete = vi.fn(() => ({ eq: (...args: unknown[]) => mockEq(...args) }));
const mockFrom = vi.fn(() => ({
  select: (...args: unknown[]) => mockSelect(...args),
  delete: (...args: unknown[]) => mockDelete(...args),
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

import { DELETE } from '@/app/api/admin/admins/[userId]/route';
import { NextRequest, NextResponse } from 'next/server';

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/admin/admins/x', { method: 'DELETE' });
}

function makeParams(userId: string) {
  return { params: Promise.resolve({ userId }) };
}

describe('DELETE /api/admin/admins/[userId]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.guardResult = { ok: true, userId: SELF };
    state.listResult = { data: [{ user_id: SELF }, { user_id: OTHER }], error: null };
    state.deleteResult = { error: null };
  });

  it('ガード失敗は 403 をそのまま返す', async () => {
    state.guardResult = {
      ok: false,
      response: NextResponse.json({ error: 'invalid_origin' }, { status: 403 }),
    };

    const res = await DELETE(makeRequest(), makeParams(OTHER));
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe('invalid_origin');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('UUIDでないIDは 400 invalid_id', async () => {
    const res = await DELETE(makeRequest(), makeParams('not-a-uuid'));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('invalid_id');
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('自分自身の削除は 400 cannot_delete_self', async () => {
    const res = await DELETE(makeRequest(), makeParams(SELF));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('cannot_delete_self');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('対象が存在しない場合は 404 not_found', async () => {
    state.listResult = { data: [{ user_id: SELF }], error: null };

    const res = await DELETE(makeRequest(), makeParams(OTHER));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('not_found');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('最後の1人は 400 cannot_delete_last_admin', async () => {
    state.listResult = { data: [{ user_id: OTHER }], error: null };

    const res = await DELETE(makeRequest(), makeParams(OTHER));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('cannot_delete_last_admin');
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('正常系: 権限を削除し監査ログを記録する', async () => {
    const res = await DELETE(makeRequest(), makeParams(OTHER));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockEq).toHaveBeenCalledWith('user_id', OTHER);
    expect(mockWriteAuditLog).toHaveBeenCalledTimes(1);
    expect(mockWriteAuditLog.mock.calls[0][0]).toMatchObject({
      actorId: SELF,
      action: 'admin.delete',
      targetType: 'admin',
      targetId: OTHER,
    });
  });

  it('削除のDBエラーは 500', async () => {
    state.deleteResult = { error: { message: 'delete failed' } };

    const res = await DELETE(makeRequest(), makeParams(OTHER));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe('Internal server error');
    expect(mockWriteAuditLog).not.toHaveBeenCalled();
  });
});
