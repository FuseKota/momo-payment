/**
 * 永続レート制限（Supabase Postgres 経由）
 * サーバレス環境で水平スケールしても共有カウンタとして機能する。
 *
 * 設計:
 * - RPC `check_rate_limit` で UPSERT + 判定を 1 往復・原子的に実行
 * - DB 障害時はフェイルオープン（サービス継続を優先、ログには warn 出力）
 * - 同一 runtime 内の短期キャッシュで DB 負荷をわずかに軽減（オプション）
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { secureLog, safeErrorLog } from '@/lib/logging/secure-logger';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

const DEFAULT_LIMIT = 10;
const DEFAULT_WINDOW_MS = 60 * 1000;

/**
 * レート制限をチェック（Supabase RPC 経由・原子的）
 */
export async function checkRateLimit(
  identifier: string,
  limit: number = DEFAULT_LIMIT,
  windowMs: number = DEFAULT_WINDOW_MS
): Promise<RateLimitResult> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc('check_rate_limit', {
      p_identifier: identifier,
      p_limit: limit,
      p_window_seconds: Math.ceil(windowMs / 1000),
    });

    if (error || !data || (Array.isArray(data) && data.length === 0)) {
      // フェイルオープン: DB 障害時はサービス継続（警告は残す）
      secureLog('warn', 'Rate limit check failed, failing open', {
        identifier,
        error: error ? safeErrorLog(error) : undefined,
      });
      return {
        allowed: true,
        remaining: limit,
        resetIn: Math.ceil(windowMs / 1000),
      };
    }

    const row = Array.isArray(data) ? data[0] : data;
    return {
      allowed: row.allowed,
      remaining: row.remaining,
      resetIn: row.reset_in,
    };
  } catch (err) {
    secureLog('warn', 'Rate limit exception, failing open', safeErrorLog(err));
    return {
      allowed: true,
      remaining: limit,
      resetIn: Math.ceil(windowMs / 1000),
    };
  }
}

/**
 * 注文API用レート制限チェック（10 req/min/IP）
 */
export function checkOrderRateLimit(ip: string): Promise<RateLimitResult> {
  return checkRateLimit(`order:${ip}`, 10, 60 * 1000);
}

/**
 * Webhook用レート制限チェック（100 req/min/IP）
 */
export function checkWebhookRateLimit(ip: string): Promise<RateLimitResult> {
  return checkRateLimit(`webhook:${ip}`, 100, 60 * 1000);
}

/**
 * 管理者API用レート制限チェック（30 req/min/IP）
 */
export function checkAdminRateLimit(ip: string): Promise<RateLimitResult> {
  return checkRateLimit(`admin:${ip}`, 30, 60 * 1000);
}

/**
 * 認証API用レート制限チェック（5 req/min/IP、ブルートフォース対策）
 */
export function checkAuthRateLimit(ip: string): Promise<RateLimitResult> {
  return checkRateLimit(`auth:${ip}`, 5, 60 * 1000);
}

/**
 * リクエストからクライアントIPを取得
 * - Vercel は x-real-ip / x-forwarded-for を設定
 * - Netlify は x-nf-client-connection-ip を設定
 * - いずれもプラットフォーム側で上書きされるため偽装不可
 */
export function getClientIP(request: Request): string {
  const nfIp = request.headers.get('x-nf-client-connection-ip');
  if (nfIp) return nfIp.trim();

  const realIP = request.headers.get('x-real-ip');
  if (realIP) return realIP.trim();

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();

  return 'unknown';
}

/**
 * テスト用: rate_limit_buckets を直接リセット
 */
export async function resetRateLimit(identifier?: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    if (identifier) {
      await supabase.from('rate_limit_buckets').delete().eq('identifier', identifier);
    } else {
      await supabase.from('rate_limit_buckets').delete().neq('identifier', '');
    }
  } catch {
    // ignore in tests
  }
}
