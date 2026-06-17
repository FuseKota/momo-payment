/**
 * 監査ログヘルパー（writeAuditLog）のユニットテスト
 * - audit_logs.insert に正しい形で渡されること
 * - metadata の PII が redactForAudit でマスクされること
 * - actorEmail 未指定時のみ getUserById で email 解決すること
 * - best-effort: insert 失敗（error 返却 / throw）でも例外を外に漏らさないこと
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';

// --- モック対象の import を精読して合わせる ---
// audit-log.ts は以下を import している:
//   getSupabaseAdmin (@/lib/supabase/admin)
//   getClientIP (@/lib/security/rate-limit)
//   secureLog, safeErrorLog, redactForAudit (@/lib/logging/secure-logger)
//   AuditAction, AuditTargetType (@/types/database) ... 型のみ

// insert / getUserById / from はテストごとに差し替えるため、
// vi.mock のファクトリ内では参照を返すだけにし、各テストで vi.mocked 経由で制御する。
vi.mock('@/lib/supabase/admin', () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock('@/lib/security/rate-limit', () => ({
  getClientIP: vi.fn(() => '203.0.113.7'),
}));

// secure-logger は redactForAudit を実物で使いたいので、actual を import しつつ
// secureLog だけスパイ化する。
vi.mock('@/lib/logging/secure-logger', async () => {
  const actual = await vi.importActual<typeof import('../secure-logger')>('../secure-logger');
  return {
    ...actual,
    secureLog: vi.fn(),
  };
});

import { writeAuditLog } from '../audit-log';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getClientIP } from '@/lib/security/rate-limit';
import { secureLog } from '../secure-logger';

const getSupabaseAdminMock = vi.mocked(getSupabaseAdmin);
const getClientIPMock = vi.mocked(getClientIP);
const secureLogMock = vi.mocked(secureLog);

// getClientIP をモックしているため request の中身は使われない
const dummyRequest = {} as unknown as NextRequest;

/**
 * Supabase admin クライアントのモックを組み立てる。
 * @param opts.insertResult insert が解決する値（{ error } 形）
 * @param opts.insertThrows insert が throw する場合 true
 * @param opts.getUserByIdEmail getUserById が返す email（null 可）
 * @param opts.getUserByIdThrows getUserById が throw する場合 true
 */
function buildSupabaseMock(opts: {
  insertResult?: { error: unknown };
  insertThrows?: boolean;
  getUserByIdEmail?: string | null;
  getUserByIdThrows?: boolean;
} = {}) {
  const insertMock = vi.fn(async () => {
    if (opts.insertThrows) {
      throw new Error('insert exploded');
    }
    return opts.insertResult ?? { error: null };
  });

  const fromMock = vi.fn(() => ({ insert: insertMock }));

  const getUserByIdMock = vi.fn(async () => {
    if (opts.getUserByIdThrows) {
      throw new Error('getUserById failed');
    }
    return {
      data: {
        user:
          opts.getUserByIdEmail === undefined
            ? { email: 'resolved@example.com' }
            : opts.getUserByIdEmail === null
              ? null
              : { email: opts.getUserByIdEmail },
      },
    };
  });

  const supabase = {
    from: fromMock,
    auth: {
      admin: {
        getUserById: getUserByIdMock,
      },
    },
  };

  return { supabase, fromMock, insertMock, getUserByIdMock };
}

