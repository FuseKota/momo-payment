/**
 * 監査ログ記録ヘルパー
 *
 * admin の重要操作を audit_logs テーブルに追記する。
 * - metadata は secure-logger と同じ方針で PII をマスクして保存する
 * - 記録失敗は throw せず secureLog に残すのみ（業務処理をロールバックさせない best-effort）
 * - actor_email は呼び出し側が渡さなければ getUserById で解決する
 */

import type { NextRequest } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getClientIP } from '@/lib/security/rate-limit';
import { secureLog, safeErrorLog, redactForAudit } from '@/lib/logging/secure-logger';
import type { AuditAction, AuditTargetType } from '@/types/database';

export interface WriteAuditLogArgs {
  request: NextRequest;
  actorId: string;
  actorEmail?: string | null;
  action: AuditAction;
  targetType?: AuditTargetType;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * 監査ログを1件記録する（best-effort）。
 * 失敗しても例外を投げないため、呼び出し側は await しても業務処理が中断しない。
 */
export async function writeAuditLog(args: WriteAuditLogArgs): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();

    // actor_email を解決（未指定時のみ getUserById）
    let actorEmail = args.actorEmail ?? null;
    if (!actorEmail) {
      try {
        const { data } = await supabase.auth.admin.getUserById(args.actorId);
        actorEmail = data.user?.email ?? null;
      } catch {
        // email 解決失敗は致命ではない（actor_id は残る）
      }
    }

    const ip = getClientIP(args.request);
    const metadata = redactForAudit(args.metadata ?? {});

    const { error } = await supabase.from('audit_logs').insert({
      actor_id: args.actorId,
      actor_email: actorEmail,
      action: args.action,
      target_type: args.targetType ?? null,
      target_id: args.targetId ?? null,
      metadata,
      ip,
    });

    if (error) {
      secureLog('error', 'Failed to write audit log', safeErrorLog(error));
    }
  } catch (error) {
    secureLog('error', 'Failed to write audit log', safeErrorLog(error));
  }
}