describe('writeAuditLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getClientIPMock.mockReturnValue('203.0.113.7');
  });

  describe('正常系', () => {
    it('audit_logs.insert が期待した形で1回呼ばれる', async () => {
      const { supabase, fromMock, insertMock } = buildSupabaseMock();
      getSupabaseAdminMock.mockReturnValue(supabase as never);

      await writeAuditLog({
        request: dummyRequest,
        actorId: 'admin-1',
        actorEmail: 'admin@example.com',
        action: 'product.update',
        targetType: 'product',
        targetId: 'prod-123',
        metadata: { changed: ['price'] },
      });

      expect(fromMock).toHaveBeenCalledWith('audit_logs');
      expect(insertMock).toHaveBeenCalledTimes(1);

      const inserted = insertMock.mock.calls[0][0];
      expect(inserted).toEqual({
        actor_id: 'admin-1',
        actor_email: 'admin@example.com',
        action: 'product.update',
        target_type: 'product',
        target_id: 'prod-123',
        metadata: { changed: ['price'] },
        ip: '203.0.113.7',
      });
    });

    it('getClientIP の戻り値が ip として記録される', async () => {
      const { supabase, insertMock } = buildSupabaseMock();
      getSupabaseAdminMock.mockReturnValue(supabase as never);
      getClientIPMock.mockReturnValue('198.51.100.42');

      await writeAuditLog({
        request: dummyRequest,
        actorId: 'admin-1',
        actorEmail: 'admin@example.com',
        action: 'order.mark_paid',
      });

      expect(getClientIPMock).toHaveBeenCalledWith(dummyRequest);
      expect(insertMock.mock.calls[0][0].ip).toBe('198.51.100.42');
    });

    it('targetType / targetId / metadata 未指定時はそれぞれ null / null / {} になる', async () => {
      const { supabase, insertMock } = buildSupabaseMock();
      getSupabaseAdminMock.mockReturnValue(supabase as never);

      await writeAuditLog({
        request: dummyRequest,
        actorId: 'admin-1',
        actorEmail: 'admin@example.com',
        action: 'news.delete',
      });

      const inserted = insertMock.mock.calls[0][0];
      expect(inserted.target_type).toBeNull();
      expect(inserted.target_id).toBeNull();
      expect(inserted.metadata).toEqual({});
    });

    it('insert 成功時は secureLog(error) を呼ばない', async () => {
      const { supabase } = buildSupabaseMock({ insertResult: { error: null } });
      getSupabaseAdminMock.mockReturnValue(supabase as never);

      await writeAuditLog({
        request: dummyRequest,
        actorId: 'admin-1',
        actorEmail: 'admin@example.com',
        action: 'product.create',
      });

      expect(secureLogMock).not.toHaveBeenCalled();
    });
  });

  describe('metadata の PII マスク', () => {
    it('email / phone / name などが [REDACTED] 化されて insert される', async () => {
      const { supabase, insertMock } = buildSupabaseMock();
      getSupabaseAdminMock.mockReturnValue(supabase as never);

      await writeAuditLog({
        request: dummyRequest,
        actorId: 'admin-1',
        actorEmail: 'admin@example.com',
        action: 'order.status_update',
        targetType: 'order',
        targetId: 'order-9',
        metadata: {
          email: 'customer@example.com',
          phone: '090-1234-5678',
          name: '山田太郎',
          orderNo: 'MM-0001', // PII でないキーは残る
        },
      });

      const metadata = insertMock.mock.calls[0][0].metadata as Record<string, unknown>;
      expect(metadata.email).toBe('[REDACTED]');
      expect(metadata.phone).toBe('[REDACTED]');
      expect(metadata.name).toBe('[REDACTED]');
      // 非機密キーは保持される
      expect(metadata.orderNo).toBe('MM-0001');

      // 念のためシリアライズしても生の PII が含まれないこと
      const serialized = JSON.stringify(metadata);
      expect(serialized).not.toContain('customer@example.com');
      expect(serialized).not.toContain('090-1234-5678');
      expect(serialized).not.toContain('山田太郎');
    });

    it('ネストした metadata 内の文字列 PII もマスクされる', async () => {
      const { supabase, insertMock } = buildSupabaseMock();
      getSupabaseAdminMock.mockReturnValue(supabase as never);

      await writeAuditLog({
        request: dummyRequest,
        actorId: 'admin-1',
        actorEmail: 'admin@example.com',
        action: 'order.email_resend',
        metadata: {
          detail: { note: 'Contact user@domain.com asap' },
        },
      });

      const metadata = insertMock.mock.calls[0][0].metadata as Record<string, unknown>;
      const serialized = JSON.stringify(metadata);
      expect(serialized).not.toContain('user@domain.com');
      // note キー自体が機密キーのため [REDACTED]
      expect((metadata.detail as Record<string, unknown>).note).toBe('[REDACTED]');
    });
  });

  describe('actor_email の解決', () => {
    it('actorEmail 未指定時は getUserById を呼んで email を解決する', async () => {
      const { supabase, insertMock, getUserByIdMock } = buildSupabaseMock({
        getUserByIdEmail: 'resolved@example.com',
      });
      getSupabaseAdminMock.mockReturnValue(supabase as never);

      await writeAuditLog({
        request: dummyRequest,
        actorId: 'admin-42',
        action: 'product.delete',
      });

      expect(getUserByIdMock).toHaveBeenCalledTimes(1);
      expect(getUserByIdMock).toHaveBeenCalledWith('admin-42');
      expect(insertMock.mock.calls[0][0].actor_email).toBe('resolved@example.com');
    });

    it('actorEmail 指定時は getUserById を呼ばない', async () => {
      const { supabase, insertMock, getUserByIdMock } = buildSupabaseMock();
      getSupabaseAdminMock.mockReturnValue(supabase as never);

      await writeAuditLog({
        request: dummyRequest,
        actorId: 'admin-1',
        actorEmail: 'given@example.com',
        action: 'product.reorder',
      });

      expect(getUserByIdMock).not.toHaveBeenCalled();
      expect(insertMock.mock.calls[0][0].actor_email).toBe('given@example.com');
    });

    it('getUserById が user なし（email null）を返した場合 actor_email は null', async () => {
      const { supabase, insertMock, getUserByIdMock } = buildSupabaseMock({
        getUserByIdEmail: null,
      });
      getSupabaseAdminMock.mockReturnValue(supabase as never);

      await writeAuditLog({
        request: dummyRequest,
        actorId: 'admin-1',
        action: 'order.ship',
      });

      expect(getUserByIdMock).toHaveBeenCalledTimes(1);
      expect(insertMock.mock.calls[0][0].actor_email).toBeNull();
    });

    it('getUserById が throw しても insert は続行し actor_email は null', async () => {
      const { supabase, insertMock } = buildSupabaseMock({ getUserByIdThrows: true });
      getSupabaseAdminMock.mockReturnValue(supabase as never);

      await expect(
        writeAuditLog({
          request: dummyRequest,
          actorId: 'admin-1',
          action: 'order.refund',
        })
      ).resolves.toBeUndefined();

      expect(insertMock).toHaveBeenCalledTimes(1);
      expect(insertMock.mock.calls[0][0].actor_email).toBeNull();
    });
  });

  describe('best-effort（例外を外に漏らさない）', () => {
    it('insert が { error } を返しても throw せず secureLog(error) を呼ぶ', async () => {
      const { supabase } = buildSupabaseMock({
        insertResult: { error: { message: 'duplicate key' } },
      });
      getSupabaseAdminMock.mockReturnValue(supabase as never);

      await expect(
        writeAuditLog({
          request: dummyRequest,
          actorId: 'admin-1',
          actorEmail: 'admin@example.com',
          action: 'product.update',
        })
      ).resolves.toBeUndefined();

      expect(secureLogMock).toHaveBeenCalledTimes(1);
      expect(secureLogMock.mock.calls[0][0]).toBe('error');
      expect(secureLogMock.mock.calls[0][1]).toContain('audit log');
    });

    it('insert が throw しても writeAuditLog は throw せず secureLog(error) を呼ぶ', async () => {
      const { supabase } = buildSupabaseMock({ insertThrows: true });
      getSupabaseAdminMock.mockReturnValue(supabase as never);

      await expect(
        writeAuditLog({
          request: dummyRequest,
          actorId: 'admin-1',
          actorEmail: 'admin@example.com',
          action: 'product.update',
        })
      ).resolves.toBeUndefined();

      expect(secureLogMock).toHaveBeenCalledTimes(1);
      expect(secureLogMock.mock.calls[0][0]).toBe('error');
    });

    it('getSupabaseAdmin 自体が throw しても writeAuditLog は throw しない', async () => {
      getSupabaseAdminMock.mockImplementation(() => {
        throw new Error('admin client init failed');
      });

      await expect(
        writeAuditLog({
          request: dummyRequest,
          actorId: 'admin-1',
          actorEmail: 'admin@example.com',
          action: 'product.update',
        })
      ).resolves.toBeUndefined();

      expect(secureLogMock).toHaveBeenCalledTimes(1);
      expect(secureLogMock.mock.calls[0][0]).toBe('error');
    });
  });
});
